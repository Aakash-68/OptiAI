/**
 * Per-prompt tracing.
 *
 * 9Router records usage keyed on (timestamp, provider, model) — enough to bill
 * against, not enough to answer "what happened to *this* prompt". This module
 * mints one id per prompt before the request leaves OptiAI, writes a row when it
 * starts, and closes that row when the stream ends.
 *
 * The id is returned to the browser in the `x-optiai-prompt-id` response header
 * and carried on the assistant message, so the same handle identifies the turn
 * in the transcript, in Usage, and in anything built on top later.
 *
 * Nothing under backend/9router is touched: token counts are read off the wire
 * as the response streams past (see `observeChunk`), and cost is computed with
 * the same pricing module 9Router itself uses.
 */
import { randomUUID } from "crypto";
import { getStore } from "./store.js";
import { calculate } from "./pricing.js";

/**
 * `opt_` prefix so the id is recognisable in a log line next to provider ids,
 * and time-ordered so a raw sort is chronological.
 */
export function newPromptId() {
  return `opt_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
}

function providerOf(model) {
  if (typeof model !== "string") return null;
  // Models are addressed `alias/model-id` through the router; anything without a
  // slash came back resolved by the provider itself.
  const slash = model.indexOf("/");
  return slash > 0 ? model.slice(0, slash) : null;
}

export async function begin({
  promptId,
  threadId,
  messageId,
  requestedModel,
  provider,
  promptChars = 0,
  turnCount = 0,
  mode,
  source = "chat",
  skills = [],
}) {
  const db = await getStore();
  db.run(
    `INSERT INTO optiai_traces
       (promptId, threadId, messageId, createdAt, status, source, mode,
        requestedModel, provider, promptChars, turnCount, skills)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(promptId) DO NOTHING`,
    [
      promptId,
      threadId || null,
      messageId || null,
      new Date().toISOString(),
      source,
      mode || null,
      requestedModel || null,
      provider || providerOf(requestedModel),
      promptChars,
      turnCount,
      Array.isArray(skills) && skills.length ? skills.join(",") : null,
    ]
  );
  return promptId;
}

/**
 * Accumulator for what the response stream reveals.
 *
 * Both the SSE path and the JSON path hand chunks here rather than each growing
 * its own parser. Only the fields OptiAI actually stores are pulled out; the
 * bytes themselves are passed through to the client untouched.
 */
export function createCollector() {
  return {
    firstChunkAt: null,
    resolvedModel: null,
    usage: null,
    finishReason: null,
    /** The provider's own error text, when the body carried one. */
    errorMessage: null,
  };
}

/**
 * Normalizes the several shapes an error body arrives in.
 *
 * OpenAI-compatible providers nest it as `{error:{message}}`, some return
 * `{error:"..."}`, and 9Router sometimes adds a bare `message`. Collapsing them
 * here is what lets the trace store the real reason instead of "HTTP 503".
 */
export function extractErrorMessage(payload) {
  if (!payload || typeof payload !== "object") return null;
  const e = payload.error ?? payload;
  if (typeof e === "string") return e;
  if (typeof e?.message === "string") return e.message;
  if (typeof payload.message === "string") return payload.message;
  return null;
}

/** Feed one decoded SSE `data:` payload (or a whole JSON body) to the collector. */
export function observeChunk(collector, json) {
  if (!json || typeof json !== "object") return;
  if (collector.firstChunkAt === null) collector.firstChunkAt = Date.now();
  if (json.model && !collector.resolvedModel) collector.resolvedModel = json.model;

  // Providers report usage on the final chunk, but some repeat it on every one —
  // last write wins, which is the complete object either way.
  if (json.usage && typeof json.usage === "object") collector.usage = json.usage;

  const message = extractErrorMessage(json);
  if (message) collector.errorMessage = message;

  const finish = json.choices?.[0]?.finish_reason;
  if (finish) collector.finishReason = finish;
}

/**
 * Scans a raw SSE text fragment for `data:` lines and feeds each to the collector.
 * Returns the trailing partial line, which the caller must prepend to the next
 * fragment — chunk boundaries do not respect line boundaries.
 */
export function observeSseText(collector, text, carry = "") {
  const buffer = carry + text;
  const lines = buffer.split("\n");
  const remainder = lines.pop() ?? "";

  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      observeChunk(collector, JSON.parse(payload));
    } catch {
      /* keep-alive comments and partial frames are expected */
    }
  }
  return remainder;
}

function normalizeUsage(usage = {}) {
  const input = usage.prompt_tokens ?? usage.input_tokens ?? 0;
  const output = usage.completion_tokens ?? usage.output_tokens ?? 0;
  const cached =
    usage.cached_tokens ??
    usage.cache_read_input_tokens ??
    usage.prompt_tokens_details?.cached_tokens ??
    0;
  const reasoning =
    usage.reasoning_tokens ?? usage.completion_tokens_details?.reasoning_tokens ?? 0;
  return {
    input,
    output,
    cached,
    reasoning,
    total: usage.total_tokens ?? input + output,
    // 9Router sets this when it fell back to a chars/4 heuristic instead of a
    // provider-reported count. Surfaced rather than flattened, so a number the
    // UI shows is never silently a guess.
    estimated: usage.estimated === true,
  };
}

export async function complete({
  promptId,
  collector,
  startedAt,
  status = "ok",
  error = null,
  requestedModel,
}) {
  const db = await getStore();
  const finishedAt = Date.now();
  const tokens = normalizeUsage(collector?.usage || {});
  const resolvedModel = collector?.resolvedModel || requestedModel || null;
  const provider = providerOf(requestedModel) || providerOf(resolvedModel);

  // Prefer what the provider actually said over the bare status code. "HTTP 503"
  // is true but useless; "404 page not found" is what identifies the real fault.
  const reason =
    collector?.errorMessage && error
      ? `${error}: ${collector.errorMessage}`
      : collector?.errorMessage || error;

  let cost = 0;
  if (tokens.input || tokens.output) {
    try {
      const priced = await calculate({
        provider: provider || "unknown",
        model: resolvedModel || requestedModel || "unknown",
        tokens: collector?.usage || {},
      });
      cost = priced.cost || 0;
    } catch {
      // An unpriced model is not a failed request — the row still lands, with
      // cost 0, rather than the whole trace being lost to a pricing lookup.
      cost = 0;
    }
  }

  db.run(
    `UPDATE optiai_traces SET
       completedAt = ?, status = ?, error = ?, resolvedModel = ?, provider = COALESCE(provider, ?),
       inputTokens = ?, outputTokens = ?, cachedTokens = ?, reasoningTokens = ?, totalTokens = ?,
       cost = ?, estimated = ?, ttftMs = ?, latencyMs = ?
     WHERE promptId = ?`,
    [
      new Date(finishedAt).toISOString(),
      status,
      reason,
      resolvedModel,
      provider,
      tokens.input,
      tokens.output,
      tokens.cached,
      tokens.reasoning,
      tokens.total,
      cost,
      tokens.estimated ? 1 : 0,
      collector?.firstChunkAt ? collector.firstChunkAt - startedAt : null,
      finishedAt - startedAt,
      promptId,
    ]
  );

  return { promptId, status, tokens, cost, resolvedModel, reason, latencyMs: finishedAt - startedAt };
}

function toTrace(row) {
  return {
    promptId: row.promptId,
    threadId: row.threadId,
    messageId: row.messageId,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    status: row.status,
    error: row.error,
    source: row.source,
    mode: row.mode,
    requestedModel: row.requestedModel,
    resolvedModel: row.resolvedModel,
    provider: row.provider,
    promptChars: row.promptChars ?? 0,
    turnCount: row.turnCount ?? 0,
    inputTokens: row.inputTokens ?? 0,
    outputTokens: row.outputTokens ?? 0,
    cachedTokens: row.cachedTokens ?? 0,
    reasoningTokens: row.reasoningTokens ?? 0,
    totalTokens: row.totalTokens ?? 0,
    cost: row.cost ?? 0,
    estimated: row.estimated === 1,
    tokenSource: row.estimated === 1 ? "estimated" : "reported",
    ttftMs: row.ttftMs,
    latencyMs: row.latencyMs,
    skills: typeof row.skills === "string" && row.skills ? row.skills.split(",") : [],
  };
}

export async function list({ limit = 50, threadId } = {}) {
  const db = await getStore();
  const rows = threadId
    ? db.all(
        `SELECT * FROM optiai_traces WHERE threadId = ? ORDER BY createdAt DESC LIMIT ?`,
        [threadId, limit]
      )
    : db.all(`SELECT * FROM optiai_traces ORDER BY createdAt DESC LIMIT ?`, [limit]);
  return rows.map(toTrace);
}

export async function byId(promptId) {
  const db = await getStore();
  const row = db.get(`SELECT * FROM optiai_traces WHERE promptId = ?`, [promptId]);
  return row ? toTrace(row) : null;
}

/** Rollup over traced prompts — the chat-only slice of what Usage shows. */
export async function summary({ limit = 500 } = {}) {
  const db = await getStore();
  const row = db.get(
    `SELECT COUNT(*) AS prompts,
            COALESCE(SUM(inputTokens), 0)  AS inputTokens,
            COALESCE(SUM(outputTokens), 0) AS outputTokens,
            COALESCE(SUM(cachedTokens), 0) AS cachedTokens,
            COALESCE(SUM(cost), 0)         AS cost,
            COALESCE(AVG(latencyMs), 0)    AS avgLatencyMs,
            COALESCE(SUM(estimated), 0)    AS estimatedCount
       FROM (SELECT * FROM optiai_traces ORDER BY createdAt DESC LIMIT ?)`,
    [limit]
  );
  return {
    prompts: row?.prompts ?? 0,
    inputTokens: row?.inputTokens ?? 0,
    outputTokens: row?.outputTokens ?? 0,
    cachedTokens: row?.cachedTokens ?? 0,
    cost: row?.cost ?? 0,
    avgLatencyMs: Math.round(row?.avgLatencyMs ?? 0),
    estimatedCount: row?.estimatedCount ?? 0,
  };
}
