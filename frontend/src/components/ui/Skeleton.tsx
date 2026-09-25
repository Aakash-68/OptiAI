import type { CSSProperties, ReactNode } from "react";
import { cx } from "@/lib/format";

/**
 * Loading placeholders that hold the shape of what is coming.
 *
 * Every block is the sunken surface with a highlight sweeping across it (the
 * `.skeleton` rule in globals.css: a transform-only CSS animation, so it keeps
 * moving while the page is busy fetching). Siblings get a small delay each so
 * a grid reads as one wave rather than nine blocks flashing in lockstep.
 * Under prefers-reduced-motion the global rule stops the sweep and the blocks
 * stay as quiet grey shapes.
 *
 * Composites below mirror the real components (a StatCard, a provider tile,
 * a table row) closely enough that the layout does not jump when data lands.
 */
export function Skeleton({
  className,
  delay = 0,
  style,
}: {
  className?: string;
  /** Milliseconds; use the index of a sibling to stagger a group. */
  delay?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className={cx("skeleton rounded-md", className)}
      style={delay ? { ...style, animationDelay: `${delay}ms` } : style}
    />
  );
}

/** Sibling index to a stagger delay, 40ms apart, capped so late tiles never lag. */
export const stagger = (i: number) => Math.min(i, 8) * 40;

/** A few text lines of varying width. */
export function SkeletonText({
  lines = 2,
  className,
  delay = 0,
  size = "sm",
}: {
  lines?: number;
  className?: string;
  delay?: number;
  size?: "xs" | "sm" | "md";
}) {
  const h = size === "xs" ? "h-2.5" : size === "md" ? "h-4" : "h-3";
  const widths = ["w-full", "w-[82%]", "w-[64%]", "w-[90%]", "w-[48%]"];
  return (
    <div className={cx("space-y-2", className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} delay={delay} className={cx(h, widths[i % widths.length])} />
      ))}
    </div>
  );
}

/**
 * A card-shaped placeholder: icon or logo, a title with a subtitle, a few
 * lines, and a badge row. Matches the Card padding so the grid gutters line
 * up with the real tiles.
 */
export function SkeletonTile({
  index = 0,
  lines = 2,
  badges = 2,
  icon = "square",
  footer,
  className,
}: {
  index?: number;
  lines?: number;
  badges?: number;
  icon?: "square" | "circle" | "none";
  /** Extra shape under the badges, e.g. a button or an influence bar. */
  footer?: ReactNode;
  className?: string;
}) {
  const d = stagger(index);
  return (
    <div
      aria-hidden
      className={cx("flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5", className)}
    >
      <div className="flex items-start gap-2.5">
        {icon !== "none" && (
          <Skeleton delay={d} className={cx("h-8 w-8 shrink-0", icon === "circle" ? "rounded-full" : "rounded-lg")} />
        )}
        <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
          <Skeleton delay={d} className="h-3.5 w-[55%]" />
          <Skeleton delay={d} className="h-2.5 w-[38%]" />
        </div>
        <Skeleton delay={d} className="h-5 w-9 rounded-full" />
      </div>
      {lines > 0 && <SkeletonText lines={lines} delay={d} className="mt-3.5" />}
      {badges > 0 && (
        <div className="mt-3.5 flex gap-1.5">
          {Array.from({ length: badges }).map((_, i) => (
            <Skeleton key={i} delay={d} className={cx("h-5 rounded-full", i === 0 ? "w-14" : "w-20")} />
          ))}
        </div>
      )}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}

/** A KPI tile: small label, big number, tiny footnote. */
export function SkeletonStat({ index = 0, className }: { index?: number; className?: string }) {
  const d = stagger(index);
  return (
    <div
      aria-hidden
      className={cx("rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5", className)}
    >
      <Skeleton delay={d} className="h-2.5 w-[45%]" />
      <Skeleton delay={d} className="mt-3 h-6 w-[60%]" />
      <Skeleton delay={d} className="mt-2.5 h-2.5 w-[35%]" />
    </div>
  );
}

/** A list or table row: optional leading mark, a label, a trailing value. */
export function SkeletonRow({
  index = 0,
  leading = "circle",
  trailing = 1,
  className,
  height = "h-10",
}: {
  index?: number;
  leading?: "circle" | "square" | "none";
  /** Number of short blocks on the right, like badges or numbers. */
  trailing?: number;
  className?: string;
  height?: string;
}) {
  const d = stagger(index);
  return (
    <div aria-hidden className={cx("flex items-center gap-3 rounded-lg px-2", height, className)}>
      {leading !== "none" && (
        <Skeleton delay={d} className={cx("h-6 w-6 shrink-0", leading === "circle" ? "rounded-full" : "rounded-md")} />
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton delay={d} className={cx("h-3", index % 3 === 0 ? "w-[42%]" : index % 3 === 1 ? "w-[58%]" : "w-[35%]")} />
        <Skeleton delay={d} className="h-2.5 w-[24%]" />
      </div>
      {Array.from({ length: trailing }).map((_, i) => (
        <Skeleton key={i} delay={d} className={cx("h-4 shrink-0", i === 0 ? "w-14" : "w-10")} />
      ))}
    </div>
  );
}

/** A stack of rows. */
export function SkeletonRows({
  count = 6,
  className,
  ...row
}: { count?: number; className?: string } & Omit<Parameters<typeof SkeletonRow>[0], "index" | "className">) {
  return (
    <div className={cx("space-y-1", className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} index={i} {...row} />
      ))}
    </div>
  );
}

/** A chart area: baseline, a handful of bars of varying height, axis ticks. */
export function SkeletonChart({ className, bars = 14, height = "h-[220px]" }: { className?: string; bars?: number; height?: string }) {
  const heights = [38, 52, 44, 68, 58, 74, 62, 86, 70, 64, 80, 56, 72, 48, 66, 60];
  return (
    <div aria-hidden className={cx("flex flex-col", height, className)}>
      <div className="flex flex-1 items-end gap-1.5 px-1">
        {Array.from({ length: bars }).map((_, i) => (
          <Skeleton key={i} delay={stagger(i)} className="w-full rounded-t-md rounded-b-sm" style={{ height: `${heights[i % heights.length]}%` }} />
        ))}
      </div>
      <div className="mt-2 flex justify-between px-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-2 w-8" />
        ))}
      </div>
    </div>
  );
}

/** A gauge tile: label, a ring, and a sentence beneath. */
export function SkeletonGauge({ index = 0, className }: { index?: number; className?: string }) {
  const d = stagger(index);
  return (
    <div aria-hidden className={cx("rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5", className)}>
      <Skeleton delay={d} className="h-3 w-[40%]" />
      <div className="my-4 grid place-items-center">
        <div className="relative h-20 w-20">
          <Skeleton delay={d} className="absolute inset-0 rounded-full" />
          <div className="absolute inset-[9px] rounded-full bg-[var(--surface)]" />
        </div>
      </div>
      <SkeletonText lines={2} delay={d} size="xs" />
    </div>
  );
}

/** A block of code or a config snippet. */
export function SkeletonCode({ lines = 4, className, delay = 0 }: { lines?: number; className?: string; delay?: number }) {
  const widths = ["w-[70%]", "w-[88%]", "w-[52%]", "w-[76%]", "w-[40%]", "w-[64%]"];
  return (
    <div aria-hidden className={cx("space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-4", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} delay={delay} className={cx("h-3", widths[i % widths.length])} />
      ))}
    </div>
  );
}
