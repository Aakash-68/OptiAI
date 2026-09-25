// The OptiAI skill library.
//
// A skill is a SKILL.md folder under backend/skills/, listed in catalog.json.
// This module owns three things: reading that catalog, the per-skill state a
// user can change (enabled, influence), and turning the enabled set into the
// system block the in-app chat sends. Installing skills onto a developer's
// CLI lives in skillInstall.js.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { getSettings, updateSettings } from "@/lib/db/repos/settingsRepo.js";
import { injectSystemPrompt } from "open-sse/rtk/systemInject.js";

export const SKILLS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../skills");
const CATALOG_FILE = path.join(SKILLS_DIR, "catalog.json");
const SETTINGS_KEY = "optiaiSkills";

export const INFLUENCE_LEVELS = ["low", "medium", "high"];

const badRequest = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

/* -- Catalog --------------------------------------------------------------- */

let catalogCache = null;

/**
 * Splits a SKILL.md into its YAML frontmatter and body. Only `name` and
 * `description` are read; anything else in the frontmatter is passed through
 * untouched when the file is re-emitted for a CLI.
 */
export function parseSkillFile(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) return { frontmatter: {}, raw: "", body: text };
  const raw = match[1];
  const frontmatter = {};
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lines[i]);
    if (!m) continue;
    let value = m[2].trim();
    // Folded scalars (`description: >`) continue on indented lines.
    if (value === ">" || value === "|" || value === ">-" || value === "|-") {
      const parts = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) parts.push(lines[++i].trim());
      value = parts.join(" ");
    }
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    frontmatter[m[1]] = value;
  }
  return { frontmatter, raw, body: match[2] };
}

async function readCatalog() {
  if (catalogCache) return catalogCache;
  const json = JSON.parse(await fs.readFile(CATALOG_FILE, "utf8"));
  const skills = [];
  for (const entry of json.skills || []) {
    const file = path.join(SKILLS_DIR, entry.id, "SKILL.md");
    let text;
    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      console.warn(`[skills] ${entry.id} is listed in catalog.json but has no SKILL.md - skipped`);
      continue;
    }
    const { frontmatter, body } = parseSkillFile(text);
    let extraFiles = [];
    try {
      const refs = await fs.readdir(path.join(SKILLS_DIR, entry.id, "references"));
      extraFiles = refs.map((f) => `references/${f}`);
    } catch {
      /* no references folder */
    }
    skills.push({
      ...entry,
      influence: INFLUENCE_LEVELS.includes(entry.influence) ? entry.influence : "medium",
      description: frontmatter.description || entry.summary,
      skillName: frontmatter.name || entry.id,
      bytes: Buffer.byteLength(text, "utf8"),
      approxTokens: Math.round(Buffer.byteLength(body, "utf8") / 4),
      hash: createHash("sha256").update(text).digest("hex").slice(0, 16),
      extraFiles,
    });
  }
  catalogCache = skills;
  return skills;
}

/** Forget the cached catalog so the next read picks up edited files. */
export function invalidate() {
  catalogCache = null;
}

/* -- State ----------------------------------------------------------------- */

async function readState() {
  const settings = await getSettings();
  const raw = settings[SETTINGS_KEY];
  return {
    enabled: raw?.enabled && typeof raw.enabled === "object" ? raw.enabled : {},
    influence: raw?.influence && typeof raw.influence === "object" ? raw.influence : {},
    chatApply: raw?.chatApply !== false,
  };
}

async function writeState(patch) {
  const current = await readState();
  const next = {
    enabled: { ...current.enabled, ...(patch.enabled || {}) },
    influence: { ...current.influence, ...(patch.influence || {}) },
    chatApply: patch.chatApply === undefined ? current.chatApply : patch.chatApply,
  };
  await updateSettings({ [SETTINGS_KEY]: next });
  return next;
}

function decorate(skill, state) {
  const enabled = state.enabled[skill.id] ?? Boolean(skill.defaultEnabled);
  const influence = INFLUENCE_LEVELS.includes(state.influence[skill.id]) ? state.influence[skill.id] : skill.influence;
  return { ...skill, enabled, influence, defaultInfluence: skill.influence };
}

/** Every skill with its current state. The shape the frontend renders. */
export async function list() {
  const [catalog, state] = await Promise.all([readCatalog(), readState()]);
  const skills = catalog.map((s) => decorate(s, state));
  return {
    skills: skills.map(({ hash, extraFiles, ...s }) => s),
    chatApply: state.chatApply,
    enabledCount: skills.filter((s) => s.enabled).length,
    dir: SKILLS_DIR,
  };
}

/** Every skill with state, hash and extra files - what the installer needs. */
export async function listAll() {
  const [catalog, state] = await Promise.all([readCatalog(), readState()]);
  return catalog.map((s) => decorate(s, state));
}

