/**
 * Thin client for the OptiAI backend.
 *
 * 127.0.0.1 rather than localhost: the backend binds IPv4 by default and on
 * Windows "localhost" can resolve to ::1 first, which would fail to connect.
 */
import type { ContentPart } from "./attachments";
import type {
  ApiKey,
  ChatMessage,
  CliConfig,
  CliTool,
  Combo,
  Connection,
  HealthStatus,
  Model,
  ModelTestResponse,
  ModelTestsResponse,
  OAuthStart,
  OptimizerFilter,
  PromptTrace,
  Provider,
  RecentUsageResponse,
  TestedModelsResponse,
  TraceSummary,
  UsageChartResponse,
  UsageStats,
  NetworkCheck,
  NetworkTopology,
  AiAnalysis,
  AiOptifyResult,
  AiRankResult,
  SkillDefinition,
  SkillDetail,
  SkillInfluence,
  SkillsResponse,
  SkillSyncResult,
  SkillTargetsResponse,
} from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:20180";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * A failed chat turn still has a trace on the server, so the id is carried on
 * the error — a failure is one of the more useful things to be able to look up.
 */
export class ChatError extends ApiError {
  promptId?: string;
  constructor(message: string, status: number, promptId?: string) {
    super(message, status);
    this.name = "ChatError";
    this.promptId = promptId;
  }
}

/** `body` is widened to `unknown` and JSON-encoded here, so callers pass plain objects. */
type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

/**
 * Pulls a readable message out of an error body.
 *
 * Providers disagree on the shape: OpenAI-compatible ones nest it as
 * `{error:{message}}`, others return `{error:"..."}`, and some only set
 * `message`. Reading `.error` blindly and assigning an object to a string field
 * is what rendered "[object Object]" in the chat transcript instead of the
 * provider's actual complaint.
 */
