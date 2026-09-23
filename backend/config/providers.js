/**
 * The OptiAI supported provider set.
 *
 * OptiAI targets companies, so this list is deliberately restricted to
 * first-party model labs, the two enterprise cloud paths (Azure OpenAI, Google
 * Vertex) and the production-grade aggregation gateways. Every entry is reached
 * with a **licensed API credential**, with one explicit exception: entries
 * marked `subscriptionAuth` reuse an IDE/consumer OAuth session instead, and
 * carry the upstream risk notice through to the UI.
 *
 * Still excluded: the rest of the subscription-proxy providers (Claude Code,
 * Codex, Cursor, Copilot, Kiro, Windsurf, Trae, Zed …), plus every non-chat
 * modality, since TTS/STT/image/video handlers were not extracted.
 *
 * This file is the single source of truth. `services/providers.js` and
 * `services/models.js` filter every catalog response through it, so nothing
 * outside this list is reachable through the API — no route will list it,
 * return models for it, or open an auth flow for it.
 *
 * The underlying 9Router registry still carries all 123 provider files on disk.
 * That is intentional: `open-sse/providers/registry/index.js` imports every one
 * of them, so deleting files breaks the registry, and keeping the tree
 * byte-identical is what makes re-syncing an upstream fix a file copy. Adding a
 * provider back is a one-line change here.
 */

/** @typedef {"apikey"|"oauth"} SupportedAuth */

export const SUPPORTED_PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    tagline: "GPT-5 series, o-series reasoning models and embeddings, direct from OpenAI.",
    docsUrl: "https://platform.openai.com/api-keys",
    keyFormat: "sk-…",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    tagline: "Claude Opus, Sonnet and Haiku through the first-party Anthropic API.",
    docsUrl: "https://console.anthropic.com/settings/keys",
    keyFormat: "sk-ant-…",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    tagline: "Gemini Pro and Flash via Google AI Studio keys.",
    docsUrl: "https://aistudio.google.com/app/apikey",
    keyFormat: "AIza…",
  },
  {
    id: "vertex",
    name: "Google Vertex AI",
    tagline: "Gemini on GCP with your own project, region and IAM controls.",
    docsUrl: "https://console.cloud.google.com/vertex-ai",
    keyFormat: "service account JSON or access token",
  },
  {
    id: "azure",
    name: "Azure OpenAI",
    tagline: "OpenAI models inside your Azure tenant, billed and governed by Microsoft.",
    docsUrl: "https://portal.azure.com",
    keyFormat: "32-char resource key",
    /** Models are deployment names you choose, so the static catalog is empty by design. */
    modelsAreDeployments: true,
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    tagline: "Grok 4 family, including the fast reasoning and code variants.",
    docsUrl: "https://console.x.ai",
    keyFormat: "xai-…",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    tagline: "Mistral Large, Medium and Codestral — EU-hosted.",
    docsUrl: "https://console.mistral.ai/api-keys",
    keyFormat: "…",
  },
  {
    id: "cohere",
    name: "Cohere",
    tagline: "Command models and best-in-class embeddings for RAG.",
    docsUrl: "https://dashboard.cohere.com/api-keys",
    keyFormat: "…",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    tagline: "DeepSeek V4 chat and reasoning models at very low cost per token.",
    docsUrl: "https://platform.deepseek.com/api_keys",
    keyFormat: "sk-…",
  },
  {
    id: "groq",
    name: "Groq",
    tagline: "Open-weight models on LPUs — the lowest latency option here.",
    docsUrl: "https://console.groq.com/keys",
    keyFormat: "gsk_…",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    tagline: "Llama, Qwen and GPT-OSS at wafer-scale inference speed.",
    docsUrl: "https://cloud.cerebras.ai/platform",
    keyFormat: "csk-…",
  },
  {
    id: "together",
    name: "Together AI",
    tagline: "Hosted open-weight models with dedicated-endpoint options.",
    docsUrl: "https://api.together.xyz/settings/api-keys",
    keyFormat: "…",
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    tagline: "Fast open-weight serving with fine-tuning and LoRA support.",
    docsUrl: "https://fireworks.ai/account/api-keys",
    keyFormat: "fw_…",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    tagline: "Sonar models with live web grounding and citations.",
    docsUrl: "https://www.perplexity.ai/settings/api",
    keyFormat: "pplx-…",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    tagline: "One key across hundreds of models — useful as a universal fallback.",
    docsUrl: "https://openrouter.ai/keys",
    keyFormat: "sk-or-…",
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    tagline: "Nemotron, DeepSeek and Llama on NVIDIA-optimized inference microservices.",
    docsUrl: "https://build.nvidia.com",
    keyFormat: "nvapi-…",
  },
  {
    id: "opencode",
    name: "OpenCode Free",
    tagline: "Free community models — no key, no account. Pick a model and send.",
    docsUrl: "https://opencode.ai",
    /**
     * Genuinely no-auth: the upstream sends `Authorization: Bearer public`.
     * 9Router injects a virtual "noauth" connection for these providers
     * (src/sse/services/auth.js), so no connection row is ever read — which is
     * why this provider needs zero setup and cannot hold multiple accounts.
     */
    noAuth: true,
    /** `passthroughModels` upstream — any model id is forwarded, so Add Model works. */
    passthroughModels: true,
    /**
     * Verified 2026-09-18: OpenCode gates its free tier server-side and answers
     * router traffic with
     *   403 FreeTierError "OpenCode's free tier can only be used from within OpenCode".
     * The wiring here is correct — the request reaches them and their real error
     * comes back — but the tier is not usable through a proxy by design.
     */
    notice:
      "OpenCode blocks free-tier use from outside their own client. Requests routed through OptiAI currently return 403 FreeTierError. The integration is wired correctly; the restriction is enforced on OpenCode's side.",
  },
  {
    id: "antigravity",
    name: "Antigravity",
    tagline: "Gemini and Claude models through an Antigravity IDE session.",
    docsUrl: "https://antigravity.google",
    /**
     * Added on request. Unlike everything above it, this is not a licensed API
     * credential — it reuses an IDE's OAuth session, which the upstream registry
     * flags with a risk notice. The UI surfaces that notice on the provider page
     * and in the connect dialog.
     */
    subscriptionAuth: true,
  },
];

export const SUPPORTED_PROVIDER_IDS = SUPPORTED_PROVIDERS.map((p) => p.id);

const BY_ID = new Map(SUPPORTED_PROVIDERS.map((p) => [p.id, p]));

export function isSupportedProvider(id) {
  return BY_ID.has(id);
}

export function getSupportedProvider(id) {
  return BY_ID.get(id) || null;
}

/** Thrown shape used by the API layer to 404 an unsupported provider consistently. */
export function assertSupported(id) {
  if (!isSupportedProvider(id)) {
    const error = new Error(
      `Provider "${id}" is not supported by OptiAI. Supported: ${SUPPORTED_PROVIDER_IDS.join(", ")}`
    );
    error.status = 404;
    throw error;
  }
}
