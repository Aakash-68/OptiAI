# 9Router → OptiAI extraction map

Source: `9router-app` v0.5.75 (`D:\1.Intertec\9router-master\9router-master`)
Target: `OptiAI/backend/9router`
Result: **422 JS files**, selected by walking the import graph from OptiAI's entry points —
not by copying directories. Zero unresolved imports.

## How the file set was chosen

Entry points (what OptiAI actually needs) were walked transitively through relative,
`@/*` and `open-sse/*` imports; every reachable file was copied, nothing else:

```
src/sse/handlers/chat.js                      chat pipeline
src/sse/services/backgroundTokenRefresh.js    proactive token refresh
src/lib/db/index.js  +  src/lib/db/repos/*    persistence
src/lib/usageDb.js / requestDetailsDb.js      usage + request records
src/lib/disabledModelsDb.js                   model management
src/lib/modelCatalog/sync.js                  model catalog
src/lib/oauth/providers/index.js              provider OAuth
src/shared/utils/apiKey.js / machineId.js     gateway key issuance
src/shared/constants/cliTools.js              CLI tool definitions
open-sse/index.js                             engine entry
open-sse/rtk/index.js  +  rtk/registry.js     token optimization
open-sse/providers/pricing.js                 cost
open-sse/services/compact.js                  combo handling
open-sse/services/usage.js                    subscription quota readers
src/app/api/providers/validate/route.js       credential validation
src/app/api/providers/[id]/test/testUtils.js  connection testing
src/app/api/providers/[id]/models/route.js    live model listing
src/app/api/models/availability/route.js      model locks
```

Path layout is preserved exactly so relative imports keep working, this map stays 1:1, and
upstream fixes can be re-synced by copying a file.

## Retained — directory map

| 9Router path | OptiAI path | Purpose | Reason retained |
| ------------ | ----------- | ------- | --------------- |
| `open-sse/handlers/` | `backend/9router/open-sse/handlers/` | chatCore: format detect, translate, dispatch, retry, stream | the routing spine |
| `open-sse/providers/registry/*` (123) | same | per-provider transport/auth/model definitions | `registry/index.js` statically imports all — cannot be subset |
| `open-sse/providers/pricing.js` | same | model/provider/pattern pricing + cost math | single source of truth for cost |
| `open-sse/providers/{capabilities,schema,shared,visionPatterns,thinkingLevels}.js` | same | capability + shape helpers | required by registry/capacity logic |
| `open-sse/translator/` (48) | same | OpenAI-pivot + direct-route translation | needed whenever client format ≠ provider format |
| `open-sse/executors/` (30) | same | per-provider upstream calls | binary/protobuf upstreams can't round-trip the translator |
| `open-sse/rtk/` (24) | same | 11 filters, autodetect, caveman, ponytail, systemInject | the token-saving engine |
| `open-sse/services/combo.js`, `accountFallback.js` | same | ordered model fallback + account rotation | tier routing foundation |
| `open-sse/services/usage/*` | same | per-provider subscription quota readers | required for future quota-aware tiering |
| `open-sse/services/{tokenRefresh,oauthCredentialManager}.js` | same | refresh handlers, lead windows, refresh lock | keeps OAuth providers alive |
| `open-sse/services/compact.js` | same | combo chat handling (see note below) | imported by the combo path |
| `open-sse/utils/` (23) | same | SSE streaming, usage extraction, proxy fetch, error shaping | streaming + usage depend on these |
| `open-sse/config/` (12) | same | provider/model/runtime constants | config-driven behavior |
| `open-sse/transformer/streamToJsonConverter.js` | same | SSE → JSON for non-streaming clients | `stream:false` support |
| `src/sse/handlers/chat.js` | `backend/9router/src/sse/handlers/chat.js` | API-key gate, combo expansion, account-selection loop | app-side entry to the engine |
| `src/sse/services/{auth,model,tokenRefresh,antigravityQuota}.js` | same | credential selection, model resolution | required by chat.js |
| `src/lib/db/` (driver, repos, migrations, adapters) | same | SQLite layer | usage, connections, keys, combos, settings, pricing |
| `src/lib/oauth/` | same | per-provider OAuth flows, PKCE, device code | provider authentication |
| `src/lib/modelCatalog/sync.js` | same | remote model catalog sync | model management |
| `src/lib/network/connectionProxy.js` | same | per-connection proxy resolution | imported by executors |
| `src/lib/{headroom/detect,pxpipe/*}.js` | same | inert helpers imported by `rtk/` | dependency only — no sidecar is started |
| `src/shared/utils/apiKey.js` | same | `sk-<machine>-<id>-<crc>` issue/verify | CLI→OptiAI auth |
| `src/shared/utils/machineId.js` | same | salted stable machine id | embedded in API keys |
| `src/shared/constants/{providers,providersDisplay,cliTools}.js` | same | provider groupings, CLI tool config contracts | catalog + CLI gateway |
| `src/app/api/providers/validate/route.js` | same | per-provider credential probes | ~650 lines of provider-specific validation |
| `src/app/api/providers/[id]/test/testUtils.js` | same | connection test + refresh-and-retry | ~900 lines, zero Next coupling |
| `src/app/api/providers/[id]/models/route.js` | same | live model listing with static fallback | model discovery per connection |
| `src/app/api/models/availability/route.js` | same | active model locks | rate-limit visibility |

