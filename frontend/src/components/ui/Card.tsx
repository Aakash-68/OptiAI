import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/format";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover lift — use only when the whole card is clickable. */
  interactive?: boolean;
  padded?: boolean;
}

export function Card({ interactive, padded = true, className, children, ...props }: CardProps) {
  return (
    <div
      className={cx(
        "rounded-xl border border-[var(--border)] bg-[var(--surface)]",
        padded && "p-5",
        interactive &&
          "cursor-pointer transition-all duration-200 hover:border-[var(--brand-soft-border)] hover:shadow-[var(--shadow-md)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="font-display text-[15px] font-semibold text-[var(--text)]">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[13px] text-[var(--text-subtle)]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
