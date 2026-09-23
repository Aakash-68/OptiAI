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

export async function chart(period = "7d") {
  return await getChartData(period);
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