> **Naming note:** `open-sse/services/compact.js` is *not* context compaction despite the
> name — its own header reads "Shared combo (model combo) handling with fallback support".
> Real context compaction in 9Router is just a `_compact: true` flag on the same chat
> pipeline (`/v1/responses/compact`), which OptiAI inherits for free via the gateway.

## Modified files (6)

Each carries an `// OptiAI:` comment at the change site.

| File | Change | Reason |
| ---- | ------ | ------ |
| `src/app/api/providers/validate/route.js` | replaced `import { NextResponse } from "next/server"` with a 1-line `Response.json` shim | only `.json()` was used; avoids depending on Next in the backend |
| `src/app/api/providers/[id]/models/route.js` | same | same |
| `src/app/api/models/availability/route.js` | same | same |
| `open-sse/shared/machineId.js` | `import { machineIdSync }` → default import + destructure | `node-machine-id` is CJS; Next's bundler resolved the named export, plain Node throws |
| `src/shared/utils/machineId.js` | same | same |
| `open-sse/utils/usageTracking.js` | `canonicalizeUsage()` now carries `estimated` into its result | upstream dropped the flag, so estimated (chars/4) counts were persisted indistinguishably from provider-reported ones — OptiAI's analyzer must not treat a guess as a measurement |

## Added (not from upstream)

| File | Purpose |
| ---- | ------- |
| `backend/9router/package.json` | `type: module` + a `version` field that `open-sse/config/appConstants.js` reads via `createRequire("../../package.json")` for upstream User-Agent strings |

## Excluded — with reasons

| Excluded from 9Router | Reason |
| --------------------- | ------ |
| `src/app/(dashboard)/**` | the entire old dashboard UI; OptiAI builds its own |
| `src/shared/components/**`, `src/store/**` | UI kit + Zustand stores |
| `src/lib/auth/**`, `src/app/api/auth/**`, `src/dashboardGuard.js` | dashboard password/JWT/SAML/OIDC login — OptiAI's auth is a separate design |
| `cli/**` | launcher, tray, autostart, self-update, desktop menu |
| `src/mitm/**`, `src/lib/mitmAliasCache.js` | TLS interception; needs root CA install + admin rights |
| `src/lib/tunnel/**` | cloudflared / Tailscale exposure |
| `src/lib/appUpdater.js`, `src/lib/updater/**` | self-update |
| `src/app/api/translator/**`, `src/lib/consoleLogBuffer.js` | debug console tooling |
| `src/i18n/**` | localization |
| `src/sse/handlers/{tts,stt,imageGeneration,videoGeneration,embeddings,search,fetch}.js` | non-chat modalities, out of scope |
| `src/app/api/mcp/**`, `src/lib/mcp/**` | **deferred** — OptiAI's skills/plugins is a new feature, not this bridge |
| `src/lib/headroom/**` (beyond `detect.js`), `src/lib/pxpipe/**` sidecar spawning | external sidecar processes OptiAI does not need |
| `skills/**` | markdown link list, zero runtime logic |
| `Dockerfile`, `docker-compose.yml`, `captain-definition` | deployment, not needed yet |
| `tests/**` | upstream's suite is not green on a plain checkout and is tied to its layout |

## Known behavioral notes

- **Provider count**: 119 entries surface in the catalog; `PROVIDERS` (transport configs)
  has 81. The difference is registry entries that are media/other-category only.
- **DB driver**: on Node ≥22.5 the chain resolves to `node:sqlite`; `better-sqlite3` stays
  optional and `sql.js` is the pure-JS floor.
- **`requireApiKey` defaults to true** in the imported settings, so OptiAI's internal
  `/api/chat` attaches a stored local key rather than disabling the gate.
