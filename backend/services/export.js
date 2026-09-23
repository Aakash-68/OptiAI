/**
 * Markdown → PDF.
 *
 * Assistant answers are Markdown, and "give me that as a PDF" should produce a
 * document that reads like the answer did on screen — headings, lists, code in
 * monospace on a tinted block, tables with a header row — not a wall of text.
 *
 * `marked` turns the Markdown into a token tree and each token is mapped onto
 * a pdfmake node below. pdfmake handles pagination, page numbers and tables;
 * the standard Helvetica/Courier fonts are used so nothing has to ship with
 * the build. Unicode outside Latin-1 (emoji, CJK) is not covered by those
 * fonts and is dropped rather than rendered as boxes.
 */
import pdfmake from "pdfmake";
import { marked } from "marked";

const FONTS = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
  Courier: {
    normal: "Courier",
    bold: "Courier-Bold",
    italics: "Courier-Oblique",
    bolditalics: "Courier-BoldOblique",
  },
};

const STANDARD_FONT_NAMES = new Set(
  Object.values(FONTS).flatMap((family) => Object.values(family))
);

// Same palette as frontend/src/app/globals.css, so the PDF reads as OptiAI.
const INK = "#1a1a25";
const MUTED = "#55556b";
const SUBTLE = "#74748a";
const BORDER = "#e5e5ec";
const SUNKEN = "#f8f8fa";
const CODE_BG = "#f1f1f5";
const BRAND = "#8e55fb";
const LINK = "#1c66e0";

const PAGE_WIDTH = 595; // A4 portrait, in points
const PAGE_MARGIN_X = 56;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_X * 2;

const STYLES = {
  h1: { fontSize: 20, bold: true, margin: [0, 16, 0, 6], color: INK },
  h2: { fontSize: 15.5, bold: true, margin: [0, 14, 0, 5], color: INK },
  h3: { fontSize: 12.5, bold: true, margin: [0, 11, 0, 4], color: INK },
  h4: { fontSize: 11, bold: true, margin: [0, 9, 0, 3], color: INK },
  body: { fontSize: 10.5, lineHeight: 1.35, margin: [0, 0, 0, 7], color: INK },
  quote: { fontSize: 10.5, italics: true, color: MUTED, lineHeight: 1.35 },
  code: { font: "Courier", fontSize: 8.8, lineHeight: 1.25, color: INK },
  codeInline: { font: "Courier", fontSize: 9.4, background: CODE_BG },
  tableHead: { bold: true, fontSize: 9.5, color: MUTED },
  tableCell: { fontSize: 9.8, color: INK },
  subtitle: { fontSize: 9.5, color: SUBTLE },
  footer: { fontSize: 8.5, color: SUBTLE },
};

/* -------------------------------------------------------------------------- */
/* Text helpers                                                               */
/* -------------------------------------------------------------------------- */

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

/** marked escapes inline text for HTML; the PDF wants the characters back. */
function unescape(text = "") {
  return String(text).replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m);
}

/**
 * The standard PDF fonts only cover WinAnsi. Anything outside it would render
 * as a missing-glyph box, which looks worse than a gap. Common typographic
 * characters that *are* in WinAnsi (curly quotes, dashes, ellipsis) survive.
 */
function sanitize(text = "") {
  return String(text)
    .replace(/[‐-‒]/g, "-")
    .replace(/[^\u0000-ÿ–—‘’“”•…€]/g, "");
}

/* -------------------------------------------------------------------------- */
/* Inline tokens → pdfmake text runs                                          */
/* -------------------------------------------------------------------------- */

