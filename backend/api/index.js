// OptiAI HTTP surface. Thin on purpose: every route delegates to a service in
// backend/services, which is the only layer allowed to touch backend/9router.
import express from "express";
import * as runtime from "../services/runtime.js";
import * as providers from "../services/providers.js";
import * as models from "../services/models.js";
import * as usage from "../services/usage.js";
import * as network from "../services/network.js";
import * as ai from "../services/ai.js";
import * as pricing from "../services/pricing.js";
import * as optimizer from "../services/optimizer.js";
import * as cli from "../services/cli.js";
import * as trace from "../services/trace.js";
import * as chatLog from "../services/chatLog.js";
import * as exporter from "../services/export.js";
import { routeChat } from "../services/gateway.js";

const wrap = (handler) => async (req, res) => {
  try {
    const result = await handler(req, res);
    if (result === undefined || res.headersSent) return;
    if (result && typeof result.status === "number" && "body" in result) {
      res.status(result.status).json(result.body);
      return;
    }
    res.json(result);
  } catch (error) {
    // Services attach `status` for expected failures (unsupported provider,
    // missing field). Anything without one is a genuine 500.
    const status = Number(error?.status) || 500;
    if (status >= 500) console.error(`[api] ${req.method} ${req.originalUrl}:`, error);
    res.status(status).json({ error: error.message });
  }
};

