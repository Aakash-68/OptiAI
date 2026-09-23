// Bridges Express to 9Router's handler contract.
//
// `handleChat` is written for Next.js route handlers: it takes a WHATWG `Request`
// and returns a `Response` whose body may be a live SSE `ReadableStream`. Rather
// than forking that pipeline, OptiAI converts at the edges so the entire routing,
// translation, fallback and usage path stays exactly as extracted.
import { handleChat } from "@/sse/handlers/chat.js";
import { bootstrap } from "./runtime.js";

const HOP_BY_HOP = new Set(["connection", "keep-alive", "transfer-encoding", "content-length", "content-encoding"]);

export function toWebRequest(req, { bodyOverride } = {}) {
  const url = `${req.protocol}://${req.get("host") || "localhost"}${req.originalUrl}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined || HOP_BY_HOP.has(key.toLowerCase())) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }

  const init = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    const body = bodyOverride ?? req.body;
    init.body = Buffer.isBuffer(body) ? body : JSON.stringify(body ?? {});
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
  }
  return new Request(url, init);
}

/**
 * `onText` receives every decoded chunk as it passes through, before it is written
 * to the client. It is a read-only tap: the bytes forwarded downstream are the
 * bytes received, so tracing can never corrupt a response. Anything it throws is
 * swallowed for the same reason — an observer must not be able to kill a stream.
 */
export async function sendWebResponse(res, webResponse, { onText, extraHeaders } = {}) {
  res.status(webResponse.status);
  for (const [key, value] of webResponse.headers) {
    if (!HOP_BY_HOP.has(key.toLowerCase())) res.setHeader(key, value);
  }
  for (const [key, value] of Object.entries(extraHeaders || {})) {
    if (value !== undefined && value !== null) res.setHeader(key, String(value));
  }

  if (!webResponse.body) {
    const text = await webResponse.text();
    if (onText) {
      try {
        onText(text, true);
      } catch {
        /* observer failures must not affect the response */
      }
    }
    res.end(text);
    return;
  }

  res.flushHeaders?.();
  const reader = webResponse.body.getReader();
  res.on("close", () => reader.cancel().catch(() => {}));

  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (onText) {
        try {
          onText(decoder.decode(value, { stream: true }), false);
        } catch {
          /* observer failures must not affect the response */
        }
      }
      res.write(Buffer.from(value));
    }
    if (onText) {
      try {
        onText("", true);
      } catch {
        /* as above */
      }
    }
  } catch (error) {
    if (!res.writableEnded) res.write(`\n${JSON.stringify({ error: error.message })}\n`);
    throw error;
  } finally {
    res.end();
  }
}

// Single entry used by both the OptiAI chat API and the raw /v1 gateway.
export async function routeChat(req, res, { bodyOverride, onText, extraHeaders } = {}) {
  await bootstrap();
  const webResponse = await handleChat(toWebRequest(req, { bodyOverride }));
  await sendWebResponse(res, webResponse, { onText, extraHeaders });
  return webResponse.status;
}

// For OptiAI services that need the parsed result rather than a piped stream.
export async function routeChatJson(body, { url = "http://localhost/v1/chat/completions", headers = {} } = {}) {
  await bootstrap();
  const request = new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const response = await handleChat(request);
  const text = await response.text();
  // Callers need the connection that served the request, not just the body.
  const connection = {
    id: response.headers.get("x-optiai-connection-id") || null,
    name: response.headers.get("x-optiai-connection-name") || null,
  };
  try {
    return { status: response.status, body: JSON.parse(text), connection };
  } catch {
    return { status: response.status, body: { raw: text }, connection };
  }
}
