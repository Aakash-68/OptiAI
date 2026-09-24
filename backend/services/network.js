// The "network map": OptiAI in the middle, every reachable provider around it.
//
// Reachable means the provider either has at least one stored connection or
// needs no credential at all. Providers that are merely *supported* do not
// appear — the map answers "what can I route to right now", not "what exists".
import { getProviderConnections } from "@/lib/db/repos/connectionsRepo.js";
import { testSingleConnection } from "@/app/api/providers/[id]/test/testUtils.js";
import { listProviders } from "./providers.js";
import { listResults } from "./modelTests.js";
import { testProviderModels, staticModels } from "./models.js";
import { recent } from "./usage.js";
import { assertSupported } from "../config/providers.js";

/** Credentials never leave the backend — the map gets identity plus health only. */
function safeConnection(c) {
  return {
    id: c.id,
    name: c.name || c.email || c.id,
    authType: c.authType,
    isActive: c.isActive !== false,
    testStatus: c.testStatus || "unknown",
    lastError: c.lastError || null,
    lastTested: c.lastTested || null,
    lastUsedAt: c.lastUsedAt || null,
  };
}

/**
 * One node per reachable provider, with the stored evidence for it: its
 * connections, how many of its models last tested clean, and when it was last
 * actually used. Nothing here pings anything — see `check` for that.
 */
export async function topology() {
  const [providers, connections, verdicts, usage] = await Promise.all([
    listProviders(),
    getProviderConnections(),
    listResults(),
    recent(200),
  ]);

  const byProvider = new Map();
  for (const c of connections) {
    if (!byProvider.has(c.provider)) byProvider.set(c.provider, []);
    byProvider.get(c.provider).push(safeConnection(c));
  }

  const lastUsed = new Map();
  const requestCount = new Map();
  for (const row of usage.records) {
    if (!row.provider) continue;
    requestCount.set(row.provider, (requestCount.get(row.provider) || 0) + 1);
    if (!lastUsed.has(row.provider)) lastUsed.set(row.provider, row.timestamp);
  }

  const nodes = providers
    .filter((p) => p.noAuth || p.connections > 0)
    .map((p) => {
      const conns = byProvider.get(p.id) || [];
      const tests = verdicts.filter((v) => v.provider === p.id);
      const okModels = tests.filter((v) => v.ok);
      // Stored status only. A connection whose last test failed is red before
      // any live check runs; anything untested is neutral until checked.
      const anyInvalid = conns.some((c) => c.testStatus === "invalid" || c.testStatus === "error");
      const anyActive = conns.some((c) => c.testStatus === "active");
      const status = p.noAuth
        ? okModels.length > 0
          ? "ok"
          : "unknown"
        : anyInvalid
          ? "error"
          : anyActive
            ? "ok"
            : "unknown";
      return {
        id: p.id,
        name: p.name,
        noAuth: Boolean(p.noAuth),
        status,
        connections: conns,
        modelCount: p.modelCount,
        testedModels: tests.length,
        okModels: okModels.length,
        lastTestedAt: tests[0]?.testedAt || null,
        lastUsedAt: lastUsed.get(p.id) || null,
        recentRequests: requestCount.get(p.id) || 0,
      };
    });

  return { nodes, checkedAt: new Date().toISOString() };
}

/**
 * Live check of one provider.
 *
 * Credentialed providers: every connection is tested through the router's own
 * probe, the same one the Providers page uses. No-auth providers have no
 * connection to probe, so one model gets a real one-token completion — the
 * cheapest thing that proves the route is open rather than merely configured.
 */
export async function check(providerId) {
  assertSupported(providerId);
  const startedAt = Date.now();
  const providers = await listProviders();
  const provider = providers.find((p) => p.id === providerId);
  if (!provider) {
    const error = new Error("Provider not found");
    error.status = 404;
    throw error;
  }

  if (provider.noAuth) {
    const stored = (await listResults(providerId)).filter((v) => v.ok);
    const target = stored[0]?.modelId || staticModels(providerId)[0]?.id;
    if (!target) {
      return { provider: providerId, ok: false, error: "No model to probe", connections: [], latencyMs: 0 };
    }
    const run = await testProviderModels(providerId, [target]);
    const result = run.results[0];
    return {
      provider: providerId,
      ok: Boolean(result?.ok),
      error: result?.error || null,
      probedModel: target,
      connections: [],
      latencyMs: Date.now() - startedAt,
    };
  }

  const connections = (await getProviderConnections({ provider: providerId })).filter(
    (c) => c.isActive !== false
  );
  const results = [];
  for (const c of connections) {
    const r = await testSingleConnection(c.id);
    results.push({
      id: c.id,
      name: c.name || c.email || c.id,
      ok: Boolean(r.valid),
      error: r.error || null,
      latencyMs: r.latencyMs ?? null,
    });
  }

  return {
    provider: providerId,
    // One working key is enough to route; the map colours the line on that.
    ok: results.some((r) => r.ok),
    error: results.every((r) => !r.ok) ? results[0]?.error || "No active connection" : null,
    connections: results,
    latencyMs: Date.now() - startedAt,
  };
}
