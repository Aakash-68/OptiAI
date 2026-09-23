/**
 * Indicative price and quality tags per model family.
 *
 * The catalog the providers serve carries ids, names and context windows but
 * no pricing, and `GET /api/pricing` only answers for one model at a time —
 * too many round trips to render a table of 100+ rows. So the numbers below
 * are published list prices, USD per 1M tokens, matched by id pattern.
 *
 * Treat them as indicative: they are a reference point for comparing models,
 * not a billing source. What you are actually charged comes from the usage
 * records the router writes per request, which are real. This file is the one
 * place to correct a rate — order matters, first match wins, so the more
 * specific pattern goes above the family it belongs to.
 *
 * Tags are capped at four by `factsFor`. More than that stops being a summary.
 */

/**
 * What a model can take in and put out, beyond plain text.
 *
 * `docs` is true for every text model, because OptiAI reads a text document
 * client-side and inlines it as context rather than handing the file to the
 * provider - so the answer is always yes, and the icon says so rather than
 * being conspicuously absent. (PDF and Office files are refused at the drop
 * handler; there is no extractor for them.)
 */
export type Capability = "docs" | "vision" | "audio" | "imagegen";

export const CAPABILITY_LABEL: Record<Capability, { on: string; off: string }> = {
  docs: {
    on: "Reads documents - text, code, CSV and JSON are inlined as context",
    off: "Cannot read documents",
  },
  vision: { on: "Reads images you attach", off: "Cannot read images" },
  audio: { on: "Accepts audio input", off: "Does not accept audio" },
  imagegen: { on: "Generates images", off: "Does not generate images" },
};

export interface ModelFacts {
  /** USD per 1M input tokens. */
  input: number;
  /** USD per 1M output tokens. */
  output: number;
  tags: string[];
  /** Beyond text. `docs` is implied and added by `factsFor`. */
  caps?: Capability[];
}

interface FactRule extends ModelFacts {
  pattern: RegExp;
}

/** The controlled tag vocabulary — keep new entries inside it. */
export const MODEL_TAGS = [
  "Frontier",
  "Reasoning",
  "Coding",
  "Vision",
  "Fast",
  "Cheap",
  "Long context",
  "Open weights",
  "Multilingual",
  "General",
] as const;

const RULES: FactRule[] = [
  // Image generation, audio and vision variants first: they are narrower than
  // the text families below and would otherwise be swallowed by them.
  { pattern: /dall-e|gpt-image|imagen|flux|stable-diffusion|sdxl|grok.*image/, input: 0, output: 0, tags: ["Frontier"], caps: ["imagegen"] },
  { pattern: /whisper|-audio|realtime|-tts|speech/, input: 0, output: 0, tags: ["Fast"], caps: ["audio"] },
  { pattern: /pixtral|llava|llama.*(scout|maverick)|gemma-?3|qwen.*-vl/, input: 0.3, output: 0.9, tags: ["Vision", "Open weights"], caps: ["vision"] },

  // Anthropic
  { pattern: /claude.*opus/, input: 15, output: 75, tags: ["Frontier", "Reasoning", "Coding"], caps: ["vision"] },
  { pattern: /claude.*sonnet/, input: 3, output: 15, tags: ["Coding", "Reasoning", "Vision"], caps: ["vision"] },
  { pattern: /claude.*haiku/, input: 1, output: 5, tags: ["Fast", "Cheap", "Vision"], caps: ["vision"] },

  // OpenAI
  { pattern: /gpt-4o-mini|gpt-4\.1-mini/, input: 0.15, output: 0.6, tags: ["Fast", "Cheap", "Vision"], caps: ["vision"] },
  { pattern: /gpt-4o|gpt-4\.1/, input: 2.5, output: 10, tags: ["Coding", "Vision", "Fast"], caps: ["vision", "audio"] },
  { pattern: /\bo4-mini/, input: 1.1, output: 4.4, tags: ["Reasoning", "Fast", "Cheap"], caps: ["vision"] },
  { pattern: /\bo3\b|\bo3-/, input: 2, output: 8, tags: ["Frontier", "Reasoning", "Coding"], caps: ["vision"] },
  { pattern: /\bo1\b|\bo1-/, input: 15, output: 60, tags: ["Reasoning", "Frontier"] },
  { pattern: /gpt-4-turbo|gpt-4\b/, input: 10, output: 30, tags: ["Reasoning", "Vision"], caps: ["vision"] },
  { pattern: /gpt-3\.5/, input: 0.5, output: 1.5, tags: ["Fast", "Cheap"] },

  // Google
  { pattern: /gemini.*(2\.5|3).*pro/, input: 1.25, output: 10, tags: ["Frontier", "Reasoning", "Long context"], caps: ["vision", "audio"] },
  { pattern: /gemini.*flash-lite/, input: 0.1, output: 0.4, tags: ["Fast", "Cheap"], caps: ["vision"] },
  { pattern: /gemini.*flash/, input: 0.3, output: 2.5, tags: ["Fast", "Cheap", "Long context"], caps: ["vision", "audio"] },
  { pattern: /gemini.*pro/, input: 1.25, output: 5, tags: ["Reasoning", "Long context", "Vision"], caps: ["vision", "audio"] },
  { pattern: /gemma/, input: 0.1, output: 0.2, tags: ["Open weights", "Cheap", "Fast"] },

  // DeepSeek
  { pattern: /deepseek.*(r1|reason)/, input: 0.55, output: 2.19, tags: ["Reasoning", "Cheap", "Open weights"] },
  { pattern: /deepseek/, input: 0.27, output: 1.1, tags: ["Cheap", "Coding", "Open weights"] },

  // Meta
  { pattern: /llama.*405b/, input: 3, output: 3, tags: ["Open weights", "Frontier"] },
  { pattern: /llama.*70b/, input: 0.6, output: 0.8, tags: ["Open weights", "Cheap", "Fast"] },
  { pattern: /llama.*(8b|scout|mini)/, input: 0.06, output: 0.06, tags: ["Cheap", "Fast", "Open weights"] },
  { pattern: /llama/, input: 0.6, output: 0.8, tags: ["Open weights", "Cheap"] },

  // Mistral
  { pattern: /(mistral|mixtral).*large/, input: 2, output: 6, tags: ["Reasoning", "Multilingual"] },
  { pattern: /devstral|codestral/, input: 0.3, output: 0.9, tags: ["Coding", "Cheap", "Open weights"] },
  { pattern: /mistral|mixtral|ministral/, input: 0.2, output: 0.6, tags: ["Cheap", "Fast", "Open weights"] },

  // xAI, Cohere, Amazon, Qwen, NVIDIA
  { pattern: /grok.*(mini|fast)/, input: 0.3, output: 0.5, tags: ["Fast", "Cheap"] },
  { pattern: /grok/, input: 2, output: 10, tags: ["Reasoning", "Frontier"] },
  { pattern: /command.*(r-plus|a\b|\+)/, input: 2.5, output: 10, tags: ["Reasoning", "Long context"] },
  { pattern: /command/, input: 0.15, output: 0.6, tags: ["Cheap", "Fast"] },
  { pattern: /nova-pro/, input: 0.8, output: 3.2, tags: ["Reasoning", "Vision"], caps: ["vision"] },
  { pattern: /nova/, input: 0.06, output: 0.24, tags: ["Cheap", "Fast"] },
  { pattern: /qwen.*coder/, input: 0.3, output: 0.9, tags: ["Coding", "Cheap", "Open weights"] },
  { pattern: /qwen/, input: 0.35, output: 0.4, tags: ["Open weights", "Cheap", "Multilingual"] },
  { pattern: /nemotron/, input: 0.6, output: 1.8, tags: ["Reasoning", "Open weights"] },
  { pattern: /phi-/, input: 0.1, output: 0.2, tags: ["Cheap", "Fast", "Open weights"] },
  { pattern: /glm|kimi|minimax|yi-/, input: 0.5, output: 1.5, tags: ["Open weights", "Cheap"] },
];