/** One skill including its full SKILL.md text. */
export async function get(id) {
  const [catalog, state] = await Promise.all([readCatalog(), readState()]);
  const skill = catalog.find((s) => s.id === id);
  if (!skill) {
    const error = new Error(`No skill "${id}" in the OptiAI library`);
    error.status = 404;
    throw error;
  }
  const content = await fs.readFile(path.join(SKILLS_DIR, id, "SKILL.md"), "utf8");
  const { hash, ...rest } = decorate(skill, state);
  return { ...rest, content };
}

export async function update(id, { enabled, influence } = {}) {
  const catalog = await readCatalog();
  if (!catalog.some((s) => s.id === id)) {
    const error = new Error(`No skill "${id}" in the OptiAI library`);
    error.status = 404;
    throw error;
  }
  const patch = {};
  if (enabled !== undefined) {
    if (typeof enabled !== "boolean") throw badRequest("enabled must be a boolean");
    patch.enabled = { [id]: enabled };
  }
  if (influence !== undefined) {
    if (!INFLUENCE_LEVELS.includes(influence)) throw badRequest(`influence must be one of ${INFLUENCE_LEVELS.join(", ")}`);
    patch.influence = { [id]: influence };
  }
  const state = await writeState(patch);
  return decorate(catalog.find((s) => s.id === id), state);
}

export async function updateSettingsPatch({ chatApply } = {}) {
  if (chatApply !== undefined && typeof chatApply !== "boolean") throw badRequest("chatApply must be a boolean");
  const state = await writeState({ chatApply });
  return { chatApply: state.chatApply };
}

/* -- Resolution ------------------------------------------------------------ */

const ORDER = { high: 0, medium: 1, low: 2 };

/**
 * The skills to apply, in influence order. With `ids` (a Project's picks)
 * only those are used, still subject to their influence; without, every
 * enabled skill.
 */
export async function resolve(ids) {
  const [catalog, state] = await Promise.all([readCatalog(), readState()]);
  const all = catalog.map((s) => decorate(s, state));
  const chosen = Array.isArray(ids) && ids.length > 0 ? all.filter((s) => ids.includes(s.id)) : all.filter((s) => s.enabled);
  return {
    chatApply: state.chatApply,
    skills: chosen.sort((a, b) => ORDER[a.influence] - ORDER[b.influence] || a.id.localeCompare(b.id)),
  };
}

/**
 * The SKILL.md as a CLI should see it. The frontmatter is regenerated so the
 * name always matches the folder OptiAI installs into (a vendored file may
 * carry a different name), and low influence becomes `disable-model-invocation`
 * so only the user can trigger it with /name. Everything else in the original
 * frontmatter is preserved.
 */
export async function renderForInstall(skill) {
  const text = await fs.readFile(path.join(SKILLS_DIR, skill.id, "SKILL.md"), "utf8");
  const { frontmatter, body } = parseSkillFile(text);
  const out = { ...frontmatter, name: skill.id, description: frontmatter.description || skill.summary };
  if (skill.influence === "low") out["disable-model-invocation"] = "true";
  else delete out["disable-model-invocation"];
  const yaml = Object.entries(out)
    .map(([k, v]) => `${k}: ${JSON.stringify(String(v))}`)
    .join("\n");
  return `---\n${yaml}\n---\n${body.startsWith("\n") ? body.slice(1) : body}`;
}

/* -- Chat injection -------------------------------------------------------- */

const FRAME = {
  high: "Always apply this skill to every reply in this conversation.",
  medium: "Apply this skill whenever the request matches its description.",
};

/**
 * One system block from the chosen skills. High and medium carry the full
 * body; low carries only the name and description so the model knows the
 * approach exists without paying for its text on every turn.
 */
export async function buildPrompt(skills) {
  if (!skills.length) return "";
  const sections = [];
  const hints = [];
  for (const skill of skills) {
    if (skill.influence === "low") {
      hints.push(`- ${skill.id}: ${skill.description}`);
      continue;
    }
    const text = await fs.readFile(path.join(SKILLS_DIR, skill.id, "SKILL.md"), "utf8");
    const { body } = parseSkillFile(text);
    sections.push(`## Skill: ${skill.id}\n${FRAME[skill.influence]}\n\n${body.trim()}`);
  }
  const parts = ["# OptiAI skills\nThe following skills are active for this conversation. Follow them as standing instructions."];
  if (sections.length) parts.push(sections.join("\n\n"));
  if (hints.length) parts.push(`## Available on request\nUse one of these approaches when the user asks for it:\n${hints.join("\n")}`);
  return parts.join("\n\n");
}

/**
 * Applies skills to an OpenAI-format chat body in place. Returns the ids that
 * were applied so the caller can report them.
 */
export async function applyToChatBody(body, { apply, ids } = {}) {
  if (apply === false) return [];
  const { chatApply, skills } = await resolve(ids);
  if (!chatApply || skills.length === 0) return [];
  const prompt = await buildPrompt(skills);
  if (!prompt) return [];
  // 9Router's own injector: idempotent, format-aware, and it appends to an
  // existing system message rather than adding a competing one.
  injectSystemPrompt(body, "openai", prompt);
  return skills.map((s) => s.id);
}