function errorMessageFrom(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (!payload || typeof payload !== "object") return fallback;

  const body = payload as { error?: unknown; message?: unknown };
  const candidates: unknown[] = [body.error, body.message];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (candidate && typeof candidate === "object") {
      const nested = (candidate as { message?: unknown }).message;
      if (typeof nested === "string" && nested.trim()) return nested;
    }
  }
  return fallback;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, ...rest } = options;
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...rest,
    headers: { "content-type": "application/json", ...(rest.headers || {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    throw new ApiError(
      errorMessageFrom(parsed, `Request failed (HTTP ${res.status})`),
      res.status
    );
  }
  return parsed as T;
}

/* -- Health ---------------------------------------------------------------- */

export const getHealth = () => request<HealthStatus>("/health");

/* -- Providers ------------------------------------------------------------- */

export const getProviders = () => request<Provider[]>("/providers");
export const getConnections = () => request<Connection[]>("/providers/connections");

export const validateCredentials = (body: { provider: string; apiKey: string }) =>
  request<{ valid: boolean; error?: string; models?: string[] }>("/providers/validate", {
    method: "POST",
    body,
  });

/** Persists an API-key connection. This is the route that was missing before. */
export const createConnection = (body: {
  provider: string;
  apiKey: string;
  name?: string;
  baseUrl?: string;
  projectId?: string;
  region?: string;
}) => request<Connection>("/providers/connections", { method: "POST", body });

export const setConnectionActive = (id: string, isActive: boolean) =>
  request<Connection>(`/providers/connections/${id}`, { method: "PATCH", body: { isActive } });

export const testConnection = (id: string) =>
  request<{ valid?: boolean; ok?: boolean; error?: string; latencyMs?: number }>(
    `/providers/${id}/test`,
    { method: "POST" }
  );

export const deleteConnection = (id: string) =>
  request<{ ok: boolean }>(`/providers/connections/${id}`, { method: "DELETE" });

/* -- OAuth ----------------------------------------------------------------- */

export const startOAuth = (provider: string, redirectUri?: string) =>
  request<OAuthStart>(
    `/oauth/${encodeURIComponent(provider)}/authorize${
      redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : ""
    }`
  );

/** `code` accepts a bare code or the whole pasted callback URL. */
export const exchangeOAuth = (
  provider: string,
  body: { code: string; redirectUri?: string; codeVerifier?: string; state?: string }
) => request<Connection>(`/oauth/${encodeURIComponent(provider)}/exchange`, { method: "POST", body });

export const pollOAuth = (
  provider: string,
  body: { deviceCode: string; codeVerifier?: string }
) =>
  request<{ success: boolean; pending?: boolean; error?: string; connection?: Connection }>(
    `/oauth/${encodeURIComponent(provider)}/poll`,
    { method: "POST", body }
  );

/* -- Models ---------------------------------------------------------------- */

/** Omit `provider` to get every model across all supported providers in one call. */
export const getModels = (provider?: string) =>
  request<{ provider?: string; models: Model[] }>(
    `/models${provider ? `?provider=${encodeURIComponent(provider)}` : ""}`
  );
export const getModelAvailability = () => request<unknown>("/models/availability");
export const getCombos = () => request<Combo[]>("/models/combos");
export const createCombo = (body: { name: string; models?: string[]; kind?: string | null }) =>
  request<Combo>("/models/combos", { method: "POST", body });
export const updateCombo = (id: string, body: Partial<Combo>) =>
  request<Combo>(`/models/combos/${encodeURIComponent(id)}`, { method: "PUT", body });
export const deleteCombo = (id: string) =>
  request<{ ok: boolean }>(`/models/combos/${encodeURIComponent(id)}`, { method: "DELETE" });
export const getConnectionModels = (id: string) =>
  request<{ models: Model[] }>(`/connections/${id}/models`);

/**
 * Pings each model through the real pipeline. Omit `models` to test the whole
 * catalog. Slow by nature — every model is a live upstream request.
 */
export const testModels = (connectionId: string, models?: string[]) =>
  request<ModelTestResponse>(`/connections/${connectionId}/test-models`, {
    method: "POST",
    body: { models },
  });

/** Same test, keyed on provider — for no-auth providers that have no connection. */
export const testProviderModels = (providerId: string, models?: string[]) =>
  request<ModelTestResponse>(`/providers/${encodeURIComponent(providerId)}/test-models`, {
    method: "POST",
    body: { models },
  });

/**
 * The only models the chat composer offers: provider connected, last test clean.
 * Untested and failing models are absent — the picker says so rather than
 * listing something that would fail on send.
 */
export const getTestedModels = () => request<TestedModelsResponse>("/models/tested");

/** Stored test verdicts for one provider, so results survive a page reload. */
export const getModelTests = (providerId: string) =>
  request<ModelTestsResponse>(`/models/tests/${encodeURIComponent(providerId)}`);

/* -- Usage ----------------------------------------------------------------- */

export const getUsageStats = (period = "today") =>
  request<UsageStats>(`/usage/stats?period=${encodeURIComponent(period)}`);
export const getUsageChart = (period = "7d") =>
  request<UsageChartResponse>(`/usage/chart?period=${encodeURIComponent(period)}`);

/* -- OptiAI thinking ------------------------------------------------------- */

/** Rank a candidate list against a sentence — the Models and Skills AI search. */
export const aiRank = (body: {
  query: string;
  candidates: { id: string; name?: string; description?: string }[];
  limit?: number;
  context?: string;
}) => request<AiRankResult>("/ai/rank", { method: "POST", body });

/** Scope a project from its title/description. */
export const aiOptify = (body: {
  title: string;
  description: string;
  models: { id: string; name?: string; provider?: string; description?: string }[];
  skills: { id: string; name: string; kind: string; summary?: string }[];
}) => request<AiOptifyResult>("/ai/optify", { method: "POST", body });

/** A fresh model-written review of a period's usage. */
export const aiAnalyze = (period: string) =>
  request<AiAnalysis>("/ai/analyze", { method: "POST", body: { period } });
export const getLastAnalysis = (period: string) =>
  request<AiAnalysis | null>(`/ai/analyze?period=${encodeURIComponent(period)}`);

/* -- Network map ----------------------------------------------------------- */

/** Every provider OptiAI can route to right now, with stored health only. */
export const getNetwork = () => request<NetworkTopology>("/network");
/** Probe one provider for real — every key, or one completion for no-auth ones. */
export const checkNetworkProvider = (providerId: string) =>
  request<NetworkCheck>(`/network/check/${encodeURIComponent(providerId)}`, { method: "POST" });
/**
 * Returns an envelope, not an array — `estimatedCount` says how many of these
 * rows carry guessed token counts. Typing this as `UsageRecord[]` was why the
 * Usage → Details table rendered nothing.
 */
export const getRecentUsage = (limit = 20) =>
  request<RecentUsageResponse>(`/usage/recent?limit=${limit}`);
export const getUsageDetails = () => request<unknown[]>("/usage/details");

/* -- Traces ---------------------------------------------------------------- */

/** One row per prompt sent through the chat UI, newest first. */
export const getTraces = (limit = 50, threadId?: string) =>
  request<PromptTrace[]>(
    `/usage/traces?limit=${limit}${threadId ? `&threadId=${encodeURIComponent(threadId)}` : ""}`
  );
export const getTraceSummary = () => request<TraceSummary>("/usage/traces/summary");
export const getTrace = (promptId: string) =>
  request<PromptTrace>(`/usage/traces/${encodeURIComponent(promptId)}`);

/* -- Pricing --------------------------------------------------------------- */

export const getPricing = (provider: string, model: string) =>
  request<{ input?: number; output?: number; cached?: number }>(
    `/pricing/${encodeURIComponent(provider)}/${encodeURIComponent(model)}`
  );
export const calculateCost = (body: { provider: string; model: string; tokens: unknown }) =>
  request<{ cost: number }>("/pricing/calculate", { method: "POST", body });

/* -- Optimizer (9Router RTK) ----------------------------------------------- */

export const getOptimizerFilters = () => request<OptimizerFilter[]>("/optimizer/filters");
export const compressText = (text: string, filter = "auto") =>
  request<{ output: string; before: number; after: number; filter: string }>(
    "/optimizer/compress",
    { method: "POST", body: { text, filter } }
  );

/* -- CLI ------------------------------------------------------------------- */

export const getCliTools = () => request<CliTool[]>("/cli/tools");
export const getCliConfig = (tool: string) =>
  request<CliConfig>(`/cli/config?tool=${encodeURIComponent(tool)}`);
export const getApiKeys = () => request<ApiKey[]>("/cli/keys");
export const createApiKey = (name?: string) =>
  request<ApiKey>("/cli/keys", { method: "POST", body: { name } });
export const deleteApiKey = (id: string) =>
  request<{ ok: boolean }>(`/cli/keys/${id}`, { method: "DELETE" });

/* -- Export ---------------------------------------------------------------- */

/**
 * Renders Markdown to a PDF on the backend and returns the file.
 *
 * Not routed through `request()` because the response is binary; the error
 * path still speaks JSON, so failures are unwrapped the same way.
 */
export async function exportPdf(body: {
  markdown: string;
  title?: string;
  filename?: string;
  model?: string;
}): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/export/pdf`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const fallback = `Export failed (HTTP ${res.status})`;
    let message = fallback;
    try {
      message = errorMessageFrom(JSON.parse(text), fallback);
    } catch {
      if (text) message = text.slice(0, 300);
    }
    throw new ApiError(message, res.status);
  }
  return await res.blob();
}

/* -- Skills ---------------------------------------------------------------- */

export function listSkills() {
  return request<SkillsResponse>("/skills");
}

export function getSkill(id: string) {
  return request<SkillDetail>(`/skills/${encodeURIComponent(id)}`);
}

export function updateSkill(id: string, patch: { enabled?: boolean; influence?: SkillInfluence }) {
  return request<SkillDefinition>(`/skills/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
}

