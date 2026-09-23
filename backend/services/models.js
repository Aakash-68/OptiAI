// Model catalog, availability and per-model health testing.
//
// Live per-connection listing reuses 9Router's resolver (which also refreshes
// OAuth tokens on 401/403) instead of re-implementing it. Everything is scoped
// to the supported provider set in backend/config/providers.js.
import {
  getModelsByProviderId,
  getModelType,
  PROVIDER_ID_TO_ALIAS,
} from "open-sse/config/providerModels.js";
import { GET as connectionModelsRoute } from "@/app/api/providers/[id]/models/route.js";
import { GET as availabilityRoute } from "@/app/api/models/availability/route.js";
import {
  getCombos,
  getComboByName,
  createCombo as createComboRow,
  updateCombo as updateComboRow,
  deleteCombo as deleteComboRow,
} from "@/lib/db/repos/combosRepo.js";
import { getProviderConnectionById } from "@/lib/db/repos/connectionsRepo.js";
import { routeChatJson } from "./gateway.js";
import { ensureLocalKey } from "./cli.js";
import { listProviders } from "./providers.js";
import { recordResults, listUsable, resultsByProvider } from "./modelTests.js";
import { assertSupported, SUPPORTED_PROVIDER_IDS } from "../config/providers.js";

/** Non-chat model kinds were excluded from the extraction — never offer them. */
const CHAT_KINDS = new Set([undefined, null, "", "llm", "chat"]);

export function staticModels(providerId) {
  assertSupported(providerId);
  const alias = PROVIDER_ID_TO_ALIAS[providerId] || providerId;
  return (getModelsByProviderId(providerId) || []).filter((model) => {
    const kind = model.kind || model.type || getModelType(alias, model.id);
    return CHAT_KINDS.has(kind);
  });
}

/** Every supported provider's models in one pass — avoids 15 round trips. */
export function allStaticModels() {
  return SUPPORTED_PROVIDER_IDS.flatMap((providerId) =>
    staticModels(providerId).map((model) => ({ ...model, provider: providerId }))
  );
}

export async function connectionModels(connectionId) {
  const request = new Request(`http://localhost/api/providers/${connectionId}/models`);
  const response = await connectionModelsRoute(request, {
    params: Promise.resolve({ id: connectionId }),
  });
  return { status: response.status, body: await response.json() };
}

export async function availability() {
  const response = await availabilityRoute();
  return { status: response.status, body: await response.json() };
}

export async function listCombos() {
  return await getCombos();
}

/**
 * The router resolves a combo by name only for names with no slash in them -
 * a name containing one is read as provider/model and never reaches the combo
 * lookup. Same rule the UI enforces, applied here so the API cannot be used
 * to create a combo that can never be routed to.
 */
const COMBO_NAME = /^[A-Za-z0-9._-]+$/;

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

export async function createCombo({ name, models, kind } = {}) {
  const trimmed = String(name || "").trim();
  if (!COMBO_NAME.test(trimmed)) {
    throw badRequest("Combo name may contain only letters, numbers, dot, dash and underscore.");
  }
  if (await getComboByName(trimmed)) {
    throw badRequest(`A combo named "${trimmed}" already exists.`);
  }
  return await createComboRow({ name: trimmed, models: models || [], kind: kind || null });
}

export async function updateCombo(id, { name, models, kind } = {}) {
  const patch = {};
  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!COMBO_NAME.test(trimmed)) {
      throw badRequest("Combo name may contain only letters, numbers, dot, dash and underscore.");
    }
    const clash = await getComboByName(trimmed);
    if (clash && clash.id !== id) throw badRequest(`A combo named "${trimmed}" already exists.`);
    patch.name = trimmed;
  }
  if (models !== undefined) patch.models = models;
  if (kind !== undefined) patch.kind = kind;

  const updated = await updateComboRow(id, patch);
  if (!updated) {
    const error = new Error("Combo not found");
    error.status = 404;
    throw error;
  }
  return updated;
}

export async function deleteCombo(id) {
  const removed = await deleteComboRow(id);
  if (!removed) {
    const error = new Error("Combo not found");
    error.status = 404;
    throw error;
  }
  return { ok: true };
}

/**
 * Ping models through the real routing pipeline.
 *
 * Mirrors 9Router's /api/providers/[id]/test-models: send the smallest possible
 * completion at each model and report ok/failed per model. Requests go through
 * `routeChatJson` rather than an HTTP hop to ourselves, so translation,
 * credential selection and token refresh all behave exactly as in normal use.
 *
 * The first model is tested alone to let any OAuth refresh settle before the
 * rest fan out — otherwise concurrent calls race on the same refresh token.
 */
export async function testModels(connectionId, requestedModelIds) {
  const connection = await getProviderConnectionById(connectionId);
  if (!connection) {
    const error = new Error("Connection not found");
    error.status = 404;
    throw error;
  }
  return runModelTests(connection.provider, requestedModelIds, connectionId);
}

