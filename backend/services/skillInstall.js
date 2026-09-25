// Installs OptiAI skills onto the developer's machine so their coding CLI
// discovers them from disk and auto-invokes them from the description.
//
// Files are copied, not linked: a CLI must keep working when OptiAI is not
// running. Every directory written here carries a `.optiai.json` marker; a
// directory without one was made by the user (or another tool) and is never
// modified or removed, whatever its name.
//
// This is the one place OptiAI writes under a developer's tool directory.
// It only happens on an explicit sync from the Skills tab.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { listAll, renderForInstall, SKILLS_DIR } from "./skills.js";

const MARKER = ".optiai.json";

/**
 * Where each tool reads skills from. `user` is the developer-wide location,
 * `project` is inside a repository. Codex is user-only here because its
 * project-scope path is not confirmed against its docs.
 */
export const TARGETS = {
  claude: {
    id: "claude",
    name: "Claude Code",
    user: () => path.join(os.homedir(), ".claude", "skills"),
    project: (dir) => path.join(dir, ".claude", "skills"),
    note: "Skills apply to the next turn without restarting. Use /reload-plugins if the list looks stale.",
  },
  codex: {
    id: "codex",
    name: "OpenAI Codex CLI",
    user: () => path.join(process.env.CODEX_HOME || path.join(os.homedir(), ".codex"), "skills"),
    project: null,
    note: "Read from ~/.codex/skills (or $CODEX_HOME/skills).",
  },
  opencode: {
    id: "opencode",
    name: "OpenCode",
    user: () => path.join(os.homedir(), ".config", "opencode", "skills"),
    project: (dir) => path.join(dir, ".opencode", "skills"),
    note: "OpenCode also reads .claude/skills, so a Claude Code project install covers it.",
  },
};

const badRequest = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

function rootFor(tool, scope, projectDir) {
  const target = TARGETS[tool];
  if (!target) throw badRequest(`Unknown tool "${tool}". Use one of ${Object.keys(TARGETS).join(", ")}`);
  if (scope === "user") return target.user();
  if (scope === "project") {
    if (!target.project) throw badRequest(`${target.name} has no project-scope install`);
    const dir = String(projectDir || "").trim();
    if (!dir) throw badRequest("projectDir is required for a project-scope install");
    return target.project(path.resolve(dir));
  }
  throw badRequest('scope must be "user" or "project"');
}

async function readMarker(dir) {
  try {
    return JSON.parse(await fs.readFile(path.join(dir, MARKER), "utf8"));
  } catch {
    return null;
  }
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * managed  - OptiAI wrote it and it matches the current skill
 * stale    - OptiAI wrote it, but the skill or its influence changed since
 * foreign  - a folder with that name exists and OptiAI did not write it
 * absent   - nothing there
 */
async function statusOf(root, skill) {
  const dir = path.join(root, skill.id);
  if (!(await exists(dir))) return { status: "absent" };
  const marker = await readMarker(dir);
  if (!marker) return { status: "foreign" };
  const current = marker.hash === skill.hash && marker.influence === skill.influence;
  return { status: current ? "managed" : "stale", installedAt: marker.installedAt };
}

/** Install status for every skill on every target, for the Skills tab. */
export async function targets({ projectDir } = {}) {
  const all = await listAll();
  const out = [];
  for (const target of Object.values(TARGETS)) {
    for (const scope of ["user", "project"]) {
      if (scope === "project" && (!target.project || !projectDir)) continue;
      let root;
      try {
        root = rootFor(target.id, scope, projectDir);
      } catch {
        continue;
      }
      const rows = await Promise.all(all.map(async (s) => ({ id: s.id, enabled: s.enabled, ...(await statusOf(root, s)) })));
      out.push({
        tool: target.id,
        name: target.name,
        scope,
        root,
        note: target.note,
        exists: await exists(root),
        managed: rows.filter((r) => r.status === "managed").length,
        stale: rows.filter((r) => r.status === "stale").length,
        foreign: rows.filter((r) => r.status === "foreign").length,
        pending: rows.filter((r) => r.enabled && r.status === "absent").length,
        skills: rows,
      });
    }
  }
  return { enabledCount: all.filter((s) => s.enabled).length, targets: out };
}

async function writeSkill(root, skill) {
  const dir = path.join(root, skill.id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "SKILL.md"), await renderForInstall(skill), "utf8");
  for (const rel of skill.extraFiles || []) {
    const src = path.join(SKILLS_DIR, skill.id, rel);
    const dst = path.join(dir, rel);
    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.copyFile(src, dst);
  }
  await fs.writeFile(
    path.join(dir, MARKER),
    JSON.stringify(
      { skillId: skill.id, version: skill.version, hash: skill.hash, influence: skill.influence, installedAt: new Date().toISOString(), by: "OptiAI" },
      null,
      2
    ),
    "utf8"
  );
}

/**
 * Make the target match the enabled set: write every enabled skill, remove
 * every OptiAI-managed folder whose skill is now disabled. Foreign folders
 * are reported and left alone.
 */
export async function sync({ tool, scope = "user", projectDir } = {}) {
  const root = rootFor(tool, scope, projectDir);
  const all = await listAll();
  await fs.mkdir(root, { recursive: true });

  const written = [];
  const removed = [];
  const skipped = [];
  for (const skill of all) {
    const { status } = await statusOf(root, skill);
    if (skill.enabled) {
      if (status === "foreign") {
        skipped.push({ id: skill.id, reason: "a folder with this name already exists and was not created by OptiAI" });
        continue;
      }
      await writeSkill(root, skill);
      written.push(skill.id);
    } else if (status === "managed" || status === "stale") {
      await fs.rm(path.join(root, skill.id), { recursive: true, force: true });
      removed.push(skill.id);
    }
  }
  return { tool, scope, root, written, removed, skipped, note: TARGETS[tool].note };
}

/** Remove every OptiAI-managed folder from the target. Never touches foreign ones. */
export async function uninstall({ tool, scope = "user", projectDir } = {}) {
  const root = rootFor(tool, scope, projectDir);
  const removed = [];
  if (!(await exists(root))) return { tool, scope, root, removed };
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(root, entry.name);
    const marker = await readMarker(dir);
    if (marker?.by !== "OptiAI") continue;
    await fs.rm(dir, { recursive: true, force: true });
    removed.push(entry.name);
  }
  return { tool, scope, root, removed };
}
