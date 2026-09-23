/**
 * Markdown → readable plain text, for `.txt` downloads.
 *
 * Not a parser — a handful of substitutions that remove the syntax while
 * keeping the structure a reader relies on: headings stay on their own line,
 * list markers survive, tables keep their columns, fenced code keeps its
 * content (indented, so it still reads as a block). Good enough for a text
 * file; anything needing fidelity uses the Markdown or PDF export instead.
 */
export function markdownToText(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let inFence = false;

  for (const raw of lines) {
    const fence = raw.match(/^\s*(```|~~~)/);
    if (fence) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      out.push(`    ${raw}`);
      continue;
    }

    let line = raw;

    // Table separator rows carry no content.
    if (/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)) continue;
    // Table rows: pipes become column gaps.
    if (/^\s*\|.*\|\s*$/.test(line)) {
      line = line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim())
        .join("   ");
    }

    line = line
      .replace(/^(\s*)#{1,6}\s+/, "$1") // headings
      .replace(/^(\s*)>\s?/, "$1") // blockquotes
      .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/, "") // horizontal rules
      .replace(/^(\s*)[-*+]\s+\[([ xX])\]\s+/, (_, indent, mark) => `${indent}[${mark === " " ? " " : "x"}] `)
      .replace(/^(\s*)[-*+]\s+/, "$1- ") // bullets
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images → alt text
      .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, "$1 ($2)") // links → text (url)
      .replace(/(\*\*|__)(.+?)\1/g, "$2") // bold
      .replace(/(^|[^*\w])(\*|_)(?!\s)(.+?)(?<!\s)\2(?!\w)/g, "$1$3") // italic
      .replace(/~~(.+?)~~/g, "$1") // strikethrough
      .replace(/`([^`]+)`/g, "$1") // inline code
      .replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, "$1"); // escapes

    out.push(line.replace(/\s+$/, ""));
  }

  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The first H1/H2 in the document, or the first non-empty line, as a title. */
export function titleOf(markdown: string, fallback = "OptiAI answer"): string {
  const heading = markdown.match(/^\s{0,3}#{1,2}\s+(.+?)\s*#*\s*$/m);
  if (heading) return markdownToText(heading[1]).trim() || fallback;
  const first = markdown
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !/^(```|~~~|\||[-*_]{3,})/.test(l));
  if (!first) return fallback;
  const text = markdownToText(first).trim();
  return text.length > 72 ? `${text.slice(0, 69).trimEnd()}…` : text || fallback;
}