function inline(tokens = [], style = {}) {
  const runs = [];
  for (const token of tokens) {
    switch (token.type) {
      case "text":
      case "escape":
        if (token.tokens) runs.push(...inline(token.tokens, style));
        else runs.push({ text: sanitize(unescape(token.text)), ...style });
        break;
      case "strong":
        runs.push(...inline(token.tokens, { ...style, bold: true }));
        break;
      case "em":
        runs.push(...inline(token.tokens, { ...style, italics: true }));
        break;
      case "del":
        runs.push(...inline(token.tokens, { ...style, decoration: "lineThrough" }));
        break;
      case "codespan":
        runs.push({ text: ` ${sanitize(unescape(token.text))} `, ...style, style: "codeInline" });
        break;
      case "link":
        runs.push(
          ...inline(token.tokens, {
            ...style,
            link: token.href,
            color: LINK,
            decoration: "underline",
          })
        );
        break;
      case "image":
        runs.push({
          text: sanitize(token.text || token.title || "[image]"),
          ...style,
          italics: true,
          color: SUBTLE,
        });
        break;
      case "br":
        runs.push({ text: "\n", ...style });
        break;
      case "html":
        runs.push({ text: sanitize(unescape(token.text)), ...style });
        break;
      default:
        if (token.tokens) runs.push(...inline(token.tokens, style));
        else if (token.text) runs.push({ text: sanitize(unescape(token.text)), ...style });
    }
  }
  return runs;
}

/* -------------------------------------------------------------------------- */
/* Block tokens → pdfmake content                                             */
/* -------------------------------------------------------------------------- */

function codeBlock(token) {
  const label = token.lang ? sanitize(token.lang) : null;
  const stack = [];
  if (label) stack.push({ text: label, fontSize: 8, color: SUBTLE, margin: [0, 0, 0, 3] });
  stack.push({ text: sanitize(token.text), style: "code", preserveLeadingSpaces: true });

  return {
    table: { widths: ["*"], body: [[{ stack, fillColor: CODE_BG }]] },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 10,
      paddingRight: () => 10,
      paddingTop: () => 8,
      paddingBottom: () => 8,
    },
    margin: [0, 2, 0, 9],
  };
}

function blockquote(token) {
  return {
    table: { widths: ["*"], body: [[{ stack: blocks(token.tokens, "quote") }]] },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (i) => (i === 0 ? 2.5 : 0),
      vLineColor: () => BRAND,
      paddingLeft: () => 12,
      paddingRight: () => 4,
      paddingTop: () => 2,
      paddingBottom: () => 2,
    },
    margin: [0, 2, 0, 9],
  };
}

function list(token) {
  const items = token.items.map((item) => {
    // A task item keeps its checkbox as text: WinAnsi has no ballot glyphs.
    const prefix = item.task ? (item.checked ? "[x] " : "[ ] ") : "";
    const content = blocks(item.tokens, "body", { tight: true });
    if (prefix && content.length > 0 && content[0].text) {
      content[0] = { ...content[0], text: [{ text: prefix }, ...[].concat(content[0].text)] };
    }
    return content.length === 1 ? content[0] : { stack: content };
  });

  const base = { margin: [4, 0, 0, 7], fontSize: 10.5, lineHeight: 1.3 };
  return token.ordered ? { ol: items, start: token.start || 1, ...base } : { ul: items, ...base };
}

function table(token) {
  const columns = token.header.length;
  const alignOf = (i) => token.align?.[i] || "left";

  const head = token.header.map((cell, i) => ({
    text: inline(cell.tokens),
    style: "tableHead",
    alignment: alignOf(i),
    fillColor: SUNKEN,
  }));
  const rows = token.rows.map((row) =>
    row.map((cell, i) => ({
      text: inline(cell.tokens),
      style: "tableCell",
      alignment: alignOf(i),
    }))
  );

  return {
    table: { headerRows: 1, widths: Array(columns).fill("*"), body: [head, ...rows] },
    layout: {
      hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0.8 : 0.5),
      hLineColor: () => BORDER,
      vLineWidth: () => 0,
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
    margin: [0, 2, 0, 10],
  };
}

function rule(color = BORDER, width = 0.6) {
  return {
    canvas: [{ type: "line", x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: width, lineColor: color }],
    margin: [0, 6, 0, 10],
  };
}

/**
 * `tight` is set inside list items: the trailing paragraph margin that spaces
 * top-level paragraphs would otherwise double the gap between bullets.
 */
