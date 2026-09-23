// Provider catalog, connections and auth, backed by the extracted 9Router registry.
//
// Everything here is filtered through backend/config/providers.js — OptiAI only
// ever exposes the supported enterprise set, regardless of what the underlying
// registry carries.
import { AI_PROVIDERS, OAUTH_PROVIDERS, APIKEY_PROVIDERS } from "@/shared/constants/providers";
import { getModelsByProviderId } from "open-sse/config/providerModels.js";
import {
  getProviderConnections,
  getProviderConnectionById,
  createProviderConnection,
  updateProviderConnection,
  deleteProviderConnection,
} from "@/lib/db/repos/connectionsRepo.js";
import {
  generateAuthData,
  exchangeTokens,
  requestDeviceCode,
  pollForToken,
  getProvider,
} from "@/lib/oauth/providers.js";
import { POST as validateRoute } from "@/app/api/providers/validate/route.js";
import { testSingleConnection } from "@/app/api/providers/[id]/test/testUtils.js";
import { clearProvider } from "./modelTests.js";
import {
  SUPPORTED_PROVIDERS,
  assertSupported,
  getSupportedProvider,
  isSupportedProvider,
} from "../config/providers.js";

function categoryOf(id) {
  if (OAUTH_PROVIDERS[id]) return "oauth";
  if (APIKEY_PROVIDERS[id]) return "apikey";
  return "other";
}

/**
 * Auth modes a provider accepts. Some entries (xai) are dual — they sit in the
 * oauth category but also take an API key, which is the mode companies want.
 */
function authModesOf(id) {
  const meta = AI_PROVIDERS[id] || {};
  // No-auth free providers get a virtual "noauth" connection injected by the
  // router, so there is nothing to connect and nothing to store.
  if (meta.noAuth || getSupportedProvider(id)?.noAuth) return ["none"];
  if (Array.isArray(meta.authModes) && meta.authModes.length > 0) return meta.authModes;
  if (OAUTH_PROVIDERS[id]) return ["oauth"];
  return ["apikey"];
}

export async function listProviders() {
  const connections = await getProviderConnections();
  const connectedCount = connections.reduce((acc, c) => {
    acc[c.provider] = (acc[c.provider] || 0) + 1;
    return acc;
  }, {});

  // Driven by the supported list, not by AI_PROVIDERS — order is ours, and an
  // id that vanished upstream shows up as a missing entry rather than silently.
  return SUPPORTED_PROVIDERS.map((supported) => {
    const meta = AI_PROVIDERS[supported.id] || {};
    const modes = authModesOf(supported.id);
    return {
      id: supported.id,
      name: supported.name || meta.name || supported.id,
      tagline: supported.tagline,
      docsUrl: supported.docsUrl || meta.apiKeyUrl || null,
      keyFormat: supported.keyFormat || null,
      category: categoryOf(supported.id),
      authType: modes.includes("none") ? "none" : modes.includes("apikey") ? "apikey" : "oauth",
      authModes: modes,
      /** True when the provider works with no credential at all. */
      noAuth: modes.includes("none"),
      modelsAreDeployments: Boolean(supported.modelsAreDeployments),
      // Carried straight from the upstream registry so the warning text stays
      // whatever 9Router says it is, rather than a paraphrase of ours.
      riskNotice:
        supported.notice ||
        (supported.subscriptionAuth ? meta.deprecationNotice || null : null),
      modelCount: (getModelsByProviderId(supported.id) || []).length,
      connections: connectedCount[supported.id] || 0,
      inRegistry: Boolean(AI_PROVIDERS[supported.id]),
    };
  });
}

/** Credentials never leave the backend — callers get identity plus health only. */
function toSafeConnection(c) {
  return {
    id: c.id,
    provider: c.provider,
    name: c.name || c.email || c.id,
    email: c.email || null,
    authType: c.authType,
    priority: c.priority ?? null,
    isActive: c.isActive !== false,
    testStatus: c.testStatus || "unknown",
    lastError: c.lastError || null,
    lastUsedAt: c.lastUsedAt || null,
    expiresAt: c.expiresAt || null,
    createdAt: c.createdAt || null,
    hasAccessToken: Boolean(c.accessToken),
    hasApiKey: Boolean(c.apiKey),
  };
}

export async function listConnections() {
  const connections = await getProviderConnections();
  return connections.filter((c) => isSupportedProvider(c.provider)).map(toSafeConnection);
}

/**
 * Create an API-key connection.
 *
 * Mirrors 9Router's POST /api/providers: validate the provider, require a key,
 * then hand the row to createProviderConnection (which dedups by name and
 * assigns the next priority).
 */
export async function createApiKeyConnection(payload = {}) {
  const provider = String(payload.provider || "").trim();
  assertSupported(provider);

  const apiKey = String(payload.apiKey || "").trim();
  if (!apiKey) {
    const error = new Error("API key is required");
    error.status = 400;
    throw error;
  }

  const supported = getSupportedProvider(provider);
  const existing = await getProviderConnections({ provider });
  const name =
    String(payload.name || "").trim() ||
    `${supported.name} ${existing.length + 1}`;

  const providerSpecificData = { ...(payload.providerSpecificData || {}) };
  // Azure and Vertex need deployment/project context alongside the key.
  if (payload.baseUrl) providerSpecificData.baseUrl = String(payload.baseUrl).trim();
  if (payload.projectId) providerSpecificData.projectId = String(payload.projectId).trim();
  if (payload.region) providerSpecificData.region = String(payload.region).trim();

  const connection = await createProviderConnection({
    provider,
    authType: "apikey",
    name,
    apiKey,
    priority: payload.priority || undefined,
    isActive: true,
    testStatus: payload.testStatus || "unknown",
    ...(Object.keys(providerSpecificData).length > 0 ? { providerSpecificData } : {}),
  });

  return toSafeConnection(connection);
}