export function createApiRouter() {
  const api = express.Router();
  api.use(express.json({ limit: "50mb" }));

  api.get("/health", wrap(() => runtime.getStatus()));

  // -- Providers ------------------------------------------------------------
  api.get("/providers", wrap(() => providers.listProviders()));
  api.get("/providers/connections", wrap(() => providers.listConnections()));
  // Create an API-key connection. This is the route 9Router exposes as
  // POST /api/providers; OptiAI namespaces it under /connections for clarity.
  api.post("/providers/connections", wrap((req) => providers.createApiKeyConnection(req.body)));
  api.patch("/providers/connections/:id", wrap((req) =>
    providers.setConnectionActive(req.params.id, req.body?.isActive)
  ));
  api.delete("/providers/connections/:id", wrap((req) => providers.removeConnection(req.params.id)));
  api.post("/providers/validate", wrap((req) => providers.validateCredentials(req.body)));
  api.post("/providers/:id/test", wrap((req) => providers.testConnection(req.params.id)));

  // -- OAuth ----------------------------------------------------------------
  // Mirrors 9Router's /api/oauth/[provider]/[action] surface, restricted to the
  // actions the supported providers actually use.
  api.get("/oauth/:provider/authorize", wrap((req) =>
    providers.startOAuth(req.params.provider, {
      redirectUri: req.query.redirect_uri,
      meta: req.query.meta ? JSON.parse(String(req.query.meta)) : undefined,
    })
  ));
  api.post("/oauth/:provider/exchange", wrap((req) =>
    providers.completeOAuth(req.params.provider, req.body)
  ));
  api.post("/oauth/:provider/poll", wrap((req) =>
    providers.pollOAuth(req.params.provider, req.body)
  ));

  // -- Models ---------------------------------------------------------------
  api.get("/models", wrap((req) =>
    req.query.provider
      ? { provider: req.query.provider, models: models.staticModels(req.query.provider) }
      : { models: models.allStaticModels() }
  ));
  api.get("/models/availability", wrap(() => models.availability()));
  api.get("/models/combos", wrap(() => models.listCombos()));
  // Combos live in the database, not the browser: the router resolves a
  // combo by name for CLI traffic too, and it can only see what is stored.
  api.post("/models/combos", wrap((req) => models.createCombo(req.body || {})));
  api.put("/models/combos/:id", wrap((req) => models.updateCombo(req.params.id, req.body || {})));
  api.delete("/models/combos/:id", wrap((req) => models.deleteCombo(req.params.id)));
  // The chat composer's source of truth: connected providers, passing tests only.
  api.get("/models/tested", wrap(() => models.testedModels()));
  api.get("/models/tests/:provider", wrap((req) => models.modelTestResults(req.params.provider)));
  api.get("/connections/:id/models", wrap((req) => models.connectionModels(req.params.id)));
  // Ping every (or a chosen subset of) model on a connection through the real pipeline.
  api.post("/connections/:id/test-models", wrap((req) =>
    models.testModels(req.params.id, req.body?.models)
  ));
  // Same, but keyed on the provider — used by no-auth providers, which have no
  // connection row because the router injects a virtual one for them.
  api.post("/providers/:id/test-models", wrap((req) =>
    models.testProviderModels(req.params.id, req.body?.models)
  ));

  // -- Network map ----------------------------------------------------------
  // What can be routed to right now, and a live probe of one provider.
  api.get("/network", wrap(() => network.topology()));
  api.post("/network/check/:provider", wrap((req) => network.check(req.params.provider)));

  // -- OptiAI thinking ------------------------------------------------------
  // Each of these runs one completion on the fastest tested model.
  api.post("/ai/rank", wrap((req) => ai.rank(req.body || {})));
  api.post("/ai/optify", wrap((req) => ai.optify(req.body || {})));
  api.post("/ai/analyze", wrap((req) => ai.analyze(req.body || {})));
  api.get("/ai/analyze", wrap((req) => ai.lastFor(req.query.period || "30d")));

  api.get("/usage/stats", wrap((req) => usage.stats(req.query.period || "today")));
  api.get("/usage/chart", wrap((req) => usage.chart(req.query.period || "7d")));
  api.get("/usage/recent", wrap((req) => usage.recent(Number(req.query.limit) || 20)));
  api.get("/usage/latest", wrap(() => usage.latest()));
  api.get("/usage/details", wrap(() => usage.details({})));

  // -- Traces ---------------------------------------------------------------
  // One row per prompt, keyed on the id the composer received. This is the
  // begin-to-end view that usageHistory alone cannot reconstruct.
  api.get("/usage/traces", wrap((req) =>
    trace.list({ limit: Number(req.query.limit) || 50, threadId: req.query.threadId })
  ));
  api.get("/usage/traces/summary", wrap(() => trace.summary()));
  api.get("/usage/traces/:promptId", wrap(async (req) => {
    const found = await trace.byId(req.params.promptId);
    if (!found) return { status: 404, body: { error: "No trace for that prompt id" } };
    return found;
  }));

  api.get("/pricing", wrap(() => pricing.allPricing()));
  api.get("/pricing/:provider/:model", wrap((req) => pricing.pricingFor(req.params.provider, req.params.model)));
  api.post("/pricing/calculate", wrap((req) => pricing.calculate(req.body)));

  api.get("/optimizer/filters", wrap(() => optimizer.listFilters()));
  api.get("/optimizer/levels", wrap(() => optimizer.injectionLevels()));
  api.post("/optimizer/compress", wrap((req) => optimizer.compressText(req.body.text, req.body.filter || "auto")));
  api.post("/optimizer/compress-body", wrap((req) => optimizer.compressRequestBody(req.body.body ?? req.body)));
  api.post("/optimizer/inject-preview", wrap((req) => optimizer.injectionPreview(req.body)));

  // -- Export ---------------------------------------------------------------
  // Markdown in, PDF out. Binary response, so it bypasses `wrap` (which JSON-
  // encodes). Rendering happens here rather than in the browser so the same
  // document comes out regardless of client, and nothing heavy ships to it.
  api.post("/export/pdf", async (req, res) => {
    try {
      const { markdown, title, filename, model } = req.body || {};
      if (typeof markdown !== "string" || !markdown.trim()) {
        res.status(400).json({ error: "markdown is required" });
        return;
      }
      const buffer = await exporter.markdownToPdf({ markdown, title, model });
      const name = exporter.safeFilename(filename || title, "pdf");
      res.setHeader("content-type", "application/pdf");
      res.setHeader("content-disposition", `attachment; filename="${name}"`);
      res.setHeader("access-control-expose-headers", "content-disposition");
      res.send(buffer);
    } catch (error) {
      console.error("[api] export/pdf:", error);
      if (!res.headersSent) res.status(500).json({ error: error.message });
    }
  });

  api.get("/cli/tools", wrap(() => cli.listTools()));
  api.get("/cli/config", wrap((req) => cli.config(req.query.tool || "claude")));
  api.get("/cli/keys", wrap(() => cli.keys()));
  api.post("/cli/keys", wrap((req) => cli.addKey(req.body?.name)));
  api.delete("/cli/keys/:id", wrap((req) => cli.removeKey(req.params.id)));

  // Chat runs through the same 9Router pipeline the /v1 gateway uses, so streaming,
  // combo fallback, RTK and usage recording all behave identically to the CLI path.
  //
  // On top of that, every prompt gets an OptiAI id minted here — before the
  // request leaves the process — and a trace row that is opened now and closed
  // when the response finishes. The id goes back on the `x-optiai-prompt-id`
  // header so the browser can label the turn it belongs to.
  api.post("/chat", async (req, res) => {
    const startedAt = Date.now();
    const promptId = trace.newPromptId();

    // OptiAI-only fields: strip them before the body reaches 9Router, which
    // validates against the OpenAI schema and would reject unknown keys.
    const { threadId, messageId, mode, ...upstreamBody } = req.body || {};
    const requestedModel = upstreamBody.model;
    const messages = Array.isArray(upstreamBody.messages) ? upstreamBody.messages : [];
    const lastUserTurn = [...messages].reverse().find((m) => m.role === "user");

    const collector = trace.createCollector();
    let carry = "";
    let closed = false;

    // Closed exactly once, whichever way the request ends: normal finish,
    // client disconnect, or a throw out of the pipeline.
    const close = async (status, error) => {
      if (closed) return;
      closed = true;
      try {
        const result = await trace.complete({
          promptId, collector, startedAt, status, error, requestedModel,
        });
        if (status === "ok") {
          chatLog.usage(promptId, {
            inputTokens: result.tokens.input,
            outputTokens: result.tokens.output,
            cachedTokens: result.tokens.cached,
            estimated: result.tokens.estimated,
          });
          chatLog.done(promptId, {
            status,
            latencyMs: result.latencyMs,
            cost: result.cost,
            model: result.resolvedModel,
          });
        } else {
          chatLog.failed(promptId, {
            status: error || status,
            message: collector.errorMessage,
            model: requestedModel,
          });
        }
      } catch (e) {
        console.error("[api] trace close:", e);
      }
    };

    try {
      chatLog.received(promptId, {
        model: requestedModel,
        promptChars: typeof lastUserTurn?.content === "string" ? lastUserTurn.content.length : 0,
        turnCount: messages.length,
        threadId,
        mode,
      });

      await trace.begin({
        promptId,
        threadId,
        messageId,
        mode,
        requestedModel,
        promptChars: typeof lastUserTurn?.content === "string" ? lastUserTurn.content.length : 0,
        turnCount: messages.length,
        source: "chat",
      });

      // 9Router derives the client's wire format partly from the request path
      // (detectFormatByEndpoint), so present this as the OpenAI-compatible endpoint.
      req.originalUrl = "/v1/chat/completions";
      if (!req.headers.authorization) req.headers.authorization = `Bearer ${await cli.ensureLocalKey()}`;

      res.on("close", () => {
        if (!res.writableEnded) close("aborted", "Client disconnected");
      });

      chatLog.routing(promptId, { model: requestedModel, provider: null });

      let loggedFirstToken = false;
      const status = await routeChat(req, res, {
        bodyOverride: upstreamBody,
        extraHeaders: {
          "x-optiai-prompt-id": promptId,
          // Without this the browser cannot read the header on a cross-origin fetch.
          "access-control-expose-headers": "x-optiai-prompt-id",
        },
        onText: (text, done) => {
          carry = trace.observeSseText(collector, text, carry);
          if (done && carry.trim()) {
            // A non-streaming reply arrives as one JSON body, not SSE frames.
            try {
              trace.observeChunk(collector, JSON.parse(carry));
            } catch {
              /* trailing keep-alive or partial frame */
            }
          }
          if (!loggedFirstToken && collector.firstChunkAt) {
            loggedFirstToken = true;
            chatLog.firstToken(promptId, collector.firstChunkAt - startedAt);
          }
        },
      });

      await close(status >= 400 ? "error" : "ok", status >= 400 ? `HTTP ${status}` : null);
    } catch (error) {
      console.error("[api] chat:", error);
      await close("error", error.message);
      if (!res.headersSent) res.status(500).json({ error: error.message, promptId });
    }
  });

  return api;
}