/** Shape-only tags for models with no pricing rule, so a row is never bare. */
function inferredTags(haystack: string): string[] {
  const tags: string[] = [];
  if (/code|coder|codex|devstral/.test(haystack)) tags.push("Coding");
  if (/think|reason|-r1|o1|o3/.test(haystack)) tags.push("Reasoning");
  if (/vision|-vl|multimodal|omni/.test(haystack)) tags.push("Vision");
  if (/flash|mini|lite|small|haiku|turbo|fast|nano/.test(haystack)) tags.push("Fast");
  if (/opus|ultra|405b|max\b/.test(haystack)) tags.push("Frontier");
  return tags;
}

/**
 * Price and tags for one model id, or null pricing when nothing matches.
 *
 * Callers render an em dash for unknown prices rather than a zero — "free"
 * and "we don't know" must not look the same on a cost tool.
 */
export function factsFor(
  id: string,
  name?: string
): {
  input: number | null;
  output: number | null;
  tags: string[];
  caps: Capability[];
} {
  const haystack = `${id} ${name || ""}`.toLowerCase();
  const rule = RULES.find((r) => r.pattern.test(haystack));

  // Every text model reads documents, because OptiAI inlines them itself -
  // but an image generator or a transcriber is not a text model, and claiming
  // it reads your CSV would be wrong in the one place the icon is consulted.
  const extra = rule?.caps || [];
  const textNative = !extra.includes("imagegen") && !(extra.length === 1 && extra[0] === "audio");
  const caps: Capability[] = textNative ? ["docs", ...extra] : [...extra];

  if (rule) {
    return { input: rule.input, output: rule.output, tags: rule.tags.slice(0, 4), caps };
  }

  const tags = inferredTags(haystack);
  return {
    input: null,
    output: null,
    tags: (tags.length ? tags : ["General"]).slice(0, 4),
    caps,
  };
}

/** Does this model accept the kind of attachment the user just added? */
export function supports(id: string, name: string | undefined, cap: Capability): boolean {
  return factsFor(id, name).caps.includes(cap);
}

/** `$3.00`, `$0.15`, or an em dash when the rate is unknown. */
export function formatRate(value: number | null): string {
  if (value === null) return "—";
  return `$${value.toFixed(2)}`;
}
