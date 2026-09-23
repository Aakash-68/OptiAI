/**
 * Persistence for per-model health tests.
 *
 * Before this existed, `POST /connections/:id/test-models` returned its verdicts
 * to the browser and nothing else — the results lived in React state and died on
 * navigation. That made "only offer models that actually work" impossible to
 * answer, since nothing on the server knew which models had ever been reached.
 *
 * Results are now written here, which is what `GET /models/tested` reads and what
 * the chat model picker is driven by.
 */
import { getStore } from "./store.js";
import { SUPPORTED_PROVIDER_IDS } from "../config/providers.js";

function toRecord(row) {
  return {
    provider: row.provider,
    modelId: row.modelId,
    name: row.name || row.modelId,
    connectionId: row.connectionId || null,
    /** Which API key answered — the router falls through keys on failure. */
    connectionName: row.connectionName || null,
    ok: row.ok === 1,
    latencyMs: row.latencyMs ?? null,
    status: row.status ?? null,
    error: row.error || null,
    testedAt: row.testedAt,
  };
}

/**
 * Upsert a whole test run. `results` is the array `runModelTests` produces, so
 * this can be called with its return value unchanged.
 */
export async function recordResults(provider, connectionId, results = []) {
  // `connectionId` is the key the test was launched from. Each result may
  // carry its own, because the router falls through keys on failure and stops
  // at the first that works — so a verdict belongs to the key that answered,
  // not the one that was clicked. Falls back to the launched key for results
  // that named none (failures, which no key served).
  if (!Array.isArray(results) || results.length === 0) return { written: 0 };
  const db = await getStore();
  const testedAt = new Date().toISOString();

  db.transaction(() => {
    for (const result of results) {
      if (!result?.modelId) continue;
      db.run(
        `INSERT INTO optiai_model_tests
           (provider, modelId, name, connectionId, connectionName, ok, latencyMs, status, error, testedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(provider, modelId) DO UPDATE SET
           name           = excluded.name,
           connectionId   = excluded.connectionId,
           connectionName = excluded.connectionName,
           ok           = excluded.ok,
           latencyMs    = excluded.latencyMs,
           status       = excluded.status,
           error        = excluded.error,
           testedAt     = excluded.testedAt`,
        [
          provider,
          result.modelId,
          result.name || result.modelId,
          result.connectionId || connectionId || null,
          result.connectionName || null,
          result.ok ? 1 : 0,
          Number.isFinite(result.latencyMs) ? Math.round(result.latencyMs) : null,
          Number.isFinite(result.status) ? result.status : null,
          result.error || null,
          testedAt,
        ]
      );
    }
  });

  return { written: results.length, testedAt };
}

/** Every recorded verdict, newest first. */
export async function listResults(provider) {
  const db = await getStore();
  const rows = provider
    ? db.all(`SELECT * FROM optiai_model_tests WHERE provider = ? ORDER BY testedAt DESC`, [provider])
    : db.all(`SELECT * FROM optiai_model_tests ORDER BY testedAt DESC`);
  return rows.map(toRecord);
}

/** Verdicts for one provider, keyed by model id — what the provider page rehydrates from. */
export async function resultsByProvider(provider) {
  const rows = await listResults(provider);
  return rows.reduce((acc, row) => {
    acc[row.modelId] = row;
    return acc;
  }, {});
}

/**
 * The models the chat composer is allowed to offer: tested, passing, and owned
 * by a provider that still has a live connection.
 *
 * `connectedProviderIds` is passed in rather than looked up here so this module
 * stays a pure read over its own table and the connection check keeps living in
 * services/providers.js.
 */
export async function listUsable(connectedProviderIds = []) {
  const connected = new Set(connectedProviderIds);
  const rows = await listResults();
  return rows
    .filter((row) => row.ok && connected.has(row.provider) && SUPPORTED_PROVIDER_IDS.includes(row.provider))
    .sort((a, b) => (a.latencyMs ?? Infinity) - (b.latencyMs ?? Infinity));
}

/** Drops verdicts for a provider — used when its last connection is removed. */
export async function clearProvider(provider) {
  const db = await getStore();
  db.run(`DELETE FROM optiai_model_tests WHERE provider = ?`, [provider]);
  return { ok: true };
}
