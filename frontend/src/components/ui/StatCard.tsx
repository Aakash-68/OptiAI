import type { ReactNode } from "react";
import { cx } from "@/lib/format";

type Accent = "neutral" | "in" | "cached" | "out" | "cost";

/**
 * The KPI tile row at the top of Usage. Accents are semantic — input, cached,
 * output and cost each keep the same hue everywhere they appear, including in
 * the charts below, so the eye can track one metric across the page.
 */
const ACCENTS: Record<Accent, string> = {
  neutral: "text-[var(--text)]",
  in: "text-accent-500",
  cached: "text-brand-500",
  out: "text-ok-500",
  cost: "text-warn-600 dark:text-warn-500",
};

export function StatCard({
  label,
  value,
  sub,
  accent = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: Accent;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-[var(--text-subtle)]">{icon}</span>}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
          {label}
        </p>
      </div>
      <p className={cx("font-display mt-2 text-2xl font-bold tabular-nums", ACCENTS[accent])}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-[var(--text-subtle)]">{sub}</p>}
    </div>
  );
}
