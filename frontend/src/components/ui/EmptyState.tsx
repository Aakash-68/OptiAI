import type { ReactNode } from "react";
import { cx } from "@/lib/format";

/**
 * Used wherever a list can legitimately be empty. OptiAI ships with zero
 * connections, so empty states carry real instructional weight here — each one
 * should say what to do next, not just that nothing is there.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] px-6 py-12 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
          {icon}
        </div>
      )}
      <p className="font-display text-sm font-semibold text-[var(--text)]">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-[var(--text-subtle)]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx("animate-pulse rounded-md bg-[var(--surface-hover)]", className)}
      aria-hidden
    />
  );
}

/** Inline error strip for failed fetches — never swallow a backend error. */
export function ErrorNote({ message, className }: { message: string; className?: string }) {
  return (
    <div
      className={cx(
        "rounded-lg border border-err-500/25 bg-err-50 px-3.5 py-2.5 text-[13px] text-err-700",
        "dark:bg-err-500/10 dark:text-err-500",
        className
      )}
    >
      {message}
    </div>
  );
}
