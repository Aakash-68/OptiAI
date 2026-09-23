"use client";

import { useId, useMemo, useState } from "react";
import { compactNumber, formatCost } from "@/lib/format";

export interface SeriesPoint {
  label: string;
  value: number;
}

/**
 * Dependency-free area chart.
 *
 * Deliberately hand-rolled SVG rather than a charting library: the whole app
 * ships two chart shapes (this and a bar list), and a library would add ~90KB
 * plus its own theming layer fighting our CSS variables.
 *
 * Renders a smoothed path via Catmull-Rom -> cubic Bezier conversion.
 */
export function AreaChart({
  data,
  height = 220,
  format = "number",
  color = "var(--brand)",
}: {
  data: SeriesPoint[];
  height?: number;
  format?: "number" | "cost";
  color?: string;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const W = 1000;
  const H = height;
  const PAD = { top: 16, right: 8, bottom: 26, left: 48 };

  const { path, area, max, points } = useMemo(() => {
    const values = data.map((d) => d.value);
    const rawMax = Math.max(...values, 0);
    // Round the axis up to something readable instead of a jagged exact max.
    const niceMax = rawMax === 0 ? 1 : Math.pow(10, Math.floor(Math.log10(rawMax))) *
      Math.ceil(rawMax / Math.pow(10, Math.floor(Math.log10(rawMax))));

    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const pts = data.map((d, i) => ({
      x: PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
      y: PAD.top + innerH - (d.value / niceMax) * innerH,
      ...d,
    }));

    if (pts.length === 0) return { path: "", area: "", max: niceMax, points: [] };

    // Catmull-Rom through the points, emitted as cubic Beziers.
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }

    const baseline = PAD.top + innerH;
    const a = `${d} L ${pts[pts.length - 1].x} ${baseline} L ${pts[0].x} ${baseline} Z`;

    return { path: d, area: a, max: niceMax, points: pts };
  }, [data, H]);

  const fmt = (v: number) => (format === "cost" ? formatCost(v) : compactNumber(v));
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className="grid place-items-center text-[13px] text-[var(--text-subtle)]"
      >
        No data for this period
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Usage over time"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.26" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* horizontal grid + y axis labels */}
        {ticks.map((t) => {
          const y = PAD.top + (H - PAD.top - PAD.bottom) * (1 - t);
          return (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray={t === 0 ? undefined : "3 5"}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={PAD.left - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-[var(--text-subtle)]"
                style={{ fontSize: 11 }}
              >
                {fmt(max * t)}
              </text>
            </g>
          );
        })}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* hover hit-areas + markers */}
        {points.map((p, i) => (
          <g key={i}>
            <rect
              x={p.x - (W - PAD.left - PAD.right) / (points.length * 2)}
              y={0}
              width={(W - PAD.left - PAD.right) / points.length}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            {hover === i && (
              <>
                <line
                  x1={p.x}
                  x2={p.x}
                  y1={PAD.top}
                  y2={H - PAD.bottom}
                  stroke={color}
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx={p.x} cy={p.y} r="5" fill={color} stroke="var(--surface)" strokeWidth="2.5" />
              </>
            )}
          </g>
        ))}

        {/* x axis labels — thinned so they never collide */}
        {points.map((p, i) => {
          const step = Math.ceil(points.length / 8);
          if (i % step !== 0 && i !== points.length - 1) return null;
          return (
            <text
              key={i}
              x={p.x}
              y={H - 8}
              textAnchor="middle"
              className="fill-[var(--text-subtle)]"
              style={{ fontSize: 11 }}
            >
              {p.label}
            </text>
          );
        })}
      </svg>

      {hover !== null && points[hover] && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 shadow-[var(--shadow-md)]"
          style={{ left: `${(points[hover].x / W) * 100}%`, top: `${(points[hover].y / H) * 100}%` }}
        >
          <p className="text-[11px] text-[var(--text-subtle)]">{points[hover].label}</p>
          <p className="font-display text-sm font-semibold tabular-nums text-[var(--text)]">
            {fmt(points[hover].value)}
          </p>
        </div>
      )}
    </div>
  );
}
