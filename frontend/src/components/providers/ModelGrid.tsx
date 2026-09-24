"use client";

import { AlertCircle, Check, Copy, Timer } from "lucide-react";
import { cx, formatLatency } from "@/lib/format";
import type { Model, ModelTestResult } from "@/lib/types";

export type ModelState = "selected" | "idle" | "failed";

/**
 * Model grid.
 *
 * Clicking a model toggles it on or off — the tile itself is the control.
 * A test verdict is drawn separately from the selection: a failed model keeps
 * its checkbox and its toggle, and only its border turns red. Locking the
 * tile on failure made a transient upstream 429 look like a decision the
 * user had made, and hid whether the model was still selected at all.
 */
export function ModelGrid({
  models,
  selected,
  results,
  testing,
  onToggle,
}: {
  models: Model[];
  selected: string[];
  results: Record<string, ModelTestResult>;
  testing: Set<string>;
  onToggle: (modelId: string) => void;
}) {
  return (
    <div className="grid gap-2.5 @xl:grid-cols-2 @4xl:grid-cols-3">
      {models.map((model) => {
        const isSelected = selected.includes(model.id);
        const result = results[model.id];
        const isFailed = result && !result.ok;
        const isTesting = testing.has(model.id);

        return (
          <button
            key={model.id}
            type="button"
            onClick={() => onToggle(model.id)}
            aria-pressed={isSelected}
            title={isFailed ? result.error : undefined}
            className={cx(
              "group relative flex items-start gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-150",
              isFailed
                ? "border-err-500/50 hover:border-err-500/80"
                : isSelected
                  ? "border-ok-500/70"
                  : "border-[var(--border)] hover:border-[var(--border-strong)]",
              isSelected && !isFailed ? "bg-ok-50/50 dark:bg-ok-500/8" : "bg-[var(--surface)]"
            )}
          >
            <span
              className={cx(
                "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border-2 transition-colors",
                isSelected
                  ? isFailed
                    ? "border-err-500 bg-err-500 text-white"
                    : "border-ok-500 bg-ok-500 text-white"
                  : "border-[var(--border-strong)]"
              )}
            >
              {isSelected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-[var(--text)]">
                {model.name || model.id}
              </span>
              <span className="mt-0.5 block truncate font-mono text-[11px] text-[var(--text-subtle)]">
                {model.id}
              </span>

              {isTesting && (
                <span className="mt-1.5 flex items-center gap-1 text-[11px] text-[var(--brand)]">
                  <Timer className="h-3 w-3 animate-pulse" />
                  testing…
                </span>
              )}

              {!isTesting && result && (
                <span
                  className={cx(
                    "mt-1.5 flex items-center gap-1 text-[11px]",
                    result.ok ? "text-ok-600 dark:text-ok-500" : "text-err-600 dark:text-err-500"
                  )}
                >
                  {result.ok ? (
                    <>
                      <Check className="h-3 w-3" />
                      {formatLatency(result.latencyMs)}
                      {/*
                       * Which API key answered. The router tries each key for
                       * the provider and stops at the first that works, so on
                       * a provider with several keys this is the only way to
                       * know which one actually has access to this model.
                       */}
                      {result.connectionName && (
                        <span
                          title={`Answered by API key "${result.connectionName}"`}
                          className="ml-0.5 truncate rounded bg-[var(--surface-sunken)] px-1 py-px text-[10px] font-normal text-[var(--text-subtle)]"
                        >
                          {result.connectionName}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      <span className="truncate">{shortError(result.error)}</span>
                    </>
                  )}
                </span>
              )}
            </span>

            <span
              role="button"
              tabIndex={-1}
              aria-label={`Copy ${model.id}`}
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(model.id);
              }}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[var(--text-subtle)] opacity-0 transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--text)] group-hover:opacity-100"
            >
              <Copy className="h-3.5 w-3.5" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Upstream errors arrive as a wall of JSON — keep the first useful sentence. */
function shortError(error?: string): string {
  if (!error) return "failed";
  const message = /"message"\s*:\s*"([^"]+)"/.exec(error)?.[1];
  const text = message || error;
  return text.length > 44 ? `${text.slice(0, 44)}…` : text;
}
