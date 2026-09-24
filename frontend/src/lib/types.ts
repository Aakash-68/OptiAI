/**
 * Shapes returned by the OptiAI backend (backend/api/index.js).
 *
 * Anything in this file maps to a real endpoint. Types for screens that are not
 * backed by the API yet live in `src/lib/mock/` instead, so the boundary between
 * "wired up" and "not wired up yet" stays obvious.
 */

export type AuthType = "oauth" | "apikey" | "none";

/**
 * Providers come from the backend's supported list
 * (backend/config/providers.js), not from the raw 9Router registry.
 */
export interface Provider {
  id: string;
  name: string;
  /** One-line description shown on the provider card. */
  tagline?: string;
  docsUrl?: string | null;
  /** Example of what the credential looks like, e.g. "sk-ant-…". */
  keyFormat?: string | null;
  category: "oauth" | "apikey" | "other";
  authType: AuthType;
  /** Some providers accept both — xAI is OAuth-capable but API key is preferred.
   *  "none" means no credential is used at all. */
  authModes: ("apikey" | "oauth" | "none")[];
  /** Azure names models after your own deployments, so the catalog is empty. */
  modelsAreDeployments?: boolean;
  /** True when the provider needs no credential at all (OpenCode Free). */
  noAuth?: boolean;
  /**
   * Set for providers that reuse a consumer/IDE OAuth session rather than a
   * licensed API credential. Text comes from the upstream registry verbatim.
   */
  riskNotice?: string | null;
  modelCount: number;
  connections: number;
  inRegistry?: boolean;
}

export interface Connection {
  id: string;
  provider: string;
  authType: AuthType | "access_token";
  name?: string | null;
  email?: string | null;
  priority?: number | null;
  isActive?: boolean;
  testStatus?: "unknown" | "active" | "invalid" | string;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastError?: string | null;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  hasAccessToken?: boolean;
  hasApiKey?: boolean;
}

/** Result of pinging one model through the real routing pipeline. */
export interface ModelTestResult {
  modelId: string;
  name: string;
  ok: boolean;
  latencyMs?: number;
  status?: number;
  error?: string;
  /**
   * The API key that actually answered.
   *
   * The router tries each key for a provider and stops at the first that
   * works, so on a provider with several keys the verdict belongs to whichever
   * one passed — not the connection the test was launched from. Null on a
   * failure, because no key served it.
   */
  connectionId?: string | null;
  connectionName?: string | null;
}

export interface ModelTestResponse {
  provider: string;
  connectionId: string;
  /** Set when the run was persisted — verdicts survive a reload from here on. */
  testedAt?: string;
  results: ModelTestResult[];
}

/**
 * A model the chat composer is allowed to offer: its provider is connected and
 * the model itself last tested clean. Anything untested or failing is absent by
 * design — see GET /api/models/tested.
 */
export interface TestedModel {
  /** The catalog id, for display. May itself contain a slash (e.g. "nvidia/nemotron-…"). */
  id: string;
  /**
   * What must be sent as `model`: provider alias + catalog id. The router reads
   * the first path segment as the provider and strips it, so a vendor-qualified
   * catalog id needs the alias in front of it or the provider receives a name
   * it does not have.
   */
  value: string;
  name: string;
  provider: string;
  providerName: string;
  latencyMs?: number | null;
  testedAt: string;
}

export interface TestedModelsResponse {
  models: TestedModel[];
  connectedProviders: string[];
}

/** Stored verdicts for one provider, keyed by model id. */
export interface ModelTestsResponse {
  provider: string;
  results: Record<string, ModelTestResult & { testedAt?: string }>;
}

/** Shape returned by GET /api/oauth/:provider/authorize. */
export interface OAuthStart {
  flowType: "authorization_code" | "authorization_code_pkce" | "device_code" | string;
  redirectUri?: string;
  /** Present for redirect flows. */
  authUrl?: string;
  authorizeUrl?: string;
  state?: string;
  codeVerifier?: string;
  codeChallenge?: string;
  /** Present for device-code flows. */
  deviceCode?: string;
  userCode?: string;
  verificationUri?: string;
  verificationUriComplete?: string;
  interval?: number;
  expiresIn?: number;
}

