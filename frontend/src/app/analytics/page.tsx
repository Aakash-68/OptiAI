"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Coins,
  Crosshair,
  Info,
  Lightbulb,
  Minus,
  Sparkles,
  Zap,
} from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState, ErrorNote, Skeleton } from "@/components/ui/EmptyState";
import { ScoreCard, type ScoreTone } from "@/components/charts/ScoreCard";
import { getUsageStats } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { deriveScores, type ScoreBreakdown } from "@/lib/analytics";
import { SKILL_LIBRARY } from "@/lib/catalog/skills";
import { cx } from "@/lib/format";

const PERIODS = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "all", label: "All time" },
];

/** Each score keeps one colour and one glyph everywhere it appears. */
const SCORE_STYLE: Record<
  ScoreBreakdown["id"],
  { tone: ScoreTone; icon: React.ReactNode; dot: string; pill: string }
> = {
  efficiency: {
    tone: "blue",
    icon: <Zap className="h-4.5 w-4.5" />,
    dot: "bg-[#2e8cff]",
    pill: "bg-[#2e8cff]/12 text-[#2e8cff]",
  },
  "model-fit": {
    tone: "red",
    icon: <Crosshair className="h-4.5 w-4.5" />,
    dot: "bg-[#ef4444]",
    pill: "bg-[#ef4444]/12 text-[#ef4444]",
  },
  "prompt-craft": {
    tone: "purple",
    icon: <Sparkles className="h-4.5 w-4.5" />,
    dot: "bg-[#9143fd]",
    pill: "bg-[#9143fd]/12 text-[#9143fd]",
  },
};

/**
 * Usage says what happened. Analytics says what it means.
 *
 * The three scores are computed from the same usageHistory rollups Usage
 * reads, so the two pages can never disagree. Each score owns a colour, and
 * that colour follows it from its card into its column of reasons — which is
 * what lets "Why this matters" be read as three explanations rather than nine
 * loose bullets.
 */
