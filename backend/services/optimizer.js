// Thin wrapper over 9Router's EXISTING token-saving engine (RTK + system-prompt
// injection). This is not OptiAI's prompt optimizer - that is a separate module
// (backend/optimizer/) which does not exist yet. Everything exposed here is
// deterministic text compression, no model is involved.
import { compressMessages } from "open-sse/rtk/index.js";
import { autoDetectFilter } from "open-sse/rtk/autodetect.js";
import { safeApply } from "open-sse/rtk/applyFilter.js";
import { allFilters, resolveFilter } from "open-sse/rtk/registry.js";
import { injectSystemPrompt } from "open-sse/rtk/systemInject.js";
import { CAVEMAN_PROMPTS } from "open-sse/rtk/cavemanPrompts.js";
import { PONYTAIL_PROMPTS } from "open-sse/rtk/ponytailPrompt.js";
import { MIN_COMPRESS_SIZE } from "open-sse/rtk/constants.js";

const bytes = (value) => Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value ?? ""), "utf8");

export function listFilters() {
  return {
    filters: Object.keys(allFilters()),
    minCompressSize: MIN_COMPRESS_SIZE,
    note: "RTK compresses tool_result/tool-output text. Blobs under minCompressSize are skipped by design.",
  };
}

// Run a single RTK filter (or autodetect) over raw tool output.
export function compressText(text, filterName = "auto") {
  if (typeof text !== "string") throw new Error("text must be a string");
  const detected = filterName === "auto" ? autoDetectFilter(text) : resolveFilter(filterName);
  if (!detected) {
    return { filter: null, applied: false, before: bytes(text), after: bytes(text), output: text };
  }
  const output = safeApply(detected, text) ?? text;
  return {
    filter: filterName === "auto" ? detected.name || "auto" : filterName,
    applied: output !== text,
    before: bytes(text),
    after: bytes(output),
    savedBytes: bytes(text) - bytes(output),
    output,
  };
}

// Run the real request-level path: compressMessages mutates a chat body in place.
export function compressRequestBody(body) {
  const clone = structuredClone(body);
  const before = bytes(clone);
  const stats = compressMessages(clone, true);
  const after = bytes(clone);
  return {
    applied: Boolean(stats),
    before,
    after,
    savedBytes: before - after,
    stats,
    body: clone,
    note: "Byte counts are exact; token savings are only knowable after the provider reports usage.",
  };
}

// Preview what caveman/ponytail would append to the outgoing system prompt.
export function injectionPreview({ body, format = "openai", style = "caveman", level = "full" }) {
  const prompts = style === "ponytail" ? PONYTAIL_PROMPTS : CAVEMAN_PROMPTS;
  const prompt = prompts[level];
  if (!prompt) throw new Error(`Unknown ${style} level: ${level}. Available: ${Object.keys(prompts).join(", ")}`);
  const clone = structuredClone(body ?? { messages: [] });
  injectSystemPrompt(clone, format, prompt);
  return { style, level, promptBytes: bytes(prompt), prompt, body: clone };
}

export function injectionLevels() {
  return { caveman: Object.keys(CAVEMAN_PROMPTS), ponytail: Object.keys(PONYTAIL_PROMPTS) };
}
