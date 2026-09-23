"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cx } from "@/lib/format";

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard is unavailable over plain http on some browsers — fail quietly */
    }
  }

  return (
    <button
      onClick={copy}
      aria-label={label || "Copy to clipboard"}
      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-ok-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/**
 * Terminal / config snippet. `prompt` renders a leading $ per line, which is how
 * Connect presents the manual commands a user pastes into their own shell.
 */
export function CodeBlock({
  code,
  caption,
  prompt,
  className,
}: {
  code: string;
  caption?: string;
  prompt?: boolean;
  className?: string;
}) {
  return (
    <div className={cx("overflow-hidden rounded-lg border border-[var(--border)]", className)}>
      {caption && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2">
          <span className="font-mono text-[11px] text-[var(--text-subtle)]">{caption}</span>
          <CopyButton value={code} />
        </div>
      )}
      <pre className="overflow-x-auto bg-[var(--surface-sunken)] px-3.5 py-3 text-[12.5px] leading-relaxed">
        <code className="font-mono text-[var(--text-muted)]">
          {prompt
            ? code.split("\n").map((line, i) => (
                <div key={i} className="whitespace-pre">
                  <span className="mr-2 select-none text-[var(--brand)]">$</span>
                  {line}
                </div>
              ))
            : code}
        </code>
      </pre>
      {!caption && (
        <div className="flex justify-end border-t border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2">
          <CopyButton value={code} />
        </div>
      )}
    </div>
  );
}
