"use client";

import { Layers } from "lucide-react";
import { StatusDot } from "@/components/ui/Badge";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { cx, formatNumber, formatRelativeTime, shortModelName } from "@/lib/format";
import type { PromptTrace } from "@/lib/types";

/**
 * The compact request log that sits beside the network map.
 *
 * One line per prompt: status, id, the model that was asked for (a combo name
 * or a specific model), what it cost in tokens, and when. The full table on
 * the Requests tab has everything else; this is the glanceable version.
 */
export function RequestsRail({
  rows,
  loading,
  className,
  onSelect,
  selected,
}: {
  rows: PromptTrace[];
  loading?: boolean;
  className?: string;
  onSelect?: (promptId: string) => void;
  selected?: string | null;
}) {
  return (
    <div className={cx("flex h-full min-h-0 flex-col", className)}>
      <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
        <h2 className="font-display text-[15px] font-semibold text-[var(--text)]">Recent requests</h2>
        <span className="text-[11px] text-[var(--text-subtle)]">{rows.length ? `${rows.length} shown` : ""}</span>
      </div>

      <div className="grid grid-cols-[10px_minmax(0,1fr)_auto_auto] items-center gap-x-2.5 border-b border-[var(--border)] px-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
        <span />
        <span>ID · Model</span>
        <span className="text-right">In / Out</span>
        <span className="text-right">When</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <SkeletonRows count={8} leading="none" trailing={1} height="h-9" className="p-4" />
        ) : rows.length === 0 ? (
          <div className="grid h-full place-items-center p-6 text-center">
            <div>
              <Layers className="mx-auto h-4.5 w-4.5 text-[var(--text-subtle)]" />
              <p className="mt-2 text-[12.5px] text-[var(--text-subtle)]">
                Send a prompt and it lands here with its tokens.
              </p>
            </div>
          </div>
        ) : (
          <ul>
            {rows.map((row) => {
              const requested = row.requestedModel || "";
              const resolved = row.resolvedModel || "";
              // A combo resolves to some concrete model; show both when they differ.
              const isCombo = requested && resolved && requested !== resolved;
              const tone = row.status === "ok" ? "ok" : row.status === "pending" ? "warn" : "err";
              return (
                <li key={row.promptId}>
                  <button
                    type="button"
                    onClick={() => onSelect?.(row.promptId)}
                    className={cx(
                      "grid w-full grid-cols-[10px_minmax(0,1fr)_auto_auto] items-center gap-x-2.5 border-b border-[var(--border)] px-4 py-2 text-left transition-colors last:border-0 hover:bg-[var(--surface-hover)]",
                      selected === row.promptId && "bg-[var(--brand-soft)]"
                    )}
                    title={row.error || row.promptId}
                  >
                    <StatusDot tone={tone} />
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[11.5px] text-[var(--text)]">
                        {shortModelName(requested || resolved) || "—"}
                        {isCombo && (
                          <span className="text-[var(--text-subtle)]"> → {shortModelName(resolved)}</span>
                        )}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-[var(--text-subtle)]">
                        {row.promptId}
                        {row.provider ? ` · ${row.provider}` : ""}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-right tabular-nums text-[11.5px]">
                      <span className="text-accent-600 dark:text-accent-400">{formatNumber(row.inputTokens)}↑</span>{" "}
                      <span className="text-ok-600 dark:text-ok-500">{formatNumber(row.outputTokens)}↓</span>
                    </span>
                    <span className="whitespace-nowrap text-right text-[11px] text-[var(--text-subtle)]">
                      {formatRelativeTime(row.createdAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