export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30d");
  const { data, loading, error } = useApi(() => getUsageStats(period), [period]);

  const report = useMemo(() => deriveScores(data), [data]);

  return (
    <div className="mx-auto w-full max-w-[1120px] px-6 py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)]">
            <BarChart3 className="h-5 w-5 text-[var(--brand)]" />
          </span>
          <div>
            <h1 className="font-display text-[26px] font-bold tracking-tight text-[var(--text)]">
              Analytics
            </h1>
            <p className="mt-0.5 text-[13.5px] text-[var(--text-subtle)]">
              What your usage means, and what to change
            </p>
          </div>
        </div>

        <Tabs tabs={PERIODS} active={period} onChange={setPeriod} size="sm" />
      </div>

      {error && <ErrorNote message={error} className="mb-4" />}

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[170px] rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-[190px] rounded-2xl" />
        </div>
      ) : !report.hasData ? (
        <EmptyState
          icon={<BarChart3 className="h-5 w-5" />}
          title="Not enough usage to analyze"
          description={report.observation}
          action={
            <Link
              href="/providers"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--brand)] hover:underline"
            >
              Connect a provider <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {report.scores.map((score) => (
              <ScoreCard
                key={score.id}
                value={score.score}
                label={score.label}
                caption={score.caption}
                tone={SCORE_STYLE[score.id].tone}
                icon={SCORE_STYLE[score.id].icon}
              />
            ))}
          </div>

          <Panel>
            <div className="flex items-center gap-1.5">
              <h2 className="font-display text-[15px] font-bold text-[var(--text)]">
                Why this matters
              </h2>
              <Info
                className="h-3.5 w-3.5 text-[var(--text-subtle)]"
                aria-label="Each number below is justified from your own recorded usage"
              />
            </div>

            <div className="mt-4 grid gap-6 sm:grid-cols-3">
              {report.scores.map((score) => {
                const style = SCORE_STYLE[score.id];
                return (
                  <div key={score.id}>
                    <span
                      className={cx(
                        "inline-block rounded-md px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider",
                        style.pill
                      )}
                    >
                      Why {score.score}
                    </span>
                    <ul className="mt-2.5 space-y-2">
                      {score.reasons.map((reason, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--text-muted)]"
                        >
                          <span
                            aria-hidden
                            className={cx(
                              "mt-[6px] h-[5px] w-[5px] shrink-0 rounded-full",
                              style.dot
                            )}
                          />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#2e8cff]/12 text-[#2e8cff]">
                <Lightbulb className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="font-display text-[15px] font-bold text-[var(--text)]">
                  Usage observation
                </h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">
                  {report.observation}
                </p>
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <Heading
                icon={<Check className="h-4 w-4" />}
                tint="bg-ok-500/15 text-ok-600 dark:text-ok-500"
                title="What is working"
              />
              <ul className="mt-3.5 space-y-2.5">
                {report.pros.map((pro, i) => (
                  <Bullet key={i} tone="ok">
                    {pro}
                  </Bullet>
                ))}
              </ul>
            </Panel>

            <Panel>
              <Heading
                icon={<Coins className="h-4 w-4" />}
                tint="bg-warn-500/15 text-warn-600 dark:text-warn-500"
                title="What is costing you"
              />
              {report.cons.length === 0 ? (
                <p className="mt-3.5 text-[13px] text-[var(--text-subtle)]">
                  Nothing stands out as wasteful in this period.
                </p>
              ) : (
                <ul className="mt-3.5 space-y-2.5">
                  {report.cons.map((con, i) => (
                    <Bullet key={i} tone="warn">
                      {con}
                    </Bullet>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel>
            <h2 className="font-display text-[15px] font-bold text-[var(--text)]">
              Suggested changes
            </h2>
            <p className="mt-0.5 text-[12.5px] text-[var(--text-subtle)]">
              Each one points at a skill in the OptiAI library that implements it
            </p>

            {report.suggestions.length === 0 ? (
              <p className="mt-3.5 text-[13px] text-[var(--text-subtle)]">
                No changes worth making right now — your usage is already lean for this workload.
              </p>
            ) : (
              <div className="mt-4 space-y-2.5">
                {report.suggestions.map((suggestion, i) => {
                  const skill = SKILL_LIBRARY.find((s) => s.id === suggestion.skillId);
                  return (
                    <div
                      key={i}
                      className="flex flex-wrap items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-3.5"
                    >
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                        <Sparkles className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-[var(--text)]">
                          {suggestion.title}
                        </p>
                        <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--text-subtle)]">
                          {suggestion.detail}
                        </p>
                      </div>
                      {skill && (
                        <Link
                          href="/skills"
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--brand-soft-border)] bg-[var(--brand-soft)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--brand)] transition-colors hover:brightness-95"
                        >
                          {skill.name}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <p className="px-1 text-[11.5px] leading-relaxed text-[var(--text-subtle)]">
            Scores are derived deterministically from your recorded usage — no model call is made.
            When an analytics endpoint exists, it replaces this heuristic and the layout stays.
          </p>
        </div>
      )}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      {children}
    </section>
  );
}

function Heading({
  icon,
  tint,
  title,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-lg", tint)}>{icon}</span>
      <h2 className="font-display text-[15px] font-bold text-[var(--text)]">{title}</h2>
    </div>
  );
}

function Bullet({ tone, children }: { tone: "ok" | "warn"; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[13px] leading-relaxed text-[var(--text-muted)]">
      <span
        className={cx(
          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full",
          tone === "ok"
            ? "bg-ok-500/15 text-ok-600 dark:text-ok-500"
            : "bg-warn-500/15 text-warn-600 dark:text-warn-500"
        )}
      >
        {tone === "ok" ? <Check className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
      </span>
      {children}
    </li>
  );
}