export interface Model {
  id: string;
  name?: string;
  provider?: string;
  contextLength?: number;
  capabilities?: string[];
  /** Populated from /api/pricing when available; USD per 1M tokens. */
  inputPrice?: number;
  outputPrice?: number;
}

export interface Combo {
  id: string;
  name: string;
  kind?: string;
  models: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface HealthStatus {
  ok: boolean;
  backend: string;
  database: { connected: boolean; driver: string; dataDir: string };
  router: { loaded: boolean; version: string; providers: number };
  checkedInMs: number;
}

/**
 * GET /api/usage/stats.
 *
 * The totals are prefixed `total…` upstream. Reading them as `promptTokens` —
 * the name used on the per-bucket objects below — is why every KPI except
 * "Total requests" rendered as zero.
 */
export interface UsageStats {
  totalRequests?: number;
  totalPromptTokens?: number;
  totalCompletionTokens?: number;
  totalCachedTokens?: number;
  totalCost?: number;
  byProvider?: Record<string, UsageBucket>;
  byModel?: Record<string, UsageBucket>;
  byAccount?: Record<string, UsageBucket>;
  byApiKey?: Record<string, UsageBucket>;
  byEndpoint?: Record<string, UsageBucket>;
}

/**
 * One aggregation bucket.
 *
 * Keys are composite and not meant for display — `byModel` is keyed
 * `"<model> (<provider>)"` and `byEndpoint` `"<endpoint>|<model>|<provider>"`.
 * The readable parts are carried on the bucket itself, so render those.
 */
export interface UsageBucket {
  requests?: number;
  promptTokens?: number;
  completionTokens?: number;
  cachedTokens?: number;
  cost?: number;
  /** The model id without the provider suffix baked into the key. */
  rawModel?: string;
  provider?: string;
  /** Present on byEndpoint buckets. */
  endpoint?: string;
  lastUsed?: string;
}

/**
 * One bucket of GET /api/usage/chart. `ts` is the bucket start, so the chart
 * can decide how to label the axis itself (hours inside a day, day boundaries
 * across several) rather than trusting a pre-formatted string.
 */
export interface UsageChartPoint {
  ts: string;
  label: string;
  /** Prompt + completion, already added together upstream. */
  tokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  cost?: number;
  requests?: number;
}

export interface UsageChartResponse {
  period: string;
  /** Width of one bucket in milliseconds — 1h, 3h, 6h or a day. */
  bucketMs: number;
  start: string;
  end: string;
  points: UsageChartPoint[];
}

/* -- Network map ----------------------------------------------------------- */

export type NetworkStatus = "ok" | "error" | "unknown";

export interface NetworkConnection {
  id: string;
  name: string;
  authType: string;
  isActive: boolean;
  testStatus: string;
  lastError?: string | null;
  lastTested?: string | null;
  lastUsedAt?: string | null;
}

/** One reachable provider on the map — connected, or needing no credential. */
export interface NetworkNode {
  id: string;
  name: string;
  noAuth: boolean;
  /** Stored evidence only; a live check replaces it. */
  status: NetworkStatus;
  connections: NetworkConnection[];
  modelCount: number;
  testedModels: number;
  okModels: number;
  lastTestedAt?: string | null;
  lastUsedAt?: string | null;
  recentRequests: number;
}

export interface NetworkTopology {
  nodes: NetworkNode[];
  checkedAt: string;
}

/** POST /api/network/check/:provider — a live probe of one provider. */
export interface NetworkCheck {
  provider: string;
  ok: boolean;
  error?: string | null;
  /** Set for no-auth providers, which prove the route with one real completion. */
  probedModel?: string;
  connections: { id: string; name: string; ok: boolean; error?: string | null; latencyMs?: number | null }[];
  latencyMs: number;
}

export interface UsageRecord {
  id?: number | string;
  timestamp: string;
  provider?: string | null;
  model?: string | null;
  connectionId?: string | null;
  endpoint?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cachedTokens?: number;
  reasoningTokens?: number;
  cost?: number;
  status?: string;
  /** "reported" when the provider returned a usage object, "estimated" when 9Router guessed. */
  tokenSource?: "reported" | "estimated";
  estimated?: boolean;
  /** Raw provider usage blob — holds cached/reasoning token counts. */
  tokens?: Record<string, number> | null;
}

/** GET /api/usage/recent — an envelope, not a bare array. */
export interface RecentUsageResponse {
  count: number;
  /** How many of these rows carry guessed rather than provider-reported counts. */
  estimatedCount: number;
  records: UsageRecord[];
}

/**
 * One prompt, from send to completion.
 *
 * `promptId` is minted by the backend before the request leaves OptiAI and is
 * returned on the `x-optiai-prompt-id` response header, so the same id labels
 * the transcript message and the Usage row.
 */
export interface PromptTrace {
  promptId: string;
  threadId?: string | null;
  messageId?: string | null;
  createdAt: string;
  completedAt?: string | null;
  status: "pending" | "ok" | "error" | "aborted" | string;
  error?: string | null;
  source?: string | null;
  mode?: string | null;
  requestedModel?: string | null;
  resolvedModel?: string | null;
  provider?: string | null;
  promptChars: number;
  turnCount: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  cost: number;
  estimated: boolean;
  tokenSource: "reported" | "estimated";
  ttftMs?: number | null;
  latencyMs?: number | null;
}

export interface TraceSummary {
  prompts: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cost: number;
  avgLatencyMs: number;
  estimatedCount: number;
}

export interface CliTool {
  id: string;
  name: string;
  description?: string;
  /** Env vars the tool reads, e.g. ANTHROPIC_BASE_URL. */
  env?: Record<string, string>;
  configFile?: string;
  configType?: "env" | "guide" | "custom" | "mitm";
  /** Brand colour declared in the CLI tool constants. */
  color?: string | null;
  image?: string | null;
  requiresExternalUrl?: boolean;
  supported?: boolean;
  /**
   * Whether this tool is currently pointed at this OptiAI instance.
   *
   * `null` means OptiAI has no probe for that tool — not that it is
   * unconfigured. The two must render differently: claiming "not configured"
   * from an unchecked tool is a statement we have not earned.
   */
  configured?: boolean | null;
  /** Where the answer came from, e.g. "~/.claude/settings.json". */
  configPath?: string | null;
  /** The endpoint actually found there, when there was one. */
  pointsAt?: string | null;
}

export interface CliConfig {
  tool: string;
  gateway: string;
  apiKeyPresent: boolean;
  snippet: { file: string; content: unknown };
  writeSupported: boolean;
  note?: string;
}

export interface ApiKey {
  id: string;
  key: string;
  name?: string | null;
  createdAt?: string;
  isActive?: boolean | number;
}

export interface OptimizerFilter {
  id: string;
  name?: string;
  description?: string;
}

/** One message in a chat thread. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  /** Per-response telemetry, mirrored from what the backend records in usageHistory. */
  meta?: {
    model?: string;
    provider?: string;
    promptTokens?: number;
    completionTokens?: number;
    cost?: number;
    latencyMs?: number;
    fellBackFrom?: string[];
    error?: string;
    /**
     * The backend's id for this turn. Ties the message to its row in Usage →
     * Prompts and to everything recorded server-side about the request.
     */
    promptId?: string;
    /**
     * Set on a user turn that OptiAI wrote, not the person — the refined
     * prompt produced by Ask with Prompt mode off. Marked so the transcript
     * never passes OptiAI's words off as the user's.
     */
    refined?: boolean;
  };
  createdAt: string;
}

export interface ChatThread {
  id: string;
  title: string;
  projectId?: string | null;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Chat vs Ask.
 *  - chat: the message goes to the selected model as-is.
 *  - ask:  OptiAI works on the prompt itself (improve / critique / suggest a model)
 *          instead of answering it.
 */
export type ChatMode = "chat" | "ask";

/* -- OptiAI thinking ------------------------------------------------------- */

export interface AiRankResult {
  model: string;
  modelName?: string;
  results: { id: string; reason: string }[];
}

export interface AiOptifyResult {
  model: string;
  modelName?: string;
  models: string[];
  skills: string[];
  plugins: string[];
  reason: string;
}

export interface AiAnalysis {
  period: string;
  model: string;
  modelName?: string;
  evaluatedAt: string;
  summary: string;
  findings: { title: string; detail: string; severity: "info" | "warn" | "high" }[];
  suspicious: {
    promptId: string;
    reason: string;
    model?: string | null;
    inputTokens: number;
    outputTokens: number;
    status: string;
    why: string;
  }[];
  scores: { efficiency: number | null; modelFit: number | null; promptCraft: number | null } | null;
}
