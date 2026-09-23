"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, FileText, FileType2, MoreHorizontal } from "lucide-react";
import { exportPdf } from "@/lib/api";
import { compactNumber, cx, formatCost, formatLatency, shortModelName } from "@/lib/format";
import { saveBlob, saveText, stampedFilename, type DownloadKind } from "@/lib/download";
import { markdownToText, titleOf } from "@/lib/markdownText";
import type { ChatMessage } from "@/lib/types";

type Meta = NonNullable<ChatMessage["meta"]>;

/**
 * The action row under one assistant answer: model name, copy, and a ⋯ menu.
 *
 * Only the model stays on screen. The numbers that used to sit beside it —
 * tokens, cost, latency, prompt id — moved into the menu: still one click
 * away, but a transcript reads better without a telemetry strip under every
 * turn.
 *
 * The row is revealed on hover of the message. It animates `opacity` rather
 * than toggling `display`, so it stays focusable for keyboard users and
 * reserves its space (no reflow when it appears), and it is pinned visible
 * while the menu is open so the controls can't vanish under the pointer on
 * the way to them. Devices without hover get it permanently.
 */
export function MessageActions({ content, meta }: { content: string; meta: Meta }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<DownloadKind | null>(null);
  const [copied, setCopied] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!idCopied) return;
    const t = setTimeout(() => setIdCopied(false), 1400);
    return () => clearTimeout(t);
  }, [idCopied]);

  function copy(text: string, mark: (v: boolean) => void) {
    navigator.clipboard
      ?.writeText(text)
      .then(() => mark(true))
      // clipboard is unavailable over plain http on some browsers
      .catch(() => {});
  }

  async function exportAs(kind: DownloadKind) {
    setOpen(false);
    setBusy(kind);
    setError(null);
    const title = titleOf(content);
    const filename = stampedFilename(title, kind);
    try {
      if (kind === "pdf") {
        saveBlob(await exportPdf({ markdown: content, title, filename, model: meta.model }), filename);
      } else if (kind === "txt") {
        saveText(markdownToText(content), filename, "txt");
      } else {
        saveText(content, filename, kind);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  const iconButton =
    "grid h-6 w-6 place-items-center rounded-md text-[var(--text-subtle)] " +
    "transition-[background-color,color,transform] duration-150 ease-out " +
    "hover:bg-[var(--surface-hover)] hover:text-[var(--text)] active:scale-[0.94] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

  const menuItem =
    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] " +
    "text-[var(--text)] transition-colors hover:bg-[var(--surface-hover)]";

  const tokens =
    meta.promptTokens || meta.completionTokens
      ? `${compactNumber(meta.promptTokens)} in · ${compactNumber(meta.completionTokens)} out`
      : null;

  return (
    <div
      ref={rootRef}
      className={cx(
        "mt-2 flex items-center gap-1 transition-opacity duration-150 ease-out",
        // revealed by the message row's hover; kept for focus, touch, and while open
        "opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100",
        "[@media(hover:none)]:opacity-100",
        open && "opacity-100"
      )}
    >
      {meta.model && (
        <span className="mr-0.5 font-mono text-[11px] leading-none text-[var(--text-subtle)]">
          {shortModelName(meta.model)}
        </span>
      )}

      <button
        type="button"
        title={copied ? "Copied" : "Copy answer"}
        aria-label="Copy answer"
        onClick={() => copy(content, setCopied)}
        className={iconButton}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-ok-600" /> : <Copy className="h-3.5 w-3.5" />}
      </button>

      <div className="relative">
        <button
          type="button"
          title="Export and details"
          aria-label="Export and details"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={busy !== null}
          onClick={() => setOpen((v) => !v)}
          className={cx(iconButton, busy && "opacity-60")}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>

        {open && (
          <div
            role="menu"
            className="animate-in absolute left-0 top-full z-30 mt-1 w-[232px] rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1 shadow-[var(--shadow-lg)]"
          >
            <button type="button" role="menuitem" className={menuItem} onClick={() => exportAs("pdf")}>
              <FileType2 className="h-3.5 w-3.5 text-[var(--brand)]" />
              Export as PDF
            </button>
            <button type="button" role="menuitem" className={menuItem} onClick={() => exportAs("md")}>
              <FileText className="h-3.5 w-3.5 text-[var(--text-subtle)]" />
              Export as Markdown
            </button>
            <button type="button" role="menuitem" className={menuItem} onClick={() => exportAs("txt")}>
              <FileText className="h-3.5 w-3.5 text-[var(--text-subtle)]" />
              Export as plain text
            </button>

            <div className="my-1 h-px bg-[var(--border)]" />

            <dl className="space-y-1 px-2.5 py-1 text-[11.5px] text-[var(--text-subtle)]">
              {meta.model && (
                <Detail label="Model">
                  <span className="font-mono">{shortModelName(meta.model)}</span>
                </Detail>
              )}
              {tokens && <Detail label="Tokens">{tokens}</Detail>}
              {meta.cost !== undefined && meta.cost > 0 && (
                <Detail label="Cost">{formatCost(meta.cost)}</Detail>
              )}
              {meta.latencyMs !== undefined && (
                <Detail label="Time">{formatLatency(meta.latencyMs)}</Detail>
              )}
              {meta.fellBackFrom && meta.fellBackFrom.length > 0 && (
                <Detail label="Fell back">
                  <span className="text-warn-600 dark:text-warn-500">
                    from {meta.fellBackFrom.join(" → ")}
                  </span>
                </Detail>
              )}
            </dl>

            {meta.promptId && (
              <button
                type="button"
                role="menuitem"
                title={`Prompt ID ${meta.promptId} — click to copy`}
                onClick={() => copy(meta.promptId!, setIdCopied)}
                className={cx(menuItem, "justify-between font-mono text-[11px]")}
              >
                <span className="truncate text-[var(--text-subtle)]">{meta.promptId}</span>
                {idCopied ? (
                  <Check className="h-3 w-3 shrink-0 text-ok-600" />
                ) : (
                  <Copy className="h-3 w-3 shrink-0 text-[var(--text-subtle)]" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {busy && <span className="text-[11px] text-[var(--text-subtle)]">Exporting {busy}…</span>}
      {error && <span className="text-[11px] text-err-600">{error}</span>}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0">{label}</dt>
      <dd className="truncate text-right tabular-nums text-[var(--text-muted)]">{children}</dd>
    </div>
  );
}