/**
 * Test by provider instead of connection — the path for no-auth providers,
 * which never have a connection row because the router injects a virtual one.
 */
export async function testProviderModels(providerId, requestedModelIds) {
  assertSupported(providerId);
  return runModelTests(providerId, requestedModelIds, null);
}

async function runModelTests(providerId, requestedModelIds, connectionId) {
  assertSupported(providerId);

  const alias = PROVIDER_ID_TO_ALIAS[providerId] || providerId;
  const catalog = staticModels(providerId);

  const targets =
    Array.isArray(requestedModelIds) && requestedModelIds.length > 0
      ? requestedModelIds.map((id) => catalog.find((m) => m.id === id) || { id, name: id })
      : catalog;

  if (targets.length === 0) {
    const error = new Error("No models configured for this provider");
    error.status = 400;
    throw error;
  }

  const authorization = `Bearer ${await ensureLocalKey()}`;

  const [first, ...rest] = targets;
  const results = [await pingModel(alias, first, authorization)];

  if (rest.length > 0) {
    results.push(
      ...(await Promise.all(rest.map((model) => pingModel(alias, model, authorization))))
    );
  }

  // Persisted rather than only returned: the chat composer offers models based
  // on these verdicts, so they have to outlive the page that triggered the test.
  const { testedAt } = await recordResults(providerId, connectionId, results);

  return { provider: providerId, connectionId, testedAt, results };
}

/**
 * The models the chat composer may offer: tested, passing, and belonging to a
 * provider that still has a connection.
 *
 * Deliberately strict — an untested model is not offered, because the whole
 * point is that picking a model from this list cannot fail on the first send.
 * The UI says so explicitly rather than presenting an unexplained empty list.
 */
export async function testedModels() {
  // Reuses listProviders rather than re-deriving connection state: it already
  // resolves no-auth providers (which never get a connection row, because the
  // router injects a virtual one) and counts active connections.
  const providers = await listProviders();
  const reachable = providers.filter((p) => p.noAuth || p.connections > 0);
  const reachableIds = reachable.map((p) => p.id);
  const providerName = new Map(providers.map((p) => [p.id, p.name]));

  const usable = await listUsable(reachableIds);

  const catalogName = new Map();
  for (const providerId of new Set(usable.map((m) => m.provider))) {
    for (const model of staticModels(providerId)) {
      catalogName.set(`${providerId}:${model.id}`, model.name);
    }
  }

  return {
    models: usable.map((entry) => ({
      id: entry.modelId,
      // What must actually be sent as `model`. The router reads the first path
      // segment as the provider alias and strips it, so the alias has to be
      // prepended even when the catalog id already contains a slash of its own
      // — NVIDIA NIM ids like "nvidia/nemotron-3-ultra-550b-a55b" are vendor-
      // qualified, and sending them unprefixed loses the "nvidia/" the provider
      // itself expects, which 404s. Same string the model test uses, so a model
      // that passed its test is reachable with this exact value.
      value: routingModelId(entry.provider, entry.modelId),
      name: catalogName.get(`${entry.provider}:${entry.modelId}`) || entry.name,
      provider: entry.provider,
      providerName: providerName.get(entry.provider) || entry.provider,
      latencyMs: entry.latencyMs,
      testedAt: entry.testedAt,
    })),
    connectedProviders: reachableIds,
  };
}

/** `alias/modelId` — the one string both the tester and the chat path must send. */
export function routingModelId(providerId, modelId) {
  const alias = PROVIDER_ID_TO_ALIAS[providerId] || providerId;
  return `${alias}/${modelId}`;
}

/** Stored verdicts for one provider, so the provider page survives a reload. */
export async function modelTestResults(providerId) {
  assertSupported(providerId);
  return { provider: providerId, results: await resultsByProvider(providerId) };
}

async function pingModel(alias, model, authorization) {
  const startedAt = Date.now();
  try {
    // Built the same way GET /models/tested builds it, so "passed its test"
    // and "works in chat" mean the same string reaches the provider.
    const { status, body, connection } = await routeChatJson(
      {
        model: `${alias}/${model.id}`,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
        stream: false,
      },
      { headers: { authorization } }
    );

    const latencyMs = Date.now() - startedAt;
    const errorMessage =
      body?.error?.message || (typeof body?.error === "string" ? body.error : null);

    if (status >= 200 && status < 300 && !errorMessage) {
      // The router tries each key in turn and stops at the first that works,
      // so this is the key that actually passed - which is not always the one
      // the test was launched from.
      return {
        modelId: model.id,
        name: model.name || model.id,
        ok: true,
        latencyMs,
        connectionId: connection?.id || null,
        connectionName: connection?.name || null,
      };
    }

    return {
      modelId: model.id,
      name: model.name || model.id,
      ok: false,
      latencyMs,
      status,
      error: errorMessage || `HTTP ${status}`,
    };
  } catch (err) {
    return {
      modelId: model.id,
      name: model.name || model.id,
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: err?.message || "Request failed",
    };
  }
}
