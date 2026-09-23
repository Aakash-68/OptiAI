/**
 * Browser-side file saving.
 *
 * Text formats (.md, .txt, .csv, .json, .html) are built here as Blobs — a
 * round trip to the backend would add nothing. PDF is the one format rendered
 * server-side; its Blob arrives from `exportPdf` and is saved the same way.
 */

export type DownloadKind = "pdf" | "md" | "txt" | "csv" | "json" | "html";

export const MIME: Record<DownloadKind, string> = {
  pdf: "application/pdf",
  md: "text/markdown;charset=utf-8",
  txt: "text/plain;charset=utf-8",
  csv: "text/csv;charset=utf-8",
  json: "application/json;charset=utf-8",
  html: "text/html;charset=utf-8",
};

export const KIND_LABEL: Record<DownloadKind, string> = {
  pdf: "PDF document",
  md: "Markdown",
  txt: "Plain text",
  csv: "CSV",
  json: "JSON",
  html: "HTML",
};

/** The extension a filename asks for, if it is one this app can produce. */
export function kindOf(filename: string): DownloadKind | null {
  const ext = filename.toLowerCase().split(".").pop() || "";
  const aliases: Record<string, DownloadKind> = {
    pdf: "pdf",
    md: "md",
    markdown: "md",
    txt: "txt",
    text: "txt",
    csv: "csv",
    json: "json",
    html: "html",
    htm: "html",
  };
  return aliases[ext] ?? null;
}

/** Filesystem-safe name; keeps the extension the caller chose. */
export function safeFilename(name: string, fallback = "download"): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);
  return cleaned || fallback;
}

/** A date-stamped filename from a title, e.g. "weekly-report-2026-09-22.pdf". */
export function stampedFilename(title: string, kind: DownloadKind): string {
  const date = new Date().toISOString().slice(0, 10);
  const base = safeFilename(title.toLowerCase(), "optiai-answer").slice(0, 60);
  return `${base}-${date}.${kind}`;
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeFilename(filename);
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next tick: revoking synchronously races the click in some
  // browsers and the download silently never starts.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function saveText(text: string, filename: string, kind: DownloadKind): void {
  saveBlob(new Blob([text], { type: MIME[kind] }), filename);
}
