/**
 * Step-by-step logging of one chat request.
 *
 * The pipeline crosses four layers — OptiAI API, the Express↔WHATWG bridge,
 * 9Router's handler, and the provider — and until now a failure surfaced as a
 * single status code with no indication of which hop produced it. Every line is
 * tagged with the prompt id, so one `grep opt_xxx` reconstructs the whole turn.
 *
 * Quiet by default in production; set OPTIAI_CHAT_LOG=0 to silence it entirely.
 */
const ENABLED = process.env.OPTIAI_CHAT_LOG !== "0";

const C = {
  dim: "\x1b[2m",
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
};

function stamp() {
  return new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function short(id, keep = 18) {
  if (!id) return "—";
  return id.length > keep ? `${id.slice(0, keep)}…` : id;
}

function line(promptId, color, step, message) {
  if (!ENABLED) return;
  console.log(
    `${C.dim}[${stamp()}]${C.reset} ${color}[chat ${promptId}]${C.reset} ${C.bold}${step}${C.reset} ${message}`
  );
}

/** Step 1 — the prompt arrived, before anything has been routed. */
export function received(promptId, { model, promptChars, turnCount, threadId, mode }) {
  line(
    promptId,
    C.cyan,
    "1/5 prompt",
    `model=${model || "—"} chars=${promptChars} turns=${turnCount} mode=${mode || "chat"} thread=${short(threadId)}`
  );
}

/**
 * Step 2 — handed to the router. `model` is printed verbatim because the shape
 * of this string is exactly what decides which provider and which upstream model
 * id get used, and getting it wrong is the most common cause of a 404 here.
 */
export function routing(promptId, { model, provider }) {
  const alias = typeof model === "string" ? model.split("/")[0] : "—";
  const upstream = typeof model === "string" ? model.split("/").slice(1).join("/") : "—";
  line(
    promptId,
    C.cyan,
    "2/5 route ",
    `provider=${provider || alias} → upstream model="${upstream}" ${C.dim}(from "${model}")${C.reset}`
  );
}

/** Step 3 — first byte back from the provider. */
export function firstToken(promptId, ms) {
  line(promptId, C.cyan, "3/5 stream", `first chunk after ${ms}ms`);
}

/** Step 4 — what the provider reported it charged us for. */
export function usage(promptId, { inputTokens, outputTokens, cachedTokens, estimated }) {
  line(
    promptId,
    C.cyan,
    "4/5 usage ",
    `in=${inputTokens} out=${outputTokens} cached=${cachedTokens} source=${estimated ? "estimated" : "reported"}`
  );
}

/** Step 5 — the trace row is closed. */
export function done(promptId, { status, latencyMs, cost, model }) {
  const ok = status === "ok";
  line(
    promptId,
    ok ? C.green : C.yellow,
    "5/5 done  ",
    `status=${status} ${latencyMs}ms cost=$${(cost ?? 0).toFixed(6)} model=${model || "—"}`
  );
}

/**
 * A failure, with the provider's own words rather than just the status code.
 * This is the line that was missing when the UI could only say "[object Object]".
 */
export function failed(promptId, { status, message, model }) {
  if (!ENABLED) return;
  console.log(
    `${C.dim}[${stamp()}]${C.reset} ${C.red}[chat ${promptId}] ✗ FAILED${C.reset} ` +
      `status=${status} model=${model || "—"}\n` +
      `${C.red}   └─ ${message || "(no message from provider)"}${C.reset}`
  );
}