export async function setConnectionActive(id, isActive) {
  const connection = await getProviderConnectionById(id);
  if (!connection) {
    const error = new Error("Connection not found");
    error.status = 404;
    throw error;
  }
  const updated = await updateProviderConnection(id, { isActive: Boolean(isActive) });
  return toSafeConnection(updated || { ...connection, isActive });
}

export async function validateCredentials(payload) {
  if (payload?.provider) assertSupported(String(payload.provider));
  const request = new Request("http://localhost/api/providers/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const response = await validateRoute(request);
  return { status: response.status, body: await response.json() };
}

export async function testConnection(id) {
  const connection = await getProviderConnectionById(id);
  if (!connection) return { status: 404, body: { error: "Connection not found" } };
  return { status: 200, body: await testSingleConnection(id) };
}

export async function removeConnection(id) {
  const connection = await getProviderConnectionById(id);
  await deleteProviderConnection(id);

  // Verdicts were recorded against the credential that just went away. If that
  // was the provider's last connection, drop them rather than let the chat
  // composer keep trusting a test a different key will have to earn again.
  if (connection?.provider) {
    const remaining = (await getProviderConnections()).filter(
      (c) => c.provider === connection.provider
    );
    if (remaining.length === 0) await clearProvider(connection.provider);
  }

  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* OAuth                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Step 1 — build the provider's authorize URL.
 *
 * Returns the PKCE material alongside it. The browser keeps `codeVerifier` and
 * `state` and hands them back on exchange, exactly as 9Router's dashboard does.
 */
export async function startOAuth(providerId, { redirectUri, meta } = {}) {
  assertSupported(providerId);

  const definition = getProvider(providerId);
  if (!definition) {
    const error = new Error(`No OAuth flow is registered for "${providerId}"`);
    error.status = 400;
    throw error;
  }

  if (definition.flowType === "device_code") {
    const authData = await generateAuthData(providerId, null);
    const device = await requestDeviceCode(providerId, authData.codeChallenge);
    return {
      flowType: "device_code",
      ...device,
      codeVerifier: device.codeVerifier || authData.codeVerifier,
    };
  }

  const authData = await generateAuthData(
    providerId,
    redirectUri || DEFAULT_REDIRECT_URI,
    meta
  );
  return { flowType: definition.flowType || "authorization_code", redirectUri: redirectUri || DEFAULT_REDIRECT_URI, ...authData };
}

/** Matches the loopback URI 9Router's local callback server listens on. */
export const DEFAULT_REDIRECT_URI = "http://localhost:8080/callback";

/**
 * Step 2 — exchange the authorization code for tokens and persist a connection.
 *
 * Accepts either a bare `code` or the full callback URL pasted from the browser,
 * because that is what a user actually has in hand after authorizing.
 */
export async function completeOAuth(providerId, payload = {}) {
  assertSupported(providerId);

  const { redirectUri, codeVerifier, state, meta } = payload;
  const code = extractCode(payload.code);

  if (!code) {
    const error = new Error("Missing authorization code");
    error.status = 400;
    throw error;
  }

  const tokenData = await exchangeTokens(
    providerId,
    code,
    redirectUri || DEFAULT_REDIRECT_URI,
    codeVerifier,
    state,
    meta
  );

  const connection = await createProviderConnection({
    provider: providerId,
    authType: "oauth",
    ...tokenData,
    expiresAt: tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
      : null,
    testStatus: "active",
  });

  return toSafeConnection(connection);
}

/** Step 2 for device-code providers — poll until the user finishes in the browser. */
export async function pollOAuth(providerId, payload = {}) {
  assertSupported(providerId);

  const { deviceCode, codeVerifier, extraData } = payload;
  if (!deviceCode) {
    const error = new Error("Missing device code");
    error.status = 400;
    throw error;
  }

  const result = await pollForToken(providerId, deviceCode, codeVerifier, extraData);

  if (!result.success) {
    return {
      success: false,
      pending:
        Boolean(result.pending) ||
        result.error === "authorization_pending" ||
        result.error === "slow_down",
      error: result.error || null,
      errorDescription: result.errorDescription || null,
    };
  }

  const connection = await createProviderConnection({
    provider: providerId,
    authType: "oauth",
    ...result.tokens,
    expiresAt: result.tokens?.expiresIn
      ? new Date(Date.now() + result.tokens.expiresIn * 1000).toISOString()
      : null,
    testStatus: "active",
  });

  return { success: true, connection: toSafeConnection(connection) };
}

/**
 * A pasted callback URL still contains the code. Pull it out rather than making
 * the user surgically extract a query parameter.
 */
function extractCode(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (!raw.includes("://")) return raw;
  try {
    const url = new URL(raw);
    return url.searchParams.get("code") || raw;
  } catch {
    return raw;
  }
}
