"use client";

import { useId } from "react";
import { cx } from "@/lib/format";

export type ScoreTone = "blue" | "red" | "purple";

/**
 * Per-tone palette. The arc, the icon tile and the card wash all come from one
 * entry so a score reads as a single object rather than three tinted parts.
 */
const TONES: Record<ScoreTone, { from: string; to: string; tile: string; wash: string }> = {
  blue: {
    from: "#2e8cff",
    to: "#6b5bfc",
    tile: "bg-[#2e8cff]/12 text-[#2e8cff]",
    wash: "from-[#2e8cff]/[0.07]",
  },
  red: {
    from: "#f97362",
    to: "#ef4444",
    tile: "bg-[#ef4444]/12 text-[#ef4444]",
    wash: "from-[#ef4444]/[0.07]",
  },
  purple: {
    from: "#9143fd",
    to: "#6b5bfc",
    tile: "bg-[#9143fd]/12 text-[#9143fd]",
    wash: "from-[#9143fd]/[0.07]",
  },
};

/**
 * One analytics score: number on the left, arc on the right.
 *
 * The number is the headline and reads first at this size; the arc is there to
 * place it on a 0–100 range at a glance. Stacking a small label over a big
 * gauge, as this did before, made three identical shapes that had to be read
 * one at a time.
 */
export function ScoreCard({
  value,
  label,
  caption,
  tone,
  icon,
}: {
  value: number;
  label: string;
  caption?: string;
  tone: ScoreTone;
  icon: React.ReactNode;
}) {
  const id = useId();
  const clamped = Math.max(0, Math.min(100, value));
  const t = TONES[tone];

  // Semi-circular arc, 180° sweep.
  const size = 132;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const cy = size / 2;
  const circumference = Math.PI * r;

  return (
    <div
      className={cx(
        "rounded-2xl border border-[var(--border)] bg-gradient-to-br to-transparent p-5",
        "bg-[var(--surface)]",
        t.wash
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-xl", t.tile)}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-display text-[15px] font-bold text-[var(--text)]">{label}</p>
          {caption && (
            <p className="mt-0.5 truncate text-[12px] text-[var(--text-subtle)]" title={caption}>
              {caption}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="font-display text-[46px] font-bold leading-none tracking-tight text-[var(--text)] tabular-nums">
          {Math.round(clamped)}
        </p>

        <svg
          width={size}
          height={size / 2 + 12}
          viewBox={`0 0 ${size} ${size / 2 + 12}`}
          className="shrink-0"
          role="img"
          aria-label={`${Math.round(clamped)} out of 100`}
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={t.from} />
              <stop offset="100%" stopColor={t.to} />
            </linearGradient>
          </defs>

          <path
            d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
            fill="none"
            stroke="var(--surface-sunken)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped / 100)}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
          />

          <text
            x={size / 2}
            y={cy - 4}
            textAnchor="middle"
            className="fill-[var(--text-subtle)]"
            style={{ fontSize: 11 }}
          >
            {Math.round(clamped)} / 100
          </text>
        </svg>
      </div>
    </div>
  );
}