export function updateSkillSettings(patch: { chatApply?: boolean }) {
  return request<{ chatApply: boolean }>("/skills/settings", { method: "PATCH", body: patch });
}

export function skillTargets(projectDir?: string) {
  const qs = projectDir ? `?projectDir=${encodeURIComponent(projectDir)}` : "";
  return request<SkillTargetsResponse>(`/skills/targets${qs}`);
}

export function syncSkills(body: { tool: string; scope: "user" | "project"; projectDir?: string }) {
  return request<SkillSyncResult>("/skills/sync", { method: "POST", body });
}

export function uninstallSkills(body: { tool: string; scope: "user" | "project"; projectDir?: string }) {
  return request<{ tool: string; scope: string; root: string; removed: string[] }>("/skills/uninstall", {
    method: "POST",
    body,
  });
}

/* -- Chat ------------------------------------------------------------------ */

export interface ChatRequest {
  model: string;
  /**
   * `content` widens to an array for turns that carry an image: that is the
   * OpenAI content-block shape, and the router forwards the body as-is. Plain
   * turns stay a string so the common path — and the router's own usage
   * accounting, which reads `content.length` — is untouched.
   */
  messages: { role: ChatMessage["role"]; content: string | ContentPart[] }[];
  stream?: boolean;
  /** OptiAI-only correlation fields. Stripped server-side before 9Router sees the body. */
  threadId?: string;
  messageId?: string;
  mode?: string;
  /**
   * Which OptiAI skills to apply to this turn. `apply: false` sends none;
   * `ids` limits to a Project's picks; omitted means every enabled skill.
   */
  skills?: { apply?: boolean; ids?: string[] };
}

