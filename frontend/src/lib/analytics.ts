import type { UsageStats } from "./types";
import { compactNumber, formatCost } from "./format";

/**
 * Analytics scoring.
 *
 * Usage answers "what happened". Analytics answers "what does it mean".
 *
 * Every number below is derived from the real usageHistory rollups the backend
 * already returns — nothing here is invented. It is a deterministic heuristic,
 * not a model call: when an /api/analytics endpoint exists it should replace
 * `deriveScores` wholesale, keeping this module's return shape.
 *
 * The three categories:
 *   Efficiency    — are you paying more than the work required?
 *   Model Fit     — are prompts going to appropriately-sized models?
 *   Prompt Craft  — are your inputs lean and well-shaped?
 */

export interface ScoreBreakdown {
  id: "efficiency" | "model-fit" | "prompt-craft";
  label: string;
  score: number;
  caption: string;
  /** Plain-language justification — why this number, not another. */
  reasons: string[];
}

export interface AnalyticsReport {
  hasData: boolean;
  scores: ScoreBreakdown[];
  observation: string;
  pros: string[];
  cons: string[];
  /** Each suggestion points at a skill id where one applies. */
  suggestions: { title: string; detail: string; skillId?: string }[];
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function sumBucket(
  buckets: UsageStats["byModel"] | undefined,
  key: "requests" | "cost" | "promptTokens" | "completionTokens" | "cachedTokens"
): number {
  if (!buckets) return 0;
  return Object.values(buckets).reduce((sum, b) => sum + (b[key] || 0), 0);
}

export function deriveScores(stats: UsageStats | null): AnalyticsReport {
  // The totals carry a `total…` prefix upstream; the unprefixed spelling belongs
  // to the per-bucket objects. Reading the bucket names here meant input/output
  // were always 0, so `hasData` was false and this page claimed there was no
  // traffic no matter how many requests had actually been recorded.
  const requests = stats?.totalRequests ?? sumBucket(stats?.byModel, "requests");
  const input = stats?.totalPromptTokens ?? sumBucket(stats?.byModel, "promptTokens");
  const output = stats?.totalCompletionTokens ?? sumBucket(stats?.byModel, "completionTokens");
  const cached = stats?.totalCachedTokens ?? sumBucket(stats?.byModel, "cachedTokens");
  const cost = stats?.totalCost ?? sumBucket(stats?.byModel, "cost");
  const totalTokens = input + output;

  if (!requests || !totalTokens) {
    return {
      hasData: false,
      scores: [
        { id: "efficiency", label: "Efficiency", score: 0, caption: "No requests recorded yet", reasons: [] },
        { id: "model-fit", label: "Model Fit", score: 0, caption: "No requests recorded yet", reasons: [] },
        { id: "prompt-craft", label: "Prompt Craft", score: 0, caption: "No requests recorded yet", reasons: [] },
      ],
      observation:
        "No usage has been recorded yet. Connect a provider and send a few requests — analytics needs real traffic before it can say anything useful.",
      pros: [],
      cons: [],
      suggestions: [],
    };
  }

  const costPerRequest = cost / requests;
  const inputPerRequest = input / requests;
  const outputRatio = output / totalTokens;
  const cacheRate = input > 0 ? cached / input : 0;
  const modelCount = Object.keys(stats?.byModel || {}).length;
  const providerCount = Object.keys(stats?.byProvider || {}).length;

  /* -- Efficiency: cost per request, softened by cache usage ---------------- */
  // $0.002/req or below is excellent; $0.10+ is poor. Log-scaled between.
  const costScore =
    costPerRequest <= 0.002
      ? 96
      : costPerRequest >= 0.1
        ? 25
        : 96 - (Math.log10(costPerRequest / 0.002) / Math.log10(50)) * 71;
  const efficiency = clamp(costScore * 0.75 + cacheRate * 100 * 0.25);

  /* -- Model Fit: spreading work across models beats one-model-for-everything */
  const spreadScore = modelCount >= 4 ? 92 : modelCount === 3 ? 80 : modelCount === 2 ? 62 : 40;
  const providerBonus = providerCount >= 2 ? 8 : 0;
  const modelFit = clamp(spreadScore + providerBonus);

  /* -- Prompt Craft: lean inputs that produce substantial outputs ----------- */
  // A 50k-token input for a 200-token answer is the shape we penalise.
  const bulkPenalty =
    inputPerRequest <= 2000 ? 0 : Math.min(45, ((inputPerRequest - 2000) / 48000) * 45);
  const outputReward = Math.min(28, outputRatio * 140);
  const promptCraft = clamp(66 - bulkPenalty + outputReward + cacheRate * 18);

  const scores: ScoreBreakdown[] = [
    {
      id: "efficiency",
      label: "Efficiency",
      score: efficiency,
      caption: `${formatCost(costPerRequest)} per request`,
      reasons: [
        `Average cost per request is ${formatCost(costPerRequest)} across ${compactNumber(requests)} requests.`,
        cacheRate > 0.05
          ? `${(cacheRate * 100).toFixed(0)}% of input tokens were served from cache, which cuts billed input cost.`
          : "Almost no cached input — repeated context is being re-billed on every call.",
      ],
    },
    {
      id: "model-fit",
      label: "Model Fit",
      score: modelFit,
      caption:
        modelCount === 1
          ? "Everything on one model"
          : `${modelCount} models across ${providerCount || 1} provider${providerCount === 1 ? "" : "s"}`,
      reasons: [
        modelCount === 1
          ? "Every request went to a single model, so trivial prompts cost the same as hard ones."
          : `Work is spread over ${modelCount} models, which lets cheap prompts land on cheap models.`,
        providerCount >= 2
          ? `${providerCount} providers are in play, so a single outage or rate limit cannot stall you.`
          : "Only one provider is connected — a rate limit there stops all traffic.",
      ],
    },
    {
      id: "prompt-craft",
      label: "Prompt Craft",
      score: promptCraft,
      caption: `${compactNumber(inputPerRequest)} input tokens per request`,
      reasons: [
        `Each request carries about ${compactNumber(inputPerRequest)} input tokens.`,
        `Output is ${(outputRatio * 100).toFixed(1)}% of total tokens — ${
          outputRatio < 0.05
            ? "very low, which usually means large context is being sent for short answers."
            : "a healthy share of the work is generation rather than context."
        }`,
      ],
    },
  ];

  const pros: string[] = [];
  const cons: string[] = [];

  if (cacheRate > 0.2) pros.push(`Strong cache usage — ${(cacheRate * 100).toFixed(0)}% of input tokens were cached reads.`);
  if (modelCount >= 3) pros.push(`Work is distributed across ${modelCount} models rather than defaulting to one.`);
  if (costPerRequest < 0.01) pros.push(`Cost per request is low at ${formatCost(costPerRequest)}.`);
  if (providerCount >= 2) pros.push(`${providerCount} providers connected, so fallback has somewhere to go.`);
  if (pros.length === 0) pros.push("Usage is being tracked end-to-end, so these numbers are measured rather than estimated.");

  if (inputPerRequest > 20000)
    cons.push(
      `Input is heavy at ~${compactNumber(inputPerRequest)} tokens per request. Large context is the single biggest line item in your bill.`
    );
  if (outputRatio < 0.05)
    cons.push(
      `Output is only ${(outputRatio * 100).toFixed(1)}% of tokens — you are paying mostly to send context, not to generate answers.`
    );
  if (modelCount === 1) cons.push("A single model is handling every prompt, including the trivial ones.");
  if (cacheRate < 0.05) cons.push("Effectively no prompt caching, so shared context is re-billed on every call.");
  if (providerCount < 2) cons.push("One provider is a single point of failure for all traffic.");

  const suggestions: AnalyticsReport["suggestions"] = [];

  if (inputPerRequest > 8000) {
    suggestions.push({
      title: "Compress long prompts before they leave OptiAI",
      detail: `At ~${compactNumber(inputPerRequest)} input tokens per request, the RTK filter chain typically removes 15–60% with no loss of meaning.`,
      skillId: "prompt-compressor",
    });
    suggestions.push({
      title: "Prune stale conversation turns",
      detail: "Long threads keep re-sending turns that no longer affect the answer.",
      skillId: "context-pruner",
    });
  }

  if (modelCount <= 2) {
    suggestions.push({
      title: "Route easy prompts to a cheaper model",
      detail: "Classify each prompt and send the simple ones to a smaller model in the same combo.",
      skillId: "model-router",
    });
  }

  if (costPerRequest > 0.02) {
    suggestions.push({
      title: "Put a ceiling on daily spend",
      detail: `At ${formatCost(costPerRequest)} per request, a busy day compounds quickly. Cost Guard downgrades instead of failing.`,
      skillId: "cost-guard",
    });
  }

  if (providerCount < 2) {
    suggestions.push({
      title: "Connect a second provider",
      detail: "Account fallback and combos can only route around a rate limit if somewhere else is reachable.",
    });
  }

  const topModel = Object.entries(stats?.byModel || {}).sort(
    (a, b) => (b[1].requests || 0) - (a[1].requests || 0)
  )[0];

  const observation = `You made ${compactNumber(requests)} requests totalling ${compactNumber(
    totalTokens
  )} tokens for ${formatCost(cost)}. ${
    topModel
      ? `${topModel[0]} handled ${Math.round(((topModel[1].requests || 0) / requests) * 100)}% of them. `
      : ""
  }Input outweighs output ${(input / Math.max(output, 1)).toFixed(0)}:1, which is ${
    input / Math.max(output, 1) > 20 ? "context-heavy" : "within a normal range"
  } for this kind of workload.`;

  return { hasData: true, scores, observation, pros, cons, suggestions };
}
