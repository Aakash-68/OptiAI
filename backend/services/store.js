/**
 * OptiAI's own tables, living in the same SQLite file as 9Router's.
 *
 * Every table here is prefixed `optiai_` and created on demand. 9Router's
 * migrate.js only knows about its own tables and never drops unknown ones, so
 * this adds state without editing a single file under backend/9router — the
 * byte-identical re-sync guarantee stays intact.
 *
 * Two things are recorded that 9Router has no concept of:
 *   - which models were actually reached successfully (`optiai_model_tests`)
 *   - one row per prompt, from send to completion (`optiai_traces`)
 */
import { getAdapter } from "@/lib/db/driver.js";

let ensured = null;

const SCHEMA = [
  // One row per (provider, model). Re-testing a model overwrites its verdict
  // rather than appending, because the question the chat picker asks is
  // "does this model work *now*", not "did it ever work".
  `CREATE TABLE IF NOT EXISTS optiai_model_tests (
     provider     TEXT NOT NULL,
     modelId      TEXT NOT NULL,
     name           TEXT,
     connectionId   TEXT,
     connectionName TEXT,
     ok           INTEGER NOT NULL DEFAULT 0,
     latencyMs    INTEGER,
     status       INTEGER,
     error        TEXT,
     testedAt     TEXT NOT NULL,
     PRIMARY KEY (provider, modelId)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_optiai_model_tests_ok ON optiai_model_tests(ok, provider)`,

  // One row per prompt. `promptId` is the global handle: it is minted before the
  // request leaves OptiAI and is echoed to the browser, so a single id ties the
  // composer, the transcript, the usage row and any later analysis together.
  `CREATE TABLE IF NOT EXISTS optiai_traces (
     promptId       TEXT PRIMARY KEY,
     threadId       TEXT,
     messageId      TEXT,
     createdAt      TEXT NOT NULL,
     completedAt    TEXT,
     status         TEXT NOT NULL DEFAULT 'pending',
     error          TEXT,
     source         TEXT,
     mode           TEXT,
     requestedModel TEXT,
     resolvedModel  TEXT,
     provider       TEXT,
     promptChars    INTEGER DEFAULT 0,
     turnCount      INTEGER DEFAULT 0,
     inputTokens    INTEGER DEFAULT 0,
     outputTokens   INTEGER DEFAULT 0,
     cachedTokens   INTEGER DEFAULT 0,
     reasoningTokens INTEGER DEFAULT 0,
     totalTokens    INTEGER DEFAULT 0,
     cost           REAL DEFAULT 0,
     estimated      INTEGER DEFAULT 0,
     ttftMs         INTEGER,
     latencyMs      INTEGER
   )`,
  `CREATE INDEX IF NOT EXISTS idx_optiai_traces_createdAt ON optiai_traces(createdAt DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_optiai_traces_thread ON optiai_traces(threadId)`,
];

/**
 * Columns added after a table shipped. `CREATE TABLE IF NOT EXISTS` does
 * nothing to a table that already exists, so a new column needs its own ALTER
 * — which throws on a database that already has it, hence the swallow.
 */
const ADDED_COLUMNS = [
  `ALTER TABLE optiai_model_tests ADD COLUMN connectionName TEXT`,
];

/**
 * Returns the shared adapter with OptiAI's tables guaranteed to exist.
 * Memoized on the first call — `CREATE TABLE IF NOT EXISTS` is cheap but this
 * runs on every chat request, so it should not re-issue six statements each time.
 */
export function getStore() {
  ensured ??= (async () => {
    const db = await getAdapter();
    for (const statement of SCHEMA) db.run(statement);
    for (const statement of ADDED_COLUMNS) {
      try {
        db.run(statement);
      } catch {
        // Already present — the only expected failure here.
      }
    }
    return db;
  })();
  return ensured;
}
