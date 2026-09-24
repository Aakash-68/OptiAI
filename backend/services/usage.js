// Usage read layer. OptiAI's analyzer will build on this, so token provenance
// (provider-reported vs locally estimated) is surfaced explicitly rather than flattened.
import { getUsageStats, getChartData, getUsageHistory, getRecentLogs } from "@/lib/db/repos/usageRepo.js";
import { getRequestDetails, getRequestDetailById } from "@/lib/db/repos/requestDetailsRepo.js";

function describeRecord(row) {
  const tokens = row.tokens || {};
  const estimated = tokens.estimated === true;
  // `promptTokens`/`completionTokens` are the names used by the usageHistory
  // row, UsageStats and the UI table. The earlier `inputTokens`/`outputTokens`
  // spelling here was a third convention that silently rendered every row as 0.
  const promptTokens = row.promptTokens ?? tokens.prompt_tokens ?? tokens.input_tokens ?? 0;
  const completionTokens =
    row.completionTokens ?? tokens.completion_tokens ?? tokens.output_tokens ?? 0;

  return {
    id: row.id,
    timestamp: row.timestamp,
    provider: row.provider,
    model: row.model,
    connectionId: row.connectionId ?? null,
    endpoint: row.endpoint,
    status: row.status || "ok",
    promptTokens,
    completionTokens,
    totalTokens: tokens.total_tokens ?? promptTokens + completionTokens,
    cachedTokens: tokens.cached_tokens ?? tokens.cache_read_input_tokens ?? 0,
    reasoningTokens: tokens.reasoning_tokens ?? 0,
    cost: row.cost ?? 0,
    // "reported" = the upstream provider returned a usage object.
    // "estimated" = 9Router fell back to a chars/4 heuristic (see estimateUsage).
    tokenSource: estimated ? "estimated" : "reported",
    estimated,
    tokens,
  };
}

export async function stats(period = "today") {
  return await getUsageStats(period);
}

/** Legacy per-day series from the vendored router. Kept for callers that want it. */
export async function chartLegacy(period = "7d") {
  return await getChartData(period);
}

const HOUR = 3600000;
const DAY = 24 * HOUR;

function localMidnight(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Bucket plan for a period.
 *
 * The vendored chart only understood "today", "24h" and whole-day periods, and
 * the UI was asking it for "1d" — which fell through to the 60-day branch, so
 * "Today" drew two months of days with one spike at the end. Every period is
 * bucketed by time here instead, with the bucket width chosen so a day is
 * never a single point until the span is long enough that days are the story:
 *
 *   today / 24h   1h buckets
 *   ≤ 3 days      3h buckets (8 per day)
 *   ≤ 14 days     6h buckets (4 per day)
 *   longer        1 day
 */
function planBuckets(period, now) {
  if (period === "today" || period === "1d") {
    const start = localMidnight(now);
    return { start, bucketMs: HOUR, count: 24 };
  }
  if (period === "24h") {
    const start = Math.floor((now - DAY) / HOUR) * HOUR;
    return { start, bucketMs: HOUR, count: 25 };
  }
  const days = Number(String(period).replace(/d$/i, "")) || 7;
  const start = localMidnight(now) - (days - 1) * DAY;
  if (days <= 3) return { start, bucketMs: 3 * HOUR, count: days * 8 };
  if (days <= 14) return { start, bucketMs: 6 * HOUR, count: days * 4 };
  return { start, bucketMs: DAY, count: days };
}

/**
 * Time series for the Usage chart.
 *
 * Every point carries its own timestamp so the chart can decide how to label
 * the axis — hours inside a day, day boundaries across several — rather than
 * receiving pre-formatted strings it cannot reason about.
 */
export async function chart(period = "7d") {
  const now = Date.now();
  const { start, bucketMs, count } = planBuckets(period, now);
  const end = start + count * bucketMs;

  const points = Array.from({ length: count }, (_, i) => ({
    ts: new Date(start + i * bucketMs).toISOString(),
    label: new Date(start + i * bucketMs).toISOString(),
    tokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    cost: 0,
    requests: 0,
  }));

  const rows = await getUsageHistory({ startDate: new Date(start).toISOString() });
  for (const row of rows) {
    const t = new Date(row.timestamp).getTime();
    if (!Number.isFinite(t) || t < start || t >= end) continue;
    const idx = Math.min(Math.floor((t - start) / bucketMs), count - 1);
    const r = describeRecord(row);
    const p = points[idx];
    p.promptTokens += r.promptTokens;
    p.completionTokens += r.completionTokens;
    p.tokens += r.promptTokens + r.completionTokens;
    p.cost += r.cost;
    p.requests += 1;
  }

  return {
    period,
    bucketMs,
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    points,
  };
}

export async function recent(limit = 20) {
  const history = await getUsageHistory({});
  const rows = history.slice(-limit).reverse().map(describeRecord);
  return {
    count: rows.length,
    estimatedCount: rows.filter((r) => r.estimated).length,
    records: rows,
  };
}

export async function latest() {
  const { records } = await recent(1);
  return records[0] || null;
}

export async function logs(limit = 50) {
  return await getRecentLogs(limit);
}

export async function details(filter = {}) {
  return await getRequestDetails(filter);
}

export async function detailById(id) {
  return await getRequestDetailById(id);
}