// Raw OpenAI/Anthropic-compatible gateway for real CLI tools. Body is passed through
// as received bytes - no parsing, no reshaping.
export function createGatewayRouter() {
  const gateway = express.Router();
  gateway.use(express.raw({ type: "*/*", limit: "50mb" }));

  /**
   * Read the model out of a raw body without disturbing it.
   *
   * The bytes still go upstream exactly as received - this parses a copy, and
   * a body it cannot parse costs the trace its model name, never the request.
   */
  const peek = (body) => {
    try {
      const parsed = JSON.parse(Buffer.isBuffer(body) ? body.toString("utf8") : String(body));
      const messages = Array.isArray(parsed?.messages) ? parsed.messages : [];
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      return {
        model: parsed?.model || null,
        turnCount: messages.length,
        promptChars: typeof lastUser?.content === "string" ? lastUser.content.length : 0,
      };
    } catch {
      return { model: null, turnCount: 0, promptChars: 0 };
    }
  };

  /**
   * CLI traffic is traced on the same terms as the in-app chat.
   *
   * It used to be a bare passthrough, so a request from Copilot or Cursor that
   * failed left no record anywhere: 9Router's usageHistory only gets a row
   * when tokens were actually billed, and the trace table was only written by
   * /api/chat. A CLI failing upstream was therefore invisible in Usage - which
   * is exactly when you most want to see it.
   */
  const handle = async (req, res) => {
    const startedAt = Date.now();
    const promptId = trace.newPromptId();
    const { model: requestedModel, turnCount, promptChars } = peek(req.body);

    const collector = trace.createCollector();
    let carry = "";
    let closed = false;

    const close = async (status, error) => {
      if (closed) return;
      closed = true;
      try {
        await trace.complete({ promptId, collector, startedAt, status, error, requestedModel });
      } catch (e) {
        console.error("[gateway] trace close:", e);
      }
    };

    try {
      await trace.begin({
        promptId,
        requestedModel,
        promptChars,
        turnCount,
        source: "cli",
      });

      res.on("close", () => {
        if (!res.writableEnded) void close("aborted", "Client disconnected");
      });

      const status = await routeChat(req, res, {
        extraHeaders: { "x-optiai-prompt-id": promptId },
        onText: (text, done) => {
          carry = trace.observeSseText(collector, text, carry);
          if (done && carry.trim()) {
            try {
              trace.observeChunk(collector, JSON.parse(carry));
            } catch {
              /* trailing keep-alive or partial frame */
            }
          }
        },
      });

      await close(status >= 400 ? "error" : "ok", status >= 400 ? `HTTP ${status}` : null);
    } catch (error) {
      console.error(`[gateway] ${req.originalUrl}:`, error);
      await close("error", error.message);
      if (!res.headersSent) res.status(500).json({ error: error.message });
    }
  };

  gateway.post("/chat/completions", handle);
  gateway.post("/messages", handle);
  gateway.post("/responses", handle);
  return gateway;
}