function blocks(tokens = [], textStyle = "body", { tight = false } = {}) {
  const out = [];
  const tightMargin = tight ? { margin: [0, 0, 0, 2] } : {};

  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const depth = Math.min(Math.max(token.depth, 1), 4);
        out.push({ text: inline(token.tokens), style: `h${depth}` });
        break;
      }
      case "paragraph":
        out.push({ text: inline(token.tokens), style: textStyle, ...tightMargin });
        break;
      case "text":
        // Loose text inside list items arrives as a bare text token.
        out.push({
          text: token.tokens ? inline(token.tokens) : sanitize(unescape(token.text)),
          style: textStyle,
          ...tightMargin,
        });
        break;
      case "code":
        out.push(codeBlock(token));
        break;
      case "blockquote":
        out.push(blockquote(token));
        break;
      case "list":
        out.push(list(token));
        break;
      case "table":
        out.push(table(token));
        break;
      case "hr":
        out.push(rule());
        break;
      case "html":
        out.push({ text: sanitize(unescape(token.text)), style: textStyle });
        break;
      case "space":
        break;
      default:
        if (token.tokens) out.push(...blocks(token.tokens, textStyle, { tight }));
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Document                                                                   */
/* -------------------------------------------------------------------------- */

function plainText(tokens = []) {
  return inline(tokens)
    .map((r) => (typeof r.text === "string" ? r.text : ""))
    .join("")
    .trim();
}

/**
 * Builds the pdfmake document definition.
 *
 * The title comes from the caller, else from a leading H1 — which is then not
 * repeated in the body. A subtitle line records when and by what the document
 * was generated, since a PDF that leaves the app has no other provenance.
 */
export function buildDocument({ markdown = "", title, model, generatedAt = new Date() } = {}) {
  const tokens = marked.lexer(String(markdown));

  let bodyTokens = tokens;
  let resolvedTitle = title?.trim() || null;
  const first = tokens.find((t) => t.type !== "space");
  if (first?.type === "heading" && first.depth === 1) {
    const headingText = plainText(first.tokens);
    if (!resolvedTitle) resolvedTitle = headingText;
    if (headingText === resolvedTitle) bodyTokens = tokens.filter((t) => t !== first);
  }
  resolvedTitle = sanitize(resolvedTitle || "Report");

  const stamp = generatedAt.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const subtitle = ["Generated by OptiAI", stamp, model ? sanitize(model) : null]
    .filter(Boolean)
    .join("  ·  ");

  return {
    pageSize: "A4",
    pageMargins: [PAGE_MARGIN_X, 56, PAGE_MARGIN_X, 64],
    info: { title: resolvedTitle, creator: "OptiAI", producer: "OptiAI" },
    defaultStyle: { font: "Helvetica", fontSize: 10.5, color: INK },
    styles: STYLES,
    content: [
      { text: resolvedTitle, fontSize: 24, bold: true, color: INK, margin: [0, 0, 0, 4] },
      { text: subtitle, style: "subtitle", margin: [0, 0, 0, 10] },
      { ...rule(BRAND, 1.2), margin: [0, 0, 0, 14] },
      ...blocks(bodyTokens),
    ],
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: resolvedTitle, style: "footer" },
        { text: `Page ${currentPage} of ${pageCount}`, style: "footer", alignment: "right" },
      ],
      margin: [PAGE_MARGIN_X, 24, PAGE_MARGIN_X, 0],
    }),
  };
}

// pdfmake 0.3 is a singleton, not a printer class; fonts are registered once.
let fontsRegistered = false;

/** Renders Markdown to a PDF buffer. */
export async function markdownToPdf(options) {
  if (!fontsRegistered) {
    pdfmake.addFonts(FONTS);
    // The Markdown is model output. Nothing in this converter emits image
    // nodes, but the policies are set to deny anyway so a future node type can
    // never turn a chat answer into a fetch from the server's network or disk.
    // The standard-font names go through the local policy too (pdfmake treats
    // them as paths), so those — and only those — are allowed.
    pdfmake.setUrlAccessPolicy(() => false);
    pdfmake.setLocalAccessPolicy((path) => STANDARD_FONT_NAMES.has(path));
    fontsRegistered = true;
  }
  const pdf = pdfmake.createPdf(buildDocument(options));
  return await pdf.getBuffer();
}

/** A filename the browser will accept, ending in the requested extension. */
export function safeFilename(name, extension = "pdf", fallback = "report") {
  const base = String(name || fallback)
    .replace(new RegExp(`\\.${extension}$`, "i"), "")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${base || fallback}.${extension}`;
}
