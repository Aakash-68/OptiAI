// Cost calculation. Deliberately delegates to 9Router's pricing module so OptiAI
// never grows a second, drifting cost formula (the frontend must not compute cost).
import { calculateCostFromTokens, getPricingForModel as staticPricing, formatCost } from "open-sse/providers/pricing.js";
import { getPricingForModel, getPricing } from "@/lib/db/repos/pricingRepo.js";

export async function pricingFor(provider, model) {
  const effective = await getPricingForModel(provider, model);
  return {
    provider,
    model,
    pricing: effective,
    isOverridden: JSON.stringify(effective) !== JSON.stringify(staticPricing(provider, model)),
    unit: "USD per 1M tokens",
  };
}

export async function calculate({ provider, model, tokens }) {
  const pricing = await getPricingForModel(provider, model);
  const cost = calculateCostFromTokens(tokens || {}, pricing);
  return { provider, model, pricing, tokens, cost, formatted: formatCost(cost) };
}

export async function allPricing() {
  return await getPricing();
}
