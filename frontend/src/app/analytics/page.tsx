"use client";

import { useEffect, useMemo, useState } from "react";
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
  TriangleAlert,
  Zap,
} from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState, ErrorNote } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonGauge, SkeletonRow, SkeletonText, stagger } from "@/components/ui/Skeleton";
import { ScoreCard, type ScoreTone } from "@/components/charts/ScoreCard";
import { aiAnalyze, getLastAnalysis, getUsageStats } from "@/lib/api";
import { useLocalStorage } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";
import { StatusDot } from "@/components/ui/Badge";
import { formatNumber, formatRelativeTime, shortModelName } from "@/lib/format";
import type { AiAnalysis } from "@/lib/types";
import { useApi } from "@/hooks/useApi";
import { deriveScores, type ScoreBreakdown } from "@/lib/analytics";
import { useSkills } from "@/hooks/useSkills";
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
  const library = useSkills();

  const report = useMemo(() => deriveScores(data), [data]);

  /**
   * Re-evaluate sends the period's totals and its odd-looking prompts to a
   * connected model and keeps the answer per period. Stored in the browser
   * as well as on the server, so it survives both a reload and a restart.
   */
  const [reviews, setReviews] = useLocalStorage<Record<string, AiAnalysis>>("optiai.analytics.reviews", {});
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const review = reviews[period] ?? null;

  useEffect(() => {
    if (reviews[period]) return;
    void getLastAnalysis(period)
      .then((last) => {
        if (last) setReviews((prev) => ({ ...prev, [period]: last }));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function reevaluate() {
    setEvaluating(true);
    setEvalError(null);
    try {
      const next = await aiAnalyze(period);
      setReviews((prev) => ({ ...prev, [period]: next }));
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  }

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

        <div className="flex flex-wrap items-center gap-2">
          <Tabs tabs={PERIODS} active={period} onChange={setPeriod} size="sm" />
          <Button
            size="sm"
            variant="gradient"
            loading={evaluating}
            onClick={() => void reevaluate()}
            icon={<LogoMark size={12} className="brightness-0 invert" />}
            title="Send this period's totals and its unusual prompts to a connected model"
          >
            {review ? "Re-evaluate" : "Evaluate with OptiAI"}
          </Button>
        </div>
      </div>

      {evalError && <ErrorNote message={evalError} className="mb-4" />}

      {error && <ErrorNote message={error} className="mb-4" />}

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 @lg:grid-cols-2 @3xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonGauge key={i} index={i} />
            ))}
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <Skeleton delay={stagger(3)} className="h-3.5 w-[30%]" />
            <SkeletonText lines={3} delay={stagger(3)} className="mt-4" />
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: 2 }).map((_, i) => (
                <SkeletonRow key={i} index={i + 4} leading="square" trailing={1} height="h-12" className="border border-[var(--border)] bg-[var(--surface-sunken)]" />
              ))}
            </div>
          </div>
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
          {review && <ReviewPanel review={review} />}

          <div className="grid gap-4 @lg:grid-cols-2 @3xl:grid-cols-3">
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

            <div className="mt-4 grid gap-6 @xl:grid-cols-2 @3xl:grid-cols-3">
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

          <div className="grid gap-4 @3xl:grid-cols-2">
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
                  const skill = library.skills.find((s) => s.id === suggestion.skillId);
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
            Scores are derived deterministically from your recorded usage. Re-evaluate asks a
            connected model for its own read of the same numbers plus the prompts that look unusual.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * What the model said about this period. Sits above the deterministic scores
 * because it is the newer, opinionated view; the scores below remain the
 * always-available baseline it was asked to comment on.
 */
function ReviewPanel({ review }: { review: AiAnalysis }) {
  const SEV = {
    high: "bg-err-50 text-err-700 dark:bg-err-500/12 dark:text-err-500",
    warn: "bg-warn-50 text-warn-700 dark:bg-warn-500/12 dark:text-warn-500",
    info: "bg-[var(--brand-soft)] text-[var(--brand)]",
  } as const;
  return (
    <section className="grad-border rounded-2xl bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <LogoMark size={16} />
          <h2 className="font-display text-[15px] font-bold text-[var(--text)]">OptiAI review</h2>
        </div>
        <p className="text-[11.5px] text-[var(--text-subtle)]">
          {shortModelName(review.model)} · {formatRelativeTime(review.evaluatedAt)}
        </p>
      </div>

      {review.summary && (
        <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--text-muted)]">{review.summary}</p>
      )}

      {review.scores && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(
            [
              ["Efficiency", review.scores.efficiency, SCORE_STYLE.efficiency.pill],
              ["Model fit", review.scores.modelFit, SCORE_STYLE["model-fit"].pill],
              ["Prompt craft", review.scores.promptCraft, SCORE_STYLE["prompt-craft"].pill],
            ] as const
          ).map(([label, value, pill]) =>
            value == null ? null : (
              <span key={label} className={cx("rounded-md px-2 py-0.5 text-[11px] font-semibold", pill)}>
                {label} {value}
              </span>
            )
          )}
        </div>
      )}

      <div className="mt-4 grid gap-5 @3xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">Findings</p>
          {review.findings.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-[var(--text-subtle)]">Nothing to flag.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {review.findings.map((f, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className={cx("mt-0.5 h-fit shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase", SEV[f.severity])}>
                    {f.severity}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-[var(--text)]">{f.title}</span>
                    <span className="block text-[12.5px] leading-relaxed text-[var(--text-muted)]">{f.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
            <TriangleAlert className="h-3 w-3" /> Prompts worth a look
          </p>
          {review.suspicious.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-[var(--text-subtle)]">No individual prompt stood out.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {review.suspicious.map((p) => (
                <li key={p.promptId} className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-2">
                  <div className="flex items-center gap-2 text-[11.5px]">
                    <StatusDot tone={p.status === "ok" ? "ok" : "err"} />
                    <Link href="/usage" className="min-w-0 flex-1 truncate font-mono text-[var(--text)] hover:underline" title={p.promptId}>
                      {p.promptId}
                    </Link>
                    <span className="shrink-0 tabular-nums text-accent-600 dark:text-accent-400">{formatNumber(p.inputTokens)}↑</span>
                    <span className="shrink-0 tabular-nums text-ok-600 dark:text-ok-500">{formatNumber(p.outputTokens)}↓</span>
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-[var(--text-muted)]">
                    {p.model && <span className="font-mono text-[11px] text-[var(--text-subtle)]">{shortModelName(p.model)} · </span>}
                    {p.reason}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
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