export interface ChatChunk {
  delta?: string;
  usage?: Record<string, number>;
  model?: string;
  /** Yielded once, first, as soon as the response headers land. */
  promptId?: string;
  /** Yielded with promptId: the skill ids the backend injected. */
  skills?: string[];
}

/**
 * Streams assistant tokens from the gateway.
 *
 * The first yield carries `promptId` — the backend's id for this turn, read off
 * the `x-optiai-prompt-id` header. It arrives before any content, so the caller
 * can label the message even if the stream later fails. After that, yields
 * `{ delta }` for content and `{ usage }` when the provider reports one.
 */
export async function* streamChat(
  body: ChatRequest,
  signal?: AbortSignal
): AsyncGenerator<ChatChunk> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, stream: true }),
    signal,
  });

  const promptId = res.headers.get("x-optiai-prompt-id") || undefined;
  const appliedSkills = (res.headers.get("x-optiai-skills") || "").split(",").filter(Boolean);

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    const fallback = `Chat failed (HTTP ${res.status})`;
    let message = fallback;
    try {
      message = errorMessageFrom(JSON.parse(text), fallback);
    } catch {
      if (text) message = text.slice(0, 300);
    }
    throw new ChatError(message, res.status, promptId);
  }

  if (promptId) yield { promptId, skills: appliedSkills };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;

      let json: unknown;
      try {
        json = JSON.parse(payload);
      } catch {
        /* keep-alive comments and partial frames are expected; skip them */
        continue;
      }

      const frame = json as {
        error?: unknown;
        usage?: Record<string, number>;
        model?: string;
        choices?: { delta?: { content?: string } }[];
      };

      // A provider can fail after the headers said 200 — a fallback chain
      // exhausting itself, a mid-stream rate limit. Without this the transcript
      // just stops with a blank answer and no reason given.
      if (frame.error) {
        throw new ChatError(
          errorMessageFrom(frame, "The provider ended the stream with an error"),
          res.status,
          promptId
        );
      }

      // The gateway speaks OpenAI chunk format regardless of upstream provider.
      const delta = frame.choices?.[0]?.delta?.content;
      if (delta) yield { delta, model: frame.model };
      if (frame.usage) yield { usage: frame.usage, model: frame.model };
    }
  }
}
