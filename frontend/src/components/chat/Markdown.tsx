"use client";

import { Children, isValidElement, memo, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileCode2,
  FileJson2,
  FileSpreadsheet,
  FileText,
  FileType2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { exportPdf } from "@/lib/api";
import { cx } from "@/lib/format";
import { KIND_LABEL, kindOf, saveBlob, saveText, type DownloadKind } from "@/lib/download";
import "./markdown.css";

/* -------------------------------------------------------------------------- */
/* File blocks                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The convention the model is asked to follow for downloadable output:
 *
 *     ```file weekly-report.pdf
 *     # Weekly report
 *     ...
 *     ```
 *
 * `file:weekly-report.pdf` and `file name="weekly-report.pdf"` are accepted
 * too, since models drift on the exact spelling. The plugin below normalises
 * all of them to lang="file" + meta="<name>" before rendering, so the code
 * component only has one shape to recognise.
 */
type MdNode = { type: string; lang?: string | null; meta?: string | null; children?: MdNode[] };

function remarkFileBlocks() {
  return (tree: MdNode) => {
    const visit = (node: MdNode) => {
      if (node.type === "code" && typeof node.lang === "string") {
        const lang = node.lang;
        if (lang.toLowerCase().startsWith("file:")) {
          node.meta = lang.slice(5);
          node.lang = "file";
        } else if (lang.toLowerCase() === "file") {
          node.lang = "file";
        }
        if (node.lang === "file" && node.meta) {
          node.meta = node.meta
            .trim()
            .replace(/^(name|filename)\s*=\s*/i, "")
            .replace(/^["']|["']$/g, "")
            .trim();
        }
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

/** Recovers the source text from the hast node rehype-highlight has split into spans. */
type HastNode = { type: string; value?: string; children?: HastNode[]; data?: { meta?: string } };

function hastText(node: HastNode | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(hastText).join("");
}

const FILE_ICON: Record<DownloadKind, typeof FileText> = {
  pdf: FileType2,
  md: FileText,
  txt: FileText,
  csv: FileSpreadsheet,
  json: FileJson2,
  html: FileCode2,
};

/**
 * A downloadable file the model produced.
 *
 * While the message is still streaming the body is incomplete, so the card
 * shows a writing state and keeps Download disabled — saving a half-written
 * report would be worse than waiting a second.
 */
function FileCard({
  filename,
  content,
  streaming,
  model,
}: {
  filename: string;
  content: string;
  streaming?: boolean;
  model?: string;
}) {
  const kind = kindOf(filename) ?? "txt";
  const name = kindOf(filename) ? filename : `${filename}.txt`;
  const Icon = FILE_ICON[kind];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  const size = useMemo(() => {
    const bytes = new TextEncoder().encode(content).length;
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  }, [content]);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      if (kind === "pdf") {
        const blob = await exportPdf({ markdown: content, filename: name, model });
        saveBlob(blob, name);
      } else {
        saveText(content, name, kind);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="md-file my-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-3 px-3.5 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
          {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4.5 w-4.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-[var(--text)]">{name}</p>
          <p className="text-[11.5px] text-[var(--text-subtle)]">
            {streaming ? "Writing…" : `${KIND_LABEL[kind]} · ${size}`}
            {kind === "pdf" && !streaming && " · rendered on download"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(content).then(() => setCopied(true)).catch(() => {});
          }}
          title="Copy contents"
          className="rounded-md p-1.5 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-ok-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <Button
          size="sm"
          variant="primary"
          icon={<Download className="h-3.5 w-3.5" />}
          loading={busy}
          disabled={streaming || !content.trim()}
          onClick={download}
        >
          Download
        </Button>
      </div>

      {error && (
        <p className="border-t border-err-500/20 bg-err-50 px-3.5 py-2 text-[12px] text-err-700 dark:bg-err-500/10 dark:text-err-500">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 border-t border-[var(--border)] px-3.5 py-2 text-left text-[12px] text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {open ? "Hide contents" : "Show contents"}
      </button>

      {open && (
        <div className="max-h-[420px] overflow-y-auto border-t border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-3">
          {kind === "pdf" || kind === "md" ? (
            <Markdown content={content} streaming={streaming} model={model} nested />
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-[var(--text)]">
              {content}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Code blocks                                                                */
/* -------------------------------------------------------------------------- */

function CodeBlock({ language, code, children }: { language?: string; code: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className="md-code">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(code).then(() => setCopied(true)).catch(() => {});
          }}
          className={cx(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium transition-colors",
            copied
              ? "text-ok-600"
              : "text-[var(--text-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Markdown                                                                   */
/* -------------------------------------------------------------------------- */

const REMARK_PLUGINS = [remarkGfm, remarkFileBlocks];
// `file` is listed as plain text so the highlighter leaves file blocks alone.
const REHYPE_PLUGINS = [[rehypeHighlight, { plainText: ["file", "txt", "text", "plaintext"] }]] as const;

/**
 * Renders an assistant answer.
 *
 * Every assistant turn is Markdown. Fenced code gets a header with a copy
 * button; fenced `file` blocks become download cards. Streaming content is
 * re-parsed on every delta, which is fine at chat sizes — an unclosed fence
 * simply renders as an open code block until the closing line arrives.
 */
/**
 * A file block opened with three backticks is closed by the first three-
 * backtick line inside it — so a document that contains its own code blocks
 * ends after its first snippet and the rest spills out as prose. The model
 * is asked for four backticks; when it uses three anyway and there are more
 * fences after the opener, this widens the opener and the LAST fence in the
 * message to four so the whole document stays inside the card.
 */
function promoteFileFence(content: string): string {
  const open = /^```file\b[^\n]*$/m.exec(content);
  if (!open) return content;
  const after = content.slice(open.index + open[0].length);
  const fences = [...after.matchAll(/^```[^\n]*$/gm)];
  // One closer: the normal case, nothing to repair.
  if (fences.length < 2) return content;
  const last = fences[fences.length - 1];
  const lastAt = open.index + open[0].length + last.index;
  return (
    content.slice(0, open.index) +
    "`" + open[0] +
    content.slice(open.index + open[0].length, lastAt) +
    "````" +
    content.slice(lastAt + last[0].length)
  );
}

export const Markdown = memo(function Markdown({
  content,
  streaming,
  model,
  nested,
}: {
  content: string;
  streaming?: boolean;
  model?: string;
  /** Inside a file card preview: no file cards within file cards. */
  nested?: boolean;
}) {
  const source = useMemo(() => (nested ? content : promoteFileFence(content)), [content, nested]);
  return (
    <div className="md-prose">
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS as never}
        components={{
          pre({ children }) {
            const child = Children.only(children);
            if (!isValidElement(child)) return <pre>{children}</pre>;

            const props = child.props as { className?: string; node?: HastNode; children?: ReactNode };
            const language = /language-([\w:+.-]+)/.exec(props.className || "")?.[1];
            const code = hastText(props.node);

            if (language === "file" && !nested) {
              const filename = props.node?.data?.meta?.trim() || "download.txt";
              // The model opened a file block and put nothing in it. A dead
              // card with a 0 B download is worse than no card: say so in a
              // line and let the rest of the answer stand on its own.
              if (!streaming && !code.trim()) {
                return (
                  <p className="my-2 rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-2 text-[12.5px] text-[var(--text-subtle)]">
                    The model opened a file block for <span className="font-mono">{filename}</span> but left it
                    empty. Ask again and name the format — “as a .md file” — or use Download on the message.
                  </p>
                );
              }
              return <FileCard filename={filename} content={code} streaming={streaming} model={model} />;
            }
            return (
              <CodeBlock language={language} code={code}>
                {children}
              </CodeBlock>
            );
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noreferrer noopener">
                {children}
              </a>
            );
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
});
