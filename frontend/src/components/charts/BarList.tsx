"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/format";

export interface BarRow {
  id: string;
  label: string;
  value: number;
  /** Rendered on the right — already formatted. */
  display: string;
  icon?: ReactNode;
}

/**
 * Horizontal ranked bars, used for model / provider / endpoint distribution.
 * The bar is a tinted track behind the label rather than a separate column, so
 * long model ids stay readable at narrow widths.
 */
export function BarList({
  rows,
  color = "var(--brand)",
  emptyLabel = "No data yet",
  max: explicitMax,
}: {
  rows: BarRow[];
  color?: string;
  emptyLabel?: string;
  max?: number;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-[13px] text-[var(--text-subtle)]">{emptyLabel}</p>;
  }

  const max = explicitMax ?? Math.max(...rows.map((r) => r.value), 1);

  return (
    <ul className="space-y-1.5">
      {rows.map((row) => (
        <li key={row.id} className="group relative">
          <div className="relative flex items-center justify-between gap-3 overflow-hidden rounded-lg px-2.5 py-2">
            <span
              className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
              style={{
                width: `${Math.max((row.value / max) * 100, 1.5)}%`,
                background: color,
                opacity: 0.12,
              }}
              aria-hidden
            />
            <span className="relative flex min-w-0 items-center gap-2">
              {row.icon}
              <span className="truncate text-[13px] font-medium text-[var(--text)]">
                {row.label}
              </span>
            </span>
            <span className="relative shrink-0 text-[13px] tabular-nums text-[var(--text-muted)]">
              {row.display}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Two-tone proportion bar — input vs output token split. */
export function RatioBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]">
        {segments.map((s) => (
          <span
            key={s.label}
            className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
            <span className="tabular-nums text-[var(--text-subtle)]">
              {((s.value / total) * 100).toFixed(1)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Small inline sparkline for dense table rows. */
export function Sparkline({
  values,
  color = "var(--brand)",
  className,
}: {
  values: number[];
  color?: string;
  className?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${24 - (v / max) * 22}`)
    .join(" ");

  return (
    <svg viewBox="0 0 100 24" className={cx("h-6 w-20", className)} preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
