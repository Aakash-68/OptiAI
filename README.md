# OptiAI

An AI optimizer built on routing logic extracted from [9Router](https://github.com/) v0.5.75.

This repository contains the extracted 9Router backend layer, a thin OptiAI API around it,
and the OptiAI product UI — nine tabs covering chat, projects, model discovery, provider
connections, usage, analytics, skills and CLI integration.

OptiAI supports **16 enterprise providers** (147 chat models), each reached with a licensed
API credential. Connections are real: API keys are validated against the live provider and
persisted, and OAuth runs the provider's genuine authorize → exchange flow. See
[Supported providers](#supported-providers).

Combos created in the UI are still browser-held — `combosRepo` has full CRUD but no route.
See [Known limitations](#known-limitations).

---

## Run it

```bash
# 1. install everything (npm workspaces: root + backend + frontend in one pass)
npm install

# 2. create the backend env file
cp backend/.env.example backend/.env

# 3. start backend + frontend together
npm run app
```

> Run `npm install` **from the repo root only**. This is an npm workspaces project, so the
> root install covers both packages. Do not run `npm --prefix backend install` — with a
> prefix, npm installs the *root* package into the child and adds a bogus
> `"optiai": "file:.."` dependency.

| Service  | URL                     |
| -------- | ----------------------- |
| Frontend | http://localhost:20181  |
| Backend  | http://127.0.0.1:20180  |
| Gateway  | http://127.0.0.1:20180/v1 |

`Ctrl+C` stops both processes.

### If startup fails

| Symptom | Fix |
| ------- | --- |
| `EADDRINUSE :::20181` (or 20180) | A previous run is still alive. `Get-NetTCPConnection -LocalPort 20180,20181 -State Listen \| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }` |
| `EPERM: operation not permitted, rename … .next\dev\…` | Turbopack's manifest writes race Windows Defender's real-time scanner on this repo. The dev script therefore runs **webpack** (`next dev --webpack`) — keep it that way. If you hit this anyway: `Remove-Item -Recurse -Force frontend\.next` then `npm run app`. `npm run dev:turbo -w frontend` opts back into Turbopack if you have a Defender exclusion for the repo. Symptom when it does happen: the first route loads, then every subsequent route 500s with `Could not find files for /_error in .next/build-manifest.json` |
| `"optiai": "file:.."` appears in a package.json | You ran `npm install` with `--prefix`. Delete that line and re-run `npm install` from the root |

> **First run is empty on purpose.** OptiAI stores its data in `backend/.data`, separate
> from any existing 9Router install (`%APPDATA%/9router`), so it never touches data you
> already have. With no provider connected, chat requests correctly fail with
> `No active credentials for provider: …`. See [Connecting a provider](#connecting-a-provider).

---

## Project structure

```
OptiAI/
├── backend/
│   ├── 9router/                  # extracted 9Router logic (422 files, near byte-identical)
│   │   ├── open-sse/             #   the routing/translation engine
│   │   │   ├── providers/        #     123-file provider registry + pricing + capabilities
│   │   │   ├── translator/       #     format translation (OpenAI ⇄ Claude ⇄ Gemini ⇄ …)
│   │   │   ├── executors/        #     per-provider upstream calls (+ DefaultExecutor)
│   │   │   ├── handlers/         #     chatCore: detect → translate → dispatch → stream
│   │   │   ├── rtk/              #     token savers: 11 filters, caveman, ponytail
│   │   │   ├── services/         #     combo fallback, token refresh, quota readers
│   │   │   ├── config/           #     provider/model/runtime constants
│   │   │   └── utils/            #     SSE streaming, usage extraction, proxy fetch
│   │   ├── src/
│   │   │   ├── lib/db/           #     SQLite layer (driver chain + repos + migrations)
│   │   │   ├── lib/oauth/        #     per-provider OAuth flows + PKCE
│   │   │   ├── sse/              #     combo expansion + account-selection loop
│   │   │   ├── shared/           #     API-key format, machine id, CLI tool definitions
│   │   │   └── app/api/          #     3 provider/model routes kept as plain modules
│   │   └── package.json          #   version marker read by appConstants.js
│   │
│   ├── api/index.js              # OptiAI HTTP surface (Express routers)
│   ├── config/providers.js       # the 16 supported providers — single source of truth
│   ├── skills/                   # the skill library: catalog.json + one SKILL.md folder per skill
│   ├── services/                 # OptiAI service layer — the ONLY caller of 9router/
│   │   ├── skills.js             #   catalog, enable/influence state, chat injection
│   │   └── skillInstall.js       #   writes SKILL.md folders into Claude Code / Codex / OpenCode
│   ├── server/                   # bootstrap + the alias resolver hook
│   ├── .env.example
│   └── package.json
│
├── frontend/                     # OptiAI UI — Next.js 16 · React 19 · TypeScript · Tailwind v4
│   ├── public/
│   │   ├── logo-*.png            #   OptiAI wordmark (light/dark) + mark
│   │   └── providers/            #   16 vendored brand SVGs (@lobehub/icons-static-svg)
│   └── src/
│       ├── app/                  #   one folder per sidebar tab
│       │   ├── layout.tsx        #     fonts, theme bootstrap, global providers
│       │   ├── globals.css       #     design tokens — the single source of colour
│       │   ├── page.tsx          #     redirects to /chat
│       │   ├── chat/             #     Chat + Ask
│       │   ├── projects/         #     persistent workspaces
│       │   ├── models/           #     model discovery + combos
│       │   ├── providers/        #     list + [id] detail with connect flow
│       │   ├── usage/            #     tokens, cost, request log
│       │   ├── analytics/        #     three scores + recommendations
│       │   ├── skills/           #     curated skill/plugin library
│       │   ├── connect/          #     list + [tool] CLI setup
│       │   └── settings/         #     defaults, appearance, system, data
│       │
│       ├── components/
│       │   ├── layout/           #     AppShell, Sidebar, Topbar, ModeSwitch
│       │   ├── ui/               #     Button, Card, Badge, Modal, Input, Toggle,
│       │   │                     #     Tabs, StatCard, EmptyState, Logo, CodeBlock,
│       │   │                     #     ProviderLogo, ProviderAvatar, AiSearchBar
│       │   ├── charts/           #     AreaChart, BarList, Gauge (hand-rolled SVG)
│       │   ├── chat/             #     Composer, MessageList, ModelPicker
│       │   ├── models/           #     combo create/edit/add-model dialogs
│       │   └── providers/        #     ProviderCard, ConnectDialog, ModelGrid
│       │
│       ├── hooks/                #   useApi, useTheme, useChatStore, useChatMode,
│       │                         #   useProjects, useCombos, useModelCatalog
│       └── lib/
│           ├── api.ts            #     typed client for every backend route
│           ├── types.ts          #     response shapes (backend-backed only)
│           ├── nav.ts            #     sidebar definition
│           ├── format.ts         #     shared number/cost/time formatters
│           └── analytics.ts      #     score derivation from real usage
│
├── docs/9router-extraction.md    # path-by-path extraction map
├── package.json                  # npm run app
└── README.md
```

### Frontend conventions

- **Colour comes from the logo, nothing else.** `Assets/Symbol.png` is a single
  blue→violet gradient; its endpoints were sampled directly (`#1F79FC` → `#9642FD`, body
  `#8E55FB`) and became the `brand` and `accent` ramps in `globals.css`. Components never
  reference a raw ramp step — they use semantic tokens (`--surface`, `--text-muted`,
  `--brand`), so light/dark is one place to change.
- **Type**: Plus Jakarta Sans for headings (it echoes the wordmark), Inter for UI text,
  JetBrains Mono for model ids, keys and terminal snippets.
- **No chart library.** The app ships three chart shapes, all hand-rolled SVG. A charting
  dependency would add ~90KB and its own theming layer fighting these CSS variables.
- **Screens that are not backed by an endpoint say so, in place.** Nothing renders invented
  numbers.

### Important files

| File | Why it matters |
| ---- | -------------- |
| `backend/server/hooks.mjs` | Teaches Node the `@/*` and `open-sse/*` aliases 9Router relies on. Without it nothing in `backend/9router` resolves. |
| `backend/server/register.mjs` | Loads that hook — hence `node --import ./server/register.mjs` in every backend script. |
| `backend/services/gateway.js` | Express ⇄ WHATWG `Request`/`Response` bridge. Lets 9Router's Next-style `handleChat` run unmodified, streaming intact. |
| `backend/services/runtime.js` | Boots the DB + translator registry once; backs `/api/health`. |
| `backend/api/index.js` | Every OptiAI route. Thin by design — logic lives in `services/`. |
| `backend/9router/src/sse/handlers/chat.js` | Entry to the routing pipeline: API-key gate, combo expansion, account fallback loop. |
| `backend/9router/open-sse/handlers/chatCore.js` | Format detection, translation, executor dispatch, refresh-and-retry. |
| `backend/9router/open-sse/rtk/` | The token-saving engine (11 filters + autodetect + system-prompt injection). |
| `backend/9router/open-sse/providers/pricing.js` | The single cost formula. Never duplicate this in the frontend. |
| `backend/9router/src/lib/db/repos/usageRepo.js` | Per-request usage rows, daily rollups, cost at write time. |
| `backend/9router/package.json` | `appConstants.js` reads its `version` and sends it upstream in User-Agent headers. |
| `frontend/src/app/globals.css` | Every colour in the product. Brand ramps sampled from the logo, then semantic tokens on top — change light/dark here and nowhere else. |
| `frontend/src/lib/nav.ts` | The nine sidebar tabs. `expandable: true` is what makes Chat reveal its thread list inline. |
| `frontend/src/lib/api.ts` | Typed client for every backend route, including the SSE reader for `/api/chat`. |
| `frontend/src/lib/analytics.ts` | Turns usage rollups into the three Analytics scores. Swap this one module when a real analytics endpoint lands. |
| `frontend/src/hooks/useModelCatalog.ts` | Aggregates models across providers without making 119 round trips. |

---

## How the 9Router logic is organized

The extracted tree keeps **upstream's exact paths**. That is deliberate:

- relative imports inside the tree keep working untouched,
- `docs/9router-extraction.md` stays a 1:1 map,
- re-syncing a fix from upstream 9Router is a file copy, not a merge.

Only **6 files** differ from upstream (all marked with an `// OptiAI:` comment):

| File | Change | Why |
| ---- | ------ | --- |
| `src/app/api/providers/validate/route.js` | `NextResponse` → 1-line `Response.json` shim | drop the `next/server` dependency |
| `src/app/api/providers/[id]/models/route.js` | same | same |
| `src/app/api/models/availability/route.js` | same | same |
| `open-sse/shared/machineId.js` | named CJS import → default + destructure | `node-machine-id` is CommonJS; Next's bundler hid this, plain Node does not |
| `src/shared/utils/machineId.js` | same | same |
| `open-sse/utils/usageTracking.js` | `canonicalizeUsage` now preserves `estimated` | upstream dropped it, making guessed token counts indistinguishable from provider-reported ones |

Everything else is byte-identical.

### Request flow

```
frontend  →  OptiAI API (/api/chat)  →  services/gateway.js
                                            ↓
                          backend/9router/src/sse/handlers/chat.js
                          (API-key gate, combo expansion, account loop)
                                            ↓
                          backend/9router/open-sse/handlers/chatCore.js
                          (format detect → RTK → translate → dispatch)
                                            ↓
                          open-sse/executors/*  →  provider
                                            ↓
                          SSE back  →  usage + cost written to SQLite
```

---

## What was imported

| Area | Imported |
| ---- | -------- |
| Routing engine | `open-sse/` — chatCore, streaming utils, usage extraction, transformer |
| Providers | all 123 registry files (the registry's index imports every one), capabilities, schema, shared helpers |
| Translation | all 48 translator files (OpenAI-pivot + direct routes) |
| Executors | all 30 (kiro, cursor, codex, antigravity, vertex, github… + `DefaultExecutor`) |
| Auth | per-provider OAuth flows, PKCE, device-code, token refresh + refresh locking, credential manager |
| Model management | catalog sync, static catalog, availability/model-locks, aliases, disabled/custom models |
| Pricing | model + provider + pattern pricing tables, cost math, user overrides repo |
| Usage | `usageRepo`, `requestDetailsRepo`, daily rollups, live stats emitter |
| Quota / tiering | `open-sse/services/usage/*` subscription quota readers |
| Fallback | combo routing, account fallback, error rules, rotation |
| Token optimization | all 11 RTK filters, autodetect, caveman, ponytail, system injection |
| CLI gateway | API-key issue/validate, CLI tool definitions, config snippet generation |
| Database | driver fallback chain (`bun:sqlite → better-sqlite3 → node:sqlite → sql.js`), repos, migrations |

## What was intentionally excluded

| Excluded | Why |
| -------- | --- |
| Entire 9Router dashboard (JSX, Zustand stores, UI kit, CSS) | OptiAI builds its own UI |
| Dashboard auth: password login, bcrypt, JWT session, SAML, OIDC, guards | OptiAI's app auth is a separate, later design |
| CLI launcher, tray, autostart, self-update, desktop launcher | OptiAI will have its own launch mechanism |
| MITM proxy + root CA install | needs admin rights; only serves tools with hardcoded API domains |
| Tunnel (cloudflared / Tailscale) | not needed for local verification |
| Proxy pools UI + `proxyTest` beyond what providers import | enterprise egress feature |
| Translator debug console, console-log dashboard | dev tooling, not product |
| i18n | English-only for now |
| TTS / STT / image / video / embeddings / web-search handlers | out of scope for this build; each is one isolated handler to re-add later |
| MCP bridge | **deferred** — OptiAI's skills system (see [Skills](#skills)) is its own feature, not 9Router's MCP bridge |
| Headroom / PXPIPE sidecar processes | only the inert in-tree modules came along as import dependencies; no sidecar is spawned |
| Static `skills/` link list | markdown pointing at GitHub; zero runtime logic |
| Docker / CapRover config | not needed yet |

---

## Environment variables

`backend/.env` (copy from `backend/.env.example`):

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `PORT` | `20180` | Backend HTTP port |
| `HOST` | `127.0.0.1` | Bind address. Keep loopback — this process holds provider credentials |
| `CORS_ORIGIN` | reflect any | Allowed browser origin |
| `OPTIAI_GATEWAY_URL` | `http://localhost:20180` | Base URL printed in CLI config snippets |
| `DATA_DIR` | `./.data` | SQLite DB + credentials. Keep separate from `%APPDATA%/9router` |
| `API_KEY_SECRET` | insecure default | HMAC secret for issued gateway keys — changing it invalidates existing keys |
| `MACHINE_ID_SALT` | insecure default | Salt for the machine id embedded in those keys |

Frontend port is set in `frontend/package.json` (`next dev -p 20181`); the API it calls is
`NEXT_PUBLIC_API_URL` (defaults to `http://127.0.0.1:20180`).

Provider credentials are **not** environment variables — they are stored per connection in
the database once a provider is connected.

---

## Verification endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/health` | backend + DB driver + 9Router layer status |
| GET | `/api/providers` | the 16 supported providers, with model + connection counts |
| GET | `/api/providers/connections` | stored connections (credentials never returned) |
| POST | `/api/providers/connections` | **create an API-key connection** |
| PATCH | `/api/providers/connections/:id` | activate / deactivate a connection |
| DELETE | `/api/providers/connections/:id` | remove a connection |
| POST | `/api/providers/validate` | validate an API key against the real provider |
| POST | `/api/providers/:id/test` | test a stored connection (refreshes OAuth tokens if needed) |
| GET | `/api/oauth/:provider/authorize` | **real authorize URL + PKCE material** |
| POST | `/api/oauth/:provider/exchange` | **exchange the code, write the connection** |
| POST | `/api/oauth/:provider/poll` | device-code polling |
| GET | `/api/models` | every model across all supported providers |
| GET | `/api/models?provider=` | one provider's catalog (404 if unsupported) |
| POST | `/api/connections/:id/test-models` | **ping each model through the real pipeline** |
| GET | `/api/connections/:id/models` | live model list for a connection |
| GET | `/api/models/availability` | active per-model rate-limit locks |
| GET | `/api/models/combos` | configured combos |
| POST | `/api/chat` | chat through the full pipeline (`stream: true` for SSE) |
| GET | `/api/usage/stats\|chart\|recent\|latest` | usage + cost, with `tokenSource` provenance |
| GET | `/api/pricing/:provider/:model` | effective pricing |
| POST | `/api/pricing/calculate` | cost for a token count |
| GET | `/api/optimizer/filters` \| `/levels` | available RTK filters / injection levels |
| POST | `/api/optimizer/compress` | run one RTK filter (or autodetect) over text |
| POST | `/api/optimizer/compress-body` | run RTK over a full chat body |
| POST | `/api/optimizer/inject-preview` | preview caveman/ponytail system injection |
| GET | `/api/skills` \| `/api/skills/:id` | the skill library with state; one skill with its SKILL.md |
| PATCH | `/api/skills/:id` \| `/api/skills/settings` | enable / influence per skill; apply-in-chat switch |
| GET | `/api/skills/targets?projectDir=` | install status per CLI tool and scope |
| POST | `/api/skills/sync` \| `/api/skills/uninstall` | **write enabled skills to a CLI's skills folder** / remove OptiAI-managed ones |
| GET | `/api/cli/tools` \| `/config` \| `/keys` | CLI gateway info and local API keys |
| POST | `/v1/chat/completions` \| `/v1/messages` \| `/v1/responses` | raw gateway for real CLI tools |

---

## The UI

Nine tabs, in sidebar order. The rail is nav only — no "New chat" button or search box at
the top. **Chat** is the one expandable item: selecting it reveals the thread list inline,
pushing the tabs below it down; the chevron on the Chat pill collapses that list without
navigating away. The topbar is empty on every tab except Chat, where it carries the
**Chat / Ask** switch.

| Tab | What it does | Backed by |
| --- | --- | --- |
| **Projects** | Persistent workspaces — standing instructions, files, preferred model, active skills. Chats started inside one inherit its context. | browser |
| **Chat** | Direct chat through the routing pipeline. **Chat** sends your prompt to the model; **Ask** has OptiAI rewrite the prompt, name what context is missing, and say what class of model it needs. Every answer carries a telemetry footer: model, tokens, cost, latency. | `/api/chat` (live) · threads in browser |
| **Models** | Model discovery with provider/capability/price filters, plus combos. Natural-language search is present but falls back to keyword filtering until a provider is connected. | `/api/models` (live) · combo writes in browser |
| **Providers** | The 16 supported providers with real brand marks. Connect by API key (validated, then saved) or OAuth (genuine authorize then exchange). Detail page carries connections, round-robin, and a model grid where clicking a tile toggles it: green selected, grey off, red when a live test failed. | fully live |
| **Usage** | KPI tiles, token/cost trend, distribution by model/provider/endpoint, input-output split, and the raw request log. | fully live |
| **Analytics** | Three 0–100 gauges — **Efficiency**, **Model Fit**, **Prompt Craft** — each with its reasoning, plus pros/cons and suggestions that link to the skill implementing them. Derived deterministically from recorded usage; no model call. | derived from live usage |
| **Skills** | The OptiAI library: 22 real SKILL.md skills under `backend/skills/` (12 vendored from reviewed repos at pinned commits, 10 written by OptiAI). Per-skill enable and a Low / Medium / High influence level. **Install to your CLI** writes enabled skills into Claude Code, Codex or OpenCode's skills folder so they auto-invoke from their description; in-app chat sends them as standing instructions instead. Arbitrary Git repositories cannot be installed. | `/api/skills/*` (live) |
| **Connect** | CLI integration center. Issue gateway keys, then per tool get the exact PowerShell / CMD / bash commands to run yourself, plus a smoke test. | `/api/cli/*` (live) |
| **Settings** | Theme, chat defaults, live backend/DB/router status, local-data reset. | live status |

Light and dark are both supported; the theme is applied before first paint, so there is no
flash, and it is switched under Settings → Appearance.

## Supported providers

| Provider | Auth | Notes |
| --- | --- | --- |
| OpenAI | API key | GPT-5 and o-series |
| Anthropic | API key | Claude Opus / Sonnet / Haiku |
| Google Gemini | API key | AI Studio key |
| Google Vertex AI | API key | needs GCP project + region |
| Azure OpenAI | API key | needs resource endpoint; models are *your deployment names* |
| xAI (Grok) | API key **or** OAuth | dual-mode; API key preferred for company use |
| Mistral AI | API key | EU-hosted |
| Cohere | API key | Command + embeddings |
| DeepSeek | API key | low cost per token |
| Groq | API key | lowest latency |
| Cerebras | API key | wafer-scale inference |
| Together AI | API key | hosted open weights |
| Fireworks AI | API key | fine-tuning / LoRA |
| Perplexity | API key | Sonar, web-grounded |
| OpenRouter | API key | universal fallback |
| NVIDIA NIM | API key | Nemotron + open weights on NIM |

**Deliberately excluded:** every provider that works by proxying a consumer subscription or
an IDE's OAuth session — Claude Code, Codex, Cursor, GitHub Copilot, Kiro, Antigravity,
Windsurf, Trae, Zed and the rest. 9Router ships those behind a *"account may be restricted
or banned"* notice, which rules them out for company use however well they work.

### How the narrowing is enforced

`backend/config/providers.js` is the single source of truth. Every catalog, model and auth
route filters through it, so nothing outside the 16 is reachable: `GET /api/models?provider=kiro`
returns **404**, and so does an attempt to create a connection or open an auth flow for it.

The 9Router registry still carries all 123 provider files on disk, deliberately.
`open-sse/providers/registry/index.js` imports every one of them, so deleting files breaks
the registry outright — and keeping the tree byte-identical is what makes re-syncing an
upstream fix a file copy rather than a merge. Adding a provider back is one line in the
allowlist. (This repo is also not under version control, so a physical delete would be
unrecoverable.)

## Connecting a provider

Both paths are wired end to end and write a real connection row.

1. **API key** — the key is validated against the *live* provider
   (`POST /api/providers/validate`), then stored via `POST /api/providers/connections`.
   A rejected key is never saved. Azure additionally takes a resource endpoint; Vertex takes
   a project ID and region.
2. **OAuth** — `GET /api/oauth/:provider/authorize` returns the provider's genuine authorize
   URL with a fresh PKCE challenge. You approve it in the browser and paste the callback URL
   back; `POST /api/oauth/:provider/exchange` trades the code for tokens and writes the
   connection. Device-code providers poll `POST /api/oauth/:provider/poll` instead.
   The callback is pasted rather than captured because 9Router's loopback listener binds
   inside the backend process, where a browser tab cannot reach it.
3. **Reuse an existing 9Router database** — point `DATA_DIR` at a *copy* of
   `%APPDATA%/9router` to inherit its connections. Copy it; do not share the directory, or
   OptiAI and 9Router will write to the same file.

### Testing models

**Test models** on a provider page sends a real 1-token completion to each selected model
through the full routing pipeline, and colours each tile by the result: green for a
successful round trip, red carrying the upstream error, grey for not selected. The first
model is tested alone so any OAuth refresh settles before the rest fan out — otherwise
concurrent calls race on the same refresh token.

These are billable requests. They are also the only honest way to know a model works.

## Skills

Every skill is a folder under `backend/skills/<id>/` holding a `SKILL.md` (Anthropic Agent
Skills format: YAML frontmatter with `name` and `description`, Markdown body). `catalog.json`
beside them is the library: metadata, source, default influence, tags. Nothing outside it is
installable.

- **Vendored** (SKILL.md and any `references/` copied verbatim at a pinned commit): caveman,
  caveman-commit, caveman-review (juliusbrussee/caveman); ponytail, ponytail-review
  (dietrichgebert/ponytail); emil-design-eng, animate, apple-design (emilkowalski/skills);
  tasteful-output, anti-slop-audit (dnh33/tasteful-llm); graphify (Graphify-Labs/graphify);
  super-mem (franksde/supermemory-cli, the Supermemory agent skill).
- **OptiAI-authored**: handoff-md, sql-queries, doc-writer, research-brief, frontend-engineering,
  backend-engineering, api-design, code-craft, prompt-porter, spec-writer.

**Influence** is one setting per skill and means the same thing everywhere:

| Level | In OptiAI chat | On the CLI |
| --- | --- | --- |
| High | full SKILL.md sent, "always apply" | installed, model auto-invokes it |
| Medium | full SKILL.md sent, "apply when the request matches" | installed, model auto-invokes it |
| Low | only name + description sent | installed with `disable-model-invocation`, so only `/name` runs it |

**CLI install** copies files (no symlinks, so the CLI never depends on OptiAI running) into
`~/.claude/skills/<id>/`, `~/.codex/skills/<id>/` or `~/.config/opencode/skills/<id>/`, or a
project's `.claude/skills/` / `.opencode/skills/`. Each folder carries an `.optiai.json` marker;
folders without one are never modified or removed. Sync writes enabled skills and removes
managed folders for disabled ones. This is the only place OptiAI writes under a developer's
tool directory, and it happens only on an explicit click.

**Chat** has no disk, so `/api/chat` accepts `skills: { apply, ids }` and prepends the chosen
skills as one system block using 9Router's own format-aware injector. The composer's Skills
switch toggles it per browser; a thread inside a Project sends that Project's picks. The applied
ids come back on the `x-optiai-skills` header, sit on the message's details menu, and are stored
on the trace row (Usage → Prompts).

## Known limitations

- **No combo write routes.** `combosRepo` has full CRUD but nothing calls it, so combos
  created in the UI are browser-held and marked "local only".
- **Browser-held state.** Chat threads, projects, combos, per-model selection, custom model
  ids and round-robin live in `localStorage` because the backend has no table or route for
  them. Every screen that does this says so on the screen itself.
- **Round-robin is display-only.** The runtime account-selection strategies exist in
  `src/sse/services/auth.js`, but no route writes the setting they read.
- **No OptiAI prompt optimizer.** `/api/optimizer/*` exposes 9Router's existing deterministic
  RTK compression only. Nothing in this build uses a model to analyze or rewrite prompts —
  Chat's **Ask** mode sends a rewrite instruction to whichever model you selected rather
  than running a dedicated optimizer.
- **AI search is keyword matching.** The search bars on Models and Skills are wired to the
  UI but fall back to filtering, and say so, because reasoning over the catalog needs a
  connected provider.
- **Analytics is a heuristic, not a model.** Scores are computed client-side from the same
  usage rollups Usage reads, so the two pages can never disagree. An `/api/analytics`
  endpoint would replace `src/lib/analytics.ts` and keep the layout.
- **Token savings are reported in bytes, not tokens.** Real token deltas are only knowable
  from provider-reported usage.
- **`/api/chat` auto-attaches a local API key** to satisfy the imported `requireApiKey` gate,
  since OptiAI has no app-level auth yet. The public `/v1` gateway still enforces it normally.
- **CLI config writing is not implemented.** `/api/cli/config` returns a snippet to paste;
  it never edits `~/.claude/settings.json`.
- **Quota readers are extracted but unexposed.** `open-sse/services/usage/*` works; no route
  surfaces it and no budget-aware selector exists yet.
- **MCP bridge deferred.**
- **Non-chat modalities removed** (TTS/STT/image/video/embeddings/search).
