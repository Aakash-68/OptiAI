# Skills subsystem design

Date: 2026-09-24. Status: implemented in the same session, autonomous mode. Assumptions are marked.

## Purpose

Make OptiAI's skill library real. A skill is a SKILL.md folder that OptiAI owns and can:

1. install onto the developer's machine so their coding CLI (Claude Code, Codex, OpenCode) picks it up and auto-invokes it from its description, without the user typing a slash command, and
2. apply inside OptiAI's own chat, where there is no disk-based skill mechanism.

9Router has no equivalent. Its "Token Saver" is a set of global flags that append a hardcoded prompt string to every request. That pattern is kept only as the chat fallback, and only with real SKILL.md content.

## Skill store

`backend/skills/` is the single source of truth.

- `backend/skills/catalog.json` lists every skill with its metadata: id, name, kind, category, summary, detail, author, version, source (vendored or optiai, URL, license, upstream commit), default influence, tags, token impact, requirements, default enabled.
- `backend/skills/<id>/SKILL.md` is the skill body. External skills are vendored verbatim (SKILL.md only, plus a `references/` folder where the body reads from it). OptiAI-authored skills are written here.
- Nothing is installable that is not in the catalog. There is no arbitrary Git install.

Vendored: caveman, caveman-commit, caveman-review (juliusbrussee/caveman); ponytail, ponytail-review (dietrichgebert/ponytail); emil-design-eng, animate, apple-design (emilkowalski/skills); tasteful-output, anti-slop-audit (dnh33/tasteful-llm); graphify (Graphify-Labs/graphify); super-mem (franksde/supermemory-cli, assumption: "Super-mem" means the Supermemory agent skill).

OptiAI-authored: handoff-md, sql-queries, doc-writer, research-brief, frontend-engineering, backend-engineering, api-design, code-craft, prompt-porter, spec-writer.

## State

Stored in 9Router's `settings` row under one key, `optiaiSkills`:

```json
{ "enabled": { "caveman": true }, "influence": { "caveman": "high" }, "chatApply": true }
```

Missing keys fall back to the catalog defaults. The settings table is reused so no new migration is needed and the state survives with the rest of the database.

## Influence levels

One setting per skill: low, medium, high. It means the same thing in both places.

| Level | In chat | On the CLI |
| --- | --- | --- |
| high | Full SKILL.md body injected, framed as "always apply" | Installed as-is, model-invocable |
| medium | Full body injected, framed as "apply when the task matches" | Installed as-is, model-invocable |
| low | Only name and description injected as an available approach | Installed with `disable-model-invocation: true`, so only `/name` invokes it |

## CLI installation

Service `backend/services/skillInstall.js`. Targets:

| Tool | User scope | Project scope |
| --- | --- | --- |
| claude | `~/.claude/skills/<id>/` | `<dir>/.claude/skills/<id>/` |
| codex | `~/.codex/skills/<id>/` | not offered |
| opencode | `~/.config/opencode/skills/<id>/` | `<dir>/.opencode/skills/<id>/` |

Files are copied, not junctioned, so the CLI never depends on OptiAI running. Every directory OptiAI writes carries a `.optiai.json` marker with the skill id, version, content hash and install time. Sync writes every enabled skill and removes managed directories for skills that are disabled. A directory without the marker is never touched and is reported as "foreign". Status per skill per target: managed, stale, foreign, absent.

The rule in `cli.js` that OptiAI never writes into a developer's tool config stays for endpoint config. Skill directories are additive files with a marker, and every write happens only on an explicit Sync click.

## Chat application

`POST /api/chat` accepts an OptiAI-only field `skills: { apply?: boolean, ids?: string[] }`, stripped before 9Router sees the body. When apply is not false and the global `chatApply` setting is on, the backend builds one system block from the chosen skills (the given ids, else every enabled skill), ordered high to low, and prepends it with 9Router's own `injectSystemPrompt` for the OpenAI format. The applied ids are returned on the `x-optiai-skills` response header and stored on the trace row so Usage can show which skills shaped a reply.

The composer gets a Skills chip that toggles application per browser and shows the count. A thread inside a Project sends that Project's skill ids; a plain thread sends none and gets the enabled set.

## API

- `GET /api/skills` catalog with state and body size
- `GET /api/skills/:id` one skill including the SKILL.md body
- `PATCH /api/skills/:id` `{ enabled?, influence? }`
- `PATCH /api/skills/settings` `{ chatApply? }`
- `GET /api/skills/targets?projectDir=` install status per tool and skill
- `POST /api/skills/sync` `{ tool, scope, projectDir? }`
- `POST /api/skills/uninstall` `{ tool, scope, projectDir? }` removes managed dirs only

## Out of scope this round

Linking skills to combos, MCP-based skills, arbitrary Git installs, and rewriting the Connect tab. Combos stay model-only.
