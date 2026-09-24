// OptiAI's own use of a model: ranking, project scoping and usage review.
//
// Every call here goes through the same routing pipeline as chat, using the
// fastest model that last tested clean. Nothing is hard-wired to a provider —
// if the user has one working model, OptiAI can think with it.
import { routeChatJson } from "./gateway.js";
import { ensureLocalKey } from "./cli.js";
import { testedModels } from "./models.js";
import * as usage from "./usage.js";
import * as trace from "./trace.js";

/** The routing string of the fastest passing model, or a 400 when there is none. */
async function pickModel(preferred) {
  const { models } = await testedModels();
  if (preferred) {
    const match = models.find((m) => m.value === preferred || m.id === preferred);
    if (match) return match;
  }
  if (models.length === 0) {
    const error = new Error(
      "No tested model is available. Connect a provider and run Test models so OptiAI has something to think with."
    );
    error.status = 400;
    throw error;
  }
  return models[0];
}

/**
 * Pulls JSON out of a model reply that may be fenced, prefixed with prose, or
 * followed by an SSE terminator (the vendored router appends `data: [DONE]`
 * to non-streaming bodies — see .handoff, known issue 1).
 */
function parseLoose(text) {
  if (typeof text !== "string") return text;
  let s = text.trim().replace(/\s*data:\s*\[DONE\]\s*$/i, "");
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(s);
  if (fenced) s = fenced[1].trim();
  try {
    return JSON.parse(s);
  } catch {
    const start = s.search(/[[{]/);
    const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(s.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    // Cut off by max_tokens mid-string? Close what is open and keep what
    // arrived — a truncated reason beats a failed call. The trailing partial
    // string is dropped, then every combination of closers is tried.
    if (start >= 0) {
      const body = s.slice(start);
      const candidates = [body, body.replace(/,?\s*"[^"]*$/, ""), body.replace(/,?\s*"[^"]*"?\s*:?\s*"?[^"]*$/, "")];
      const closers = ['"', '"}', '"]', '"]}', '"}]}', "}", "]", "]}", "}]}", '"}}', "}}"];
      for (const c of candidates) {
        for (const tail of closers) {
          try {
            return JSON.parse(c.replace(/,\s*$/, "") + tail);
          } catch {
            /* next */
          }
        }
      }
    }
  }
  const error = new Error(
    `The model did not return JSON OptiAI could read. It said: ${s.slice(0, 300) || "(nothing)"}`
  );
  error.status = 502;
  throw error;
}

async function complete({ system, user, maxTokens = 2500, model: preferred }) {
  const model = await pickModel(preferred);
  const authorization = `Bearer ${await ensureLocalKey()}`;
  const { status, body } = await routeChatJson(
    {
      model: model.value,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
      stream: false,
    },
    { headers: { authorization } }
  );
  if (status >= 400) {
    const error = new Error(
      body?.error?.message || body?.error || body?.raw || `Model call failed (HTTP ${status})`
    );
    error.status = 502;
    throw error;
  }
  // The body itself may have arrived as `{raw}` when the [DONE] suffix broke
  // JSON.parse upstream; parseLoose handles both shapes.
  const parsedBody = body?.raw ? parseLoose(body.raw) : body;
  const content = parsedBody?.choices?.[0]?.message?.content ?? parsedBody?.content?.[0]?.text ?? "";
  return { model: model.value, modelName: model.name, data: parseLoose(String(content)) };
}

/* -------------------------------------------------------------------------- */

/**
 * Rank candidates against a plain-language request.
 *
 * Generic on purpose: Models sends its catalog, Skills sends the library. Each
 * candidate is `{ id, name, description }` and the answer is the top `limit`
 * ids with one-line reasons, in order.
 */
export async function rank({ query, candidates, limit = 5, context = "" } = {}) {
  const q = String(query || "").trim();
  if (!q) {
    const error = new Error("query is required");
    error.status = 400;
    throw error;
  }
  const list = (Array.isArray(candidates) ? candidates : [])
    .filter((c) => c && c.id)
    .slice(0, 400)
    .map((c) => `- ${c.id} :: ${c.name || c.id}${c.description ? ` — ${String(c.description).slice(0, 160)}` : ""}`)
    .join("\n");

  const system = `You are OptiAI, a router that matches a user's need to the best options from a fixed list.
Reply with JSON only, no prose, in the shape {"results":[{"id":"<id from the list>","reason":"<one short sentence>"}]}.
Return at most ${limit} results, best first. Only use ids that appear in the list. ${context}`.trim();

  const user = `Request: ${q}\n\nOptions:\n${list}`;
  const out = await complete({ system, user, maxTokens: 2500 });
  const ids = new Set((candidates || []).map((c) => c.id));
  const results = (Array.isArray(out.data?.results) ? out.data.results : [])
    .filter((r) => r && ids.has(r.id))
    .slice(0, limit)
    .map((r) => ({ id: r.id, reason: String(r.reason || "").slice(0, 240) }));
  return { model: out.model, modelName: out.modelName, results };
}

/**
 * Scope a project from its title and description: which of the connected
 * models it should be allowed to use and which skills and plugins to turn on.
 */
export async function optify({ title, description, models = [], skills = [] } = {}) {
  const t = String(title || "").trim();
  const d = String(description || "").trim();
  if (!t && !d) {
    const error = new Error("Give the project a name or a description first.");
    error.status = 400;
    throw error;
  }
  const modelList = (Array.isArray(models) ? models : [])
    .slice(0, 200)
    .map((m) => `- ${m.id} :: ${m.name || m.id} (${m.provider || "?"})${m.description ? ` — ${m.description}` : ""}`)
    .join("\n");
  const skillList = (Array.isArray(skills) ? skills : [])
    .map((s) => `- ${s.id} :: ${s.name} [${s.kind}] — ${String(s.summary || "").slice(0, 140)}`)
    .join("\n");

  const system = `You are OptiAI. Given a project, choose what it should be allowed to use.
Reply with JSON only: {"models":["<id>",...],"skills":["<id>",...],"plugins":["<id>",...],"reason":"<one short sentence>"}.
Pick 1–3 models (a cheap one for routine work and a stronger one if the project needs reasoning), and only the skills/plugins that clearly help. Use only ids from the lists. Skills and plugins are separate lists — put each id in the list matching its [kind].`;

  const user = `Project: ${t}\nDescription: ${d || "(none)"}\n\nConnected models:\n${modelList || "(none)"}\n\nLibrary:\n${skillList || "(none)"}`;
  const out = await complete({ system, user, maxTokens: 2500 });

  const modelIds = new Set(models.map((m) => m.id));
  const skillIds = new Set(skills.filter((s) => s.kind === "skill").map((s) => s.id));
  const pluginIds = new Set(skills.filter((s) => s.kind === "plugin").map((s) => s.id));
  const pick = (arr, allowed) => (Array.isArray(arr) ? arr.filter((id) => allowed.has(id)) : []);
  const chosenSkills = new Set([...pick(out.data?.skills, skillIds), ...pick(out.data?.plugins, skillIds)]);
  const chosenPlugins = new Set([...pick(out.data?.plugins, pluginIds), ...pick(out.data?.skills, pluginIds)]);

  return {
    model: out.model,
    modelName: out.modelName,
    models: pick(out.data?.models, modelIds).slice(0, 3),
    skills: [...chosenSkills],
    plugins: [...chosenPlugins],
    reason: String(out.data?.reason || "").slice(0, 400),
  };
}

/* -------------------------------------------------------------------------- */

const lastAnalysis = new Map();

/**
 * Prompts that stand out: the heaviest inputs, the longest outputs, replies
 * far shorter than what was sent, and failures. These are what a human would
 * open first, so they are what the model is shown alongside the totals.
 */
function pickSuspicious(traces) {
  const done = traces.filter((t) => t.status !== "pending");
  const byInput = [...done].sort((a, b) => b.inputTokens - a.inputTokens).slice(0, 4);
  const byOutput = [...done].sort((a, b) => b.outputTokens - a.outputTokens).slice(0, 3);
  const lopsided = done
    .filter((t) => t.inputTokens > 4000 && t.outputTokens > 0 && t.outputTokens / t.inputTokens < 0.03)
    .slice(0, 3);
  const failed = done.filter((t) => t.status === "error").slice(0, 3);
  const seen = new Set();
  const out = [];
  for (const [why, list] of [
    ["heaviest input", byInput],
    ["longest output", byOutput],
    ["tiny answer for a large prompt", lopsided],
    ["failed", failed],
  ]) {
    for (const t of list) {
      if (seen.has(t.promptId)) continue;
      seen.add(t.promptId);
      out.push({ ...t, why });
    }
  }
  return out.slice(0, 10);
}

export async function analyze({ period = "30d" } = {}) {
  const [stats, traces] = await Promise.all([usage.stats(period), trace.list({ limit: 300 })]);
  const suspicious = pickSuspicious(traces);

  const byModel = Object.entries(stats?.byModel || {})
    .sort((a, b) => (b[1].requests || 0) - (a[1].requests || 0))
    .slice(0, 8)
    .map(([k, b]) => `- ${k}: ${b.requests} req, ${b.promptTokens} in, ${b.completionTokens} out, $${(b.cost || 0).toFixed(4)}`)
    .join("\n");

  const rows = suspicious
    .map(
      (t) =>
        `- ${t.promptId} [${t.why}] model=${t.resolvedModel || t.requestedModel || "?"} in=${t.inputTokens} out=${t.outputTokens} cached=${t.cachedTokens} status=${t.status}${t.error ? ` error="${String(t.error).slice(0, 80)}"` : ""} chars=${t.promptChars} turns=${t.turnCount}`
    )
    .join("\n");

  const system = `You are OptiAI's usage analyst. You get aggregate usage plus a handful of individual prompts that look unusual.
Reply with JSON only:
{"summary":"<3 sentences on the overall picture>",
 "findings":[{"title":"<short>","detail":"<one or two sentences, concrete>","severity":"info|warn|high"}],
 "suspicious":[{"promptId":"<id from the list>","reason":"<why it deserves a look, one sentence>"}],
 "scores":{"efficiency":<0-100>,"modelFit":<0-100>,"promptCraft":<0-100>}}
Be specific and numeric. At most 5 findings and 5 suspicious prompts. Only reference promptIds from the list.`;

  const user = `Period: ${period}
Totals: ${stats?.totalRequests || 0} requests, ${stats?.totalPromptTokens || 0} input, ${stats?.totalCachedTokens || 0} cached, ${stats?.totalCompletionTokens || 0} output, $${(stats?.totalCost || 0).toFixed(4)} estimated.

By model:
${byModel || "(none)"}

Unusual prompts:
${rows || "(none)"}`;

  const out = await complete({ system, user, maxTokens: 4000 });
  const ids = new Set(suspicious.map((t) => t.promptId));
  const data = out.data || {};
  const result = {
    period,
    model: out.model,
    modelName: out.modelName,
    evaluatedAt: new Date().toISOString(),
    summary: String(data.summary || ""),
    findings: (Array.isArray(data.findings) ? data.findings : []).slice(0, 5).map((f) => ({
      title: String(f?.title || ""),
      detail: String(f?.detail || ""),
      severity: ["info", "warn", "high"].includes(f?.severity) ? f.severity : "info",
    })),
    suspicious: (Array.isArray(data.suspicious) ? data.suspicious : [])
      .filter((s) => s && ids.has(s.promptId))
      .slice(0, 5)
      .map((s) => {
        const t = suspicious.find((x) => x.promptId === s.promptId);
        return {
          promptId: s.promptId,
          reason: String(s.reason || ""),
          model: t?.resolvedModel || t?.requestedModel || null,
          inputTokens: t?.inputTokens ?? 0,
          outputTokens: t?.outputTokens ?? 0,
          status: t?.status || "ok",
          why: t?.why || "",
        };
      }),
    scores:
      data.scores && typeof data.scores === "object"
        ? {
            efficiency: clamp(data.scores.efficiency),
            modelFit: clamp(data.scores.modelFit),
            promptCraft: clamp(data.scores.promptCraft),
          }
        : null,
  };
  lastAnalysis.set(period, result);
  return result;
}

function clamp(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : null;
}

/** The last evaluation for a period, if this process has produced one. */
export function lastFor(period = "30d") {
  return lastAnalysis.get(period) || null;
}
