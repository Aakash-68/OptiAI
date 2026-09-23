import type { ReactNode } from "react";
import { cx } from "@/lib/format";

type Tone = "neutral" | "brand" | "ok" | "warn" | "err" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "bg-[var(--surface-sunken)] text-[var(--text-muted)] border-[var(--border)]",
  brand: "bg-[var(--brand-soft)] text-brand-700 border-[var(--brand-soft-border)] dark:text-brand-300",
  accent: "bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-500/12 dark:text-accent-300 dark:border-accent-500/25",
  ok: "bg-ok-50 text-ok-700 border-ok-500/25 dark:bg-ok-500/12 dark:text-ok-500",
  warn: "bg-warn-50 text-warn-700 border-warn-500/25 dark:bg-warn-500/12 dark:text-warn-500",
  err: "bg-err-50 text-err-700 border-err-500/25 dark:bg-err-500/12 dark:text-err-500",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  icon,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4",
        TONES[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** A small filled dot — connection status, model active state. */
export function StatusDot({ tone = "neutral" }: { tone?: "ok" | "warn" | "err" | "neutral" }) {
  const color =
    tone === "ok"
      ? "bg-ok-500"
      : tone === "warn"
        ? "bg-warn-500"
        : tone === "err"
          ? "bg-err-500"
          : "bg-[var(--border-strong)]";
  return <span className={cx("inline-block h-1.5 w-1.5 shrink-0 rounded-full", color)} />;
}
