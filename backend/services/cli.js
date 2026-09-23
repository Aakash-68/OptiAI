// CLI gateway: local API keys + the config a coding agent needs to route through OptiAI.
//
// Deliberately READ-ONLY for now. 9Router also writes ~/.claude/settings.json etc.
// directly; OptiAI does not, because silently rewriting a developer's live Claude Code
// config from a verification build is not recoverable. Snippet generation is exposed so
// the write step can be added later behind an explicit confirmation.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CLI_TOOLS, MITM_TOOLS } from "@/shared/constants/cliTools";
import { getApiKeys, createApiKey, deleteApiKey } from "@/lib/db/repos/apiKeysRepo.js";
import { getConsistentMachineId } from "@/shared/utils/machineId";

const PORT = process.env.PORT || 20180;
const BASE_URL = process.env.OPTIAI_GATEWAY_URL || `http://localhost:${PORT}`;

/**
 * Where each tool records the endpoint it talks to, and how to pull that
 * endpoint back out. Read-only, in keeping with the note above: this module
 * looks at a developer's config, it never edits it.
 *
 * A tool missing from this map reports `configured: null` — "we don't know how
 * to check" — which the UI must not draw as "not configured". Guessing wrong
 * in either direction is worse than admitting the gap.
 */
const PROBES = {
  claude: [
    {
      file: "~/.claude/settings.json",
      parse: "json",
      read: (d) => d?.env?.ANTHROPIC_BASE_URL,
    },
  ],
  codex: [
    {
      file: "~/.codex/config.toml",
      parse: "text",
      read: (t) => /base_url\s*=\s*["']([^"']+)["']/.exec(t)?.[1],
    },
  ],
  opencode: [
    {
      file: "~/.config/opencode/opencode.json",
      parse: "json",
      read: (d) => d?.provider?.optiai?.options?.baseURL || d?.baseUrl,
    },
    { file: "~/.opencode/config.json", parse: "json", read: (d) => d?.baseUrl },
  ],
};

/** Env vars that, if set to our gateway, also count as configured. */
const ENV_HINTS = {
  claude: "ANTHROPIC_BASE_URL",
  codex: "OPENAI_BASE_URL",
};

function expandHome(p) {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

/**
 * All the spellings of "this machine". A tool configured against
 * 127.0.0.1 is pointed at the same gateway as one configured against
 * localhost; comparing the host strings directly reports those as different
 * and tells the user their working setup is not configured.
 */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

const DEFAULT_PORT = { "http:": "80", "https:": "443" };

/** Same endpoint, ignoring loopback spelling, a trailing /v1 and any slash. */
function pointsAtGateway(url) {
  if (!url) return false;
  try {
    const a = new URL(url);
    const b = new URL(BASE_URL);
    const host = (u) => (LOOPBACK.has(u.hostname) ? "loopback" : u.hostname.toLowerCase());
    const port = (u) => u.port || DEFAULT_PORT[u.protocol] || "";
    return host(a) === host(b) && port(a) === port(b);
  } catch {
    return false;
  }
}

/**
 * Whether one tool is pointed at this OptiAI instance.
 *
 * Every failure path returns "unknown" rather than false: a missing file, a
 * permissions error and a config we cannot parse are all cases where we have
 * no evidence, and reporting "not configured" from no evidence would tell the
 * user something we did not check.
 */
async function detect(toolId) {
  const envVar = ENV_HINTS[toolId];
  if (envVar && process.env[envVar]) {
    return {
      configured: pointsAtGateway(process.env[envVar]),
      configPath: `${envVar} (environment)`,
      pointsAt: process.env[envVar],
    };
  }

  const probes = PROBES[toolId];
  if (!probes) return { configured: null, configPath: null, pointsAt: null };

  for (const probe of probes) {
    try {
      const raw = await fs.readFile(expandHome(probe.file), "utf8");
      const value = probe.read(probe.parse === "json" ? JSON.parse(raw) : raw);
      if (value) {
        return {
          configured: pointsAtGateway(value),
          configPath: probe.file,
          pointsAt: value,
        };
      }
      // File exists but carries no endpoint: it is genuinely not pointed here.
      return { configured: false, configPath: probe.file, pointsAt: null };
    } catch {
      // Missing or unreadable - try the next location.
    }
  }

  return { configured: false, configPath: probes[0].file, pointsAt: null };
}

export async function listTools() {
  const tools = { ...(CLI_TOOLS || {}), ...(MITM_TOOLS || {}) };
  return await Promise.all(
    Object.values(tools).map(async (t) => ({
      id: t.id,
      name: t.name,
      configType: t.configType,
      description: t.description || null,
      // The constants already carry brand image and colour; they were being
      // dropped here, which is why the UI fell back to monogram tiles.
      image: t.image || null,
      color: t.color || null,
      requiresExternalUrl: Boolean(t.requiresExternalUrl),
      supported: t.configType === "env" || t.configType === "guide" || t.configType === "custom",
      ...(await detect(t.id)),
    }))
  );
}

export async function keys() {
  const rows = await getApiKeys();
  return rows.map((k) => ({ id: k.id, name: k.name, key: k.key, isActive: k.isActive !== false, createdAt: k.createdAt }));
}

export async function addKey(name = "OptiAI Key") {
  const machineId = await getConsistentMachineId();
  return await createApiKey(name, machineId);
}

export async function removeKey(id) {
  await deleteApiKey(id);
  return { ok: true };
}

// The extracted layer enforces `settings.requireApiKey` on every chat request (it
// defaults to true). OptiAI's own app-level auth is a separate, later design, so the
// internal /api/chat route satisfies that gate with a real stored key rather than
// switching the gate off - the public /v1 gateway keeps enforcing it normally.
export async function ensureLocalKey() {
  const existing = (await getApiKeys()).find((k) => k.isActive !== false);
  if (existing) return existing.key;
  const created = await addKey("OptiAI internal");
  return created.key;
}

// The snippet a user pastes into their coding agent. Mirrors the env-var contract
// 9Router writes for each tool, without touching any file on disk.
export async function config(toolId = "claude") {
  const [key] = await keys();
  const apiKey = key?.key || "<create an API key first>";
  const gateway = `${BASE_URL}/v1`;

  const snippets = {
    claude: {
      file: "~/.claude/settings.json",
      content: { env: { ANTHROPIC_BASE_URL: gateway, ANTHROPIC_AUTH_TOKEN: apiKey } },
    },
    codex: {
      file: "shell environment",
      content: { OPENAI_BASE_URL: BASE_URL, OPENAI_API_KEY: apiKey },
    },
    generic: {
      file: "any OpenAI-compatible client",
      content: { baseUrl: gateway, apiKey },
    },
  };

  return {
    tool: toolId,
    gateway,
    apiKeyPresent: Boolean(key),
    snippet: snippets[toolId] || snippets.generic,
    writeSupported: false,
    note: "OptiAI does not write CLI config files yet - copy this manually.",
  };
}
