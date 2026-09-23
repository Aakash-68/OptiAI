"use client";

import { Fragment, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Coins,
  Database,
  Hash,
  Layers,
  MessageSquare,
  Timer,
} from "lucide-react";
import { PageContainer } from "@/components/layout/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Tabs } from "@/components/ui/Tabs";
import { Badge, StatusDot } from "@/components/ui/Badge";
import { EmptyState, ErrorNote, Skeleton } from "@/components/ui/EmptyState";
import { ProviderLogo } from "@/components/ui/ProviderLogo";
import { AreaChart } from "@/components/charts/AreaChart";
import { BarList, RatioBar } from "@/components/charts/BarList";
import { getRecentUsage, getTraces, getUsageChart, getUsageStats } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import {
  compactNumber,
  formatCost,
  formatLatency,
  formatNumber,
  formatRelativeTime,
  shortModelName,
} from "@/lib/format";
import type { PromptTrace, UsageBucket } from "@/lib/types";

const PERIODS = [
  { id: "today", label: "Today", chart: "1d" },
  { id: "24h", label: "24h", chart: "1d" },
  { id: "7d", label: "7D", chart: "7d" },
  { id: "30d", label: "30D", chart: "30d" },
  { id: "60d", label: "60D", chart: "60d" },
];

export default function UsagePage() {
  const [period, setPeriod] = useState("7d");
  const [view, setView] = useState("overview");
  const [metric, setMetric] = useState<"tokens" | "cost">("tokens");

  const chartPeriod = PERIODS.find((p) => p.id === period)?.chart || "7d";

  const stats = useApi(() => getUsageStats(period), [period]);
  const chart = useApi(() => getUsageChart(chartPeriod), [chartPeriod]);
  const recent = useApi(() => getRecentUsage(40), []);
  const traces = useApi(() => getTraces(50), []);

  // `/usage/recent` returns an envelope, not a bare array. Reading it as an
  // array is what made this table render empty regardless of traffic.
  const recentRows = recent.data?.records ?? [];
  const estimatedRows = recent.data?.estimatedCount ?? 0;
  const traceRows = traces.data ?? [];

  // The totals are `total…`-prefixed upstream; the unprefixed names belong to the
  // per-bucket objects. Reading the wrong ones is what pinned every KPI to zero.
  const input = stats.data?.totalPromptTokens ?? 0;
  const output = stats.data?.totalCompletionTokens ?? 0;
  const cached = stats.data?.totalCachedTokens ?? 0;
  const cost = stats.data?.totalCost ?? 0;
  const requests = stats.data?.totalRequests ?? 0;

  // Labels arrive already formatted for the period (times for intraday, dates
  // otherwise) and tokens already summed, so neither is recomputed here.
  const series = useMemo(
    () =>
      (chart.data || []).map((point) => ({
        label: point.label,
        value: metric === "cost" ? (point.cost ?? 0) : (point.tokens ?? 0),
      })),
    [chart.data, metric]
  );

  /**
   * Bucket keys are composite and not display strings — byModel is keyed
   * `"<model> (<provider>)"` and byEndpoint `"<endpoint>|<model>|<provider>"`.
   * Each bucket carries the readable part, so that is what gets rendered; the
   * key is only ever used for identity.
   */
  const toRows = (
    buckets: Record<string, UsageBucket> | undefined,
    { icon, field }: { icon?: boolean; field?: "rawModel" | "endpoint" } = {}
  ) =>
    Object.entries(buckets || {})
      .map(([key, bucket]) => {
        const readable = (field && bucket[field]) || key;
        return {
          id: key,
          label: icon ? readable : shortModelName(readable),
          value: bucket.requests || 0,
          display: `${formatNumber(bucket.requests)} req · ${formatCost(bucket.cost)}`,
          icon: icon ? (
            <ProviderLogo id={key} name={key} size="sm" className="!h-5 !w-5 !rounded-md" />
          ) : undefined,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

  /**
   * byEndpoint is keyed per endpoint *and* model *and* provider, so the same
   * endpoint appears once per model. Rolled up here, since the question the card
   * asks is which API surface was used — not which model went through it.
   */
  const endpointRows = useMemo(() => {
    const merged: Record<string, UsageBucket> = {};
    for (const bucket of Object.values(stats.data?.byEndpoint || {})) {
      const name = bucket.endpoint || "unknown";
      const target = (merged[name] ??= { requests: 0, cost: 0, endpoint: name });
      target.requests = (target.requests || 0) + (bucket.requests || 0);
      target.cost = (target.cost || 0) + (bucket.cost || 0);
    }
    return merged;
  }, [stats.data]);

  const hasData = requests > 0 || input > 0;

  return (
    <PageContainer
      title="Usage"
      description="Every request through OptiAI, with tokens and cost recorded at write time"
      width="wide"
      actions={
        <div className="flex items-center gap-2">
          <Tabs
            tabs={[
              { id: "overview", label: "Overview" },
              { id: "prompts", label: "Prompts" },
              { id: "details", label: "Requests" },
            ]}
            active={view}
            onChange={setView}
            size="sm"
          />
          <Tabs tabs={PERIODS} active={period} onChange={setPeriod} size="sm" />
        </div>
      }
    >
      {stats.error && <ErrorNote message={stats.error} className="mb-4" />}

      {/* KPI row */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)
        ) : (
          <>
            <StatCard
              label="Total requests"
              value={formatNumber(requests)}
              icon={<Hash className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Input tokens"
              value={compactNumber(input)}
              accent="in"
              icon={<ArrowUp className="h-3.5 w-3.5" />}
              sub={formatNumber(input)}
            />
            <StatCard
              label="Cached tokens"
              value={compactNumber(cached)}
              accent="cached"
              icon={<Database className="h-3.5 w-3.5" />}
              sub={input > 0 ? `${((cached / input) * 100).toFixed(1)}% of input` : undefined}
            />
            <StatCard
              label="Output tokens"
              value={compactNumber(output)}
              accent="out"
              icon={<ArrowDown className="h-3.5 w-3.5" />}
              sub={formatNumber(output)}
            />
            <StatCard
              label="Est. cost"
              value={formatCost(cost)}
              accent="cost"
              icon={<Coins className="h-3.5 w-3.5" />}
              sub="Estimated, not actual billing"
            />
          </>
        )}
      </div>

      {view === "overview" ? (
        <div className="space-y-5">
          {/* Trend */}
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <CardHeader
                title={metric === "cost" ? "Cost over time" : "Token usage over time"}
                description={`Aggregated per day across the last ${chartPeriod}`}
              />
              <Tabs
                tabs={[
                  { id: "tokens", label: "Tokens" },
                  { id: "cost", label: "Cost" },
                ]}
                active={metric}
                onChange={(id) => setMetric(id as "tokens" | "cost")}
                size="sm"
              />
            </div>
            {chart.loading ? (
              <Skeleton className="h-[220px] rounded-lg" />
            ) : (
              <AreaChart
                data={series}
                format={metric === "cost" ? "cost" : "number"}
                color={metric === "cost" ? "#f59e0b" : "var(--brand)"}
              />
            )}
          </Card>

          {/* Distributions */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Usage by model" description="Ranked by request count" />
              <div className="mt-4">
                <BarList rows={toRows(stats.data?.byModel, { field: "rawModel" })} emptyLabel="No model usage recorded" />
              </div>
            </Card>

            <Card>
              <CardHeader title="Usage by provider" description="Where the traffic actually went" />
              <div className="mt-4">
                <BarList
                  rows={toRows(stats.data?.byProvider, { icon: true })}
                  color="var(--color-accent-500)"
                  emptyLabel="No provider usage recorded"
                />
              </div>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Input / output split"
                description="A very lopsided ratio means you are paying to send context, not to generate"
              />
              <div className="mt-5">
                {hasData ? (
                  <RatioBar
                    segments={[
                      { label: "Input", value: input, color: "var(--color-accent-500)" },
                      { label: "Cached", value: cached, color: "var(--color-brand-500)" },
                      { label: "Output", value: output, color: "var(--color-ok-500)" },
                    ]}
                  />
                ) : (
                  <p className="py-4 text-center text-[13px] text-[var(--text-subtle)]">
                    No token data yet
                  </p>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Usage by endpoint" description="Which API surface was used" />
              <div className="mt-4">
                <BarList
                  rows={toRows(endpointRows, { field: "endpoint" })}
                  color="var(--color-ok-500)"
                  emptyLabel="No endpoint data recorded"
                />
              </div>
            </Card>
          </div>
        </div>
      ) : view === "prompts" ? (
        <PromptsTable rows={traceRows} loading={traces.loading} error={traces.error} />
      ) : (
        /* Requests: the raw gateway log — chat plus anything a CLI tool sent. */
        <Card padded={false}>
          <div className="border-b border-[var(--border)] px-5 py-4">
            <CardHeader
              title="Recent requests"
              description="One row per request through the gateway — chat and connected CLI tools alike, written with its cost at the time it completed"
            />
          </div>

          {recent.loading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : recentRows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<Layers className="h-5 w-5" />}
                title="No requests recorded yet"
                description="Connect a provider and send a chat message — every request lands here with its token counts and cost."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-sunken)]">
                  <tr className="text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">
                    <th className="px-5 py-2.5 font-semibold">Model</th>
                    <th className="px-3 py-2.5 font-semibold">Provider</th>
                    <th className="px-3 py-2.5 text-right font-semibold">In</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Out</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Cost</th>
                    <th className="px-3 py-2.5 font-semibold">Source</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-5 py-2.5 text-right font-semibold">When</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRows.map((row, i) => (
                    <tr
                      key={row.id ?? i}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)]"
                    >
                      <td className="max-w-[260px] truncate px-5 py-2.5 font-mono text-[12px] text-[var(--text)]">
                        {row.model || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)]">{row.provider || "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-accent-600 dark:text-accent-400">
                        {formatNumber(row.promptTokens)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ok-600 dark:text-ok-500">
                        {formatNumber(row.completionTokens)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-muted)]">
                        {formatCost(row.cost)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5">
                          <StatusDot tone={row.status === "ok" ? "ok" : "err"} />
                          <span className="text-[12px] text-[var(--text-muted)]">
                            {row.status || "ok"}
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right text-[12px] text-[var(--text-subtle)]">
                        {formatRelativeTime(row.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <p className="mt-5 flex items-center gap-2 text-[12px] text-[var(--text-subtle)]">
        <Badge tone="neutral">note</Badge>
        Cost is computed from the pricing tables at write time and is an estimate, not your
        provider&rsquo;s actual invoice.
        {view === "details" && estimatedRows > 0 && (
          <span>
            {" "}
            {estimatedRows} of these rows have token counts the provider did not report, which
            OptiAI estimated from message length.
          </span>
        )}
      </p>
    </PageContainer>
  );
}

/**
 * One row per prompt sent from the chat UI, keyed on the id the composer showed.
 *
 * Separate from "Requests" on purpose: that table is the raw gateway log and
 * includes traffic from connected CLI tools, which never had a prompt id. Merging
 * the two would mean inventing ids for rows that do not have one.
 */
function PromptsTable({
  rows,
  loading,
  error,
}: {
  rows: PromptTrace[];
  loading: boolean;
  error?: string | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Card padded={false}>
      <div className="border-b border-[var(--border)] px-5 py-4">
        <CardHeader
          title="Prompts"
          description="One row per prompt sent from Chat, traced end to end by its prompt ID"
        />
      </div>

      {error && (
        <div className="p-5">
          <ErrorNote message={error} />
        </div>
      )}

      {loading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={<MessageSquare className="h-5 w-5" />}
            title="No prompts traced yet"
            description="Send a message from Chat. Each one gets an ID before it leaves OptiAI, and lands here with its tokens, cost and latency."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-sunken)]">
              <tr className="text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">
                <th className="px-5 py-2.5 font-semibold">Prompt ID</th>
                <th className="px-3 py-2.5 font-semibold">Model</th>
                <th className="px-3 py-2.5 text-right font-semibold">In</th>
                <th className="px-3 py-2.5 text-right font-semibold">Out</th>
                <th className="px-3 py-2.5 text-right font-semibold">Cost</th>
                <th className="px-3 py-2.5 text-right font-semibold">Latency</th>
                <th className="px-3 py-2.5 font-semibold">Source</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-5 py-2.5 text-right font-semibold">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Fragment key={row.promptId}>
                  <tr
                    onClick={() => setExpanded(expanded === row.promptId ? null : row.promptId)}
                    className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-5 py-2.5 font-mono text-[11.5px] text-[var(--text)]">
                      {row.promptId}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2.5 font-mono text-[11.5px] text-[var(--text-muted)]">
                      {shortModelName(row.resolvedModel || row.requestedModel || "—")}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-accent-600 dark:text-accent-400">
                      {formatNumber(row.inputTokens)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-ok-600 dark:text-ok-500">
                      {formatNumber(row.outputTokens)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-muted)]">
                      {formatCost(row.cost)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-muted)]">
                      {row.latencyMs != null ? formatLatency(row.latencyMs) : "—"}
                    </td>
                    {/* Where the request came from: the app, or a CLI tool
                        pointed at the gateway. Both are traced now. */}
                    <td className="px-3 py-2.5">
                      <span className="rounded-md bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[11px] text-[var(--text-muted)]">
                        {row.source === "cli" ? "CLI" : "Chat"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <StatusDot
                          tone={
                            row.status === "ok" ? "ok" : row.status === "pending" ? "warn" : "err"
                          }
                        />
                        <span className="text-[12px] text-[var(--text-muted)]">{row.status}</span>
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right text-[12px] text-[var(--text-subtle)]">
                      {formatRelativeTime(row.createdAt)}
                    </td>
                  </tr>

                  {expanded === row.promptId && (
                    <tr className="border-b border-[var(--border)]">
                      <td colSpan={9} className="bg-[var(--surface-sunken)] px-5 py-4">
                        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                          <Detail label="Requested model" value={row.requestedModel || "—"} mono />
                          <Detail label="Resolved model" value={row.resolvedModel || "—"} mono />
                          <Detail label="Provider" value={row.provider || "—"} />
                          <Detail label="Mode" value={row.mode || "chat"} />
                          <Detail label="Thread" value={row.threadId || "—"} mono />
                          <Detail label="Message" value={row.messageId || "—"} mono />
                          <Detail
                            label="Time to first token"
                            value={row.ttftMs != null ? formatLatency(row.ttftMs) : "—"}
                          />
                          <Detail
                            label="Total latency"
                            value={row.latencyMs != null ? formatLatency(row.latencyMs) : "—"}
                          />
                          <Detail label="Prompt length" value={`${formatNumber(row.promptChars)} chars`} />
                          <Detail label="Turns sent" value={formatNumber(row.turnCount)} />
                          <Detail label="Cached tokens" value={formatNumber(row.cachedTokens)} />
                          <Detail label="Reasoning tokens" value={formatNumber(row.reasoningTokens)} />
                          <Detail
                            label="Token source"
                            value={
                              row.tokenSource === "estimated"
                                ? "estimated (provider reported none)"
                                : "reported by provider"
                            }
                          />
                          <Detail label="Started" value={new Date(row.createdAt).toLocaleString()} />
                          <Detail
                            label="Completed"
                            value={row.completedAt ? new Date(row.completedAt).toLocaleString() : "—"}
                          />
                        </dl>
                        {row.error && (
                          <p className="mt-3 rounded-lg border border-err-500/25 bg-err-50 px-3 py-2 text-[12px] text-err-700 dark:bg-err-500/10 dark:text-err-500">
                            {row.error}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <p className="flex items-center gap-2 border-t border-[var(--border)] px-5 py-3 text-[12px] text-[var(--text-subtle)]">
          <Timer className="h-3.5 w-3.5" />
          Click a row to see the full trace. The same ID is shown under the answer in Chat.
        </p>
      )}
    </Card>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] uppercase tracking-wider text-[var(--text-subtle)]">{label}</dt>
      <dd
        className={`truncate text-[12.5px] text-[var(--text)] ${mono ? "font-mono text-[11.5px]" : ""}`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
