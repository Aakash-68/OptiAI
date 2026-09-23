"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Info, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CopyButton } from "@/components/ui/CodeBlock";
import { ProviderLogo } from "@/components/ui/ProviderLogo";
import { Tabs } from "@/components/ui/Tabs";
import {
  createConnection,
  exchangeOAuth,
  pollOAuth,
  startOAuth,
  validateCredentials,
} from "@/lib/api";
import { cx } from "@/lib/format";
import type { OAuthStart, Provider } from "@/lib/types";

type Mode = "apikey" | "oauth";

/**
 * Connect flow — both halves are real.
 *
 * API key: validated against the live provider, then persisted via
 * POST /api/providers/connections.
 *
 * OAuth: GET /api/oauth/:provider/authorize returns the provider's genuine
 * authorize URL plus PKCE material. The user authorizes in their browser and
 * pastes the callback URL back; POST /api/oauth/:provider/exchange trades the
 * code for tokens and writes the connection. Device-code providers poll instead.
 *
 * The callback is pasted rather than captured because 9Router's loopback
 * listener binds inside the backend process — a browser tab cannot hand the
 * code back to it directly.
 */
export function ConnectDialog({
  provider,
  open,
  onClose,
  onConnected,
}: {
  provider: Provider | null;
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}) {
  const supportsApiKey = provider?.authModes?.includes("apikey") ?? true;
  const supportsOAuth = provider?.authModes?.includes("oauth") ?? false;

  const [mode, setMode] = useState<Mode>(supportsApiKey ? "apikey" : "oauth");
  const [apiKey, setApiKey] = useState("");
  const [name, setName] = useState("");
  const [extra, setExtra] = useState({ baseUrl: "", projectId: "", region: "" });
  const [callback, setCallback] = useState("");
  const [oauth, setOauth] = useState<OAuthStart | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "warn" | "info"; text: string } | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset whenever a different provider opens the dialog.
  useEffect(() => {
    if (!open) return;
    setMode(supportsApiKey ? "apikey" : "oauth");
    setApiKey("");
    setName("");
    setExtra({ baseUrl: "", projectId: "", region: "" });
    setCallback("");
    setOauth(null);
    setNote(null);
  }, [open, provider?.id, supportsApiKey]);

  useEffect(
    () => () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    },
    []
  );

  if (!provider) return null;

  const needsAzureFields = provider.id === "azure";
  const needsVertexFields = provider.id === "vertex";

  async function saveApiKey() {
    if (!provider) return;
    setBusy(true);
    setNote(null);

    try {
      // Validate first so a bad key is rejected before a row is written.
      let validated = false;
      try {
        const result = await validateCredentials({ provider: provider.id, apiKey });
        validated = result.valid;
        if (!result.valid) {
          setNote({
            tone: "warn",
            text: result.error || "The provider rejected this key. Saving anyway is not useful — check the key and retry.",
          });
          setBusy(false);
          return;
        }
      } catch {
        // Validation endpoint unavailable for this provider — fall through and
        // let the connection test on the detail page be the source of truth.
        validated = false;
      }

      const connection = await createConnection({
        provider: provider.id,
        apiKey,
        name: name.trim() || undefined,
        ...(needsAzureFields ? { baseUrl: extra.baseUrl } : {}),
        ...(needsVertexFields ? { projectId: extra.projectId, region: extra.region } : {}),
      });

      setNote({
        tone: "ok",
        text: `Connected as “${connection.name}”.${
          validated ? " The key was verified against the provider." : ""
        }`,
      });
      onConnected();
      setTimeout(onClose, 900);
    } catch (err) {
      setNote({ tone: "warn", text: err instanceof Error ? err.message : "Could not save connection" });
    } finally {
      setBusy(false);
    }
  }

  async function beginOAuth() {
    if (!provider) return;
    setBusy(true);
    setNote(null);
    try {
      const data = await startOAuth(provider.id);
      setOauth(data);

      if (data.flowType === "device_code" && data.deviceCode) {
        setNote({
          tone: "info",
          text: `Enter code ${data.userCode} at the verification URL. Waiting for you to finish…`,
        });
        beginPolling(provider.id, data);
      }
    } catch (err) {
      setNote({ tone: "warn", text: err instanceof Error ? err.message : "Could not start OAuth" });
    } finally {
      setBusy(false);
    }
  }

  function beginPolling(providerId: string, data: OAuthStart, attempt = 0) {
    const intervalMs = Math.max((data.interval || 5) * 1000, 2000);

    pollTimer.current = setTimeout(async () => {
      try {
        const result = await pollOAuth(providerId, {
          deviceCode: data.deviceCode!,
          codeVerifier: data.codeVerifier,
        });

        if (result.success) {
          setNote({ tone: "ok", text: "Authorized. Connection saved." });
          onConnected();
          setTimeout(onClose, 900);
          return;
        }
        if (result.pending && attempt < 60) {
          beginPolling(providerId, data, attempt + 1);
          return;
        }
        setNote({ tone: "warn", text: result.error || "Authorization timed out" });
      } catch (err) {
        setNote({ tone: "warn", text: err instanceof Error ? err.message : "Polling failed" });
      }
    }, intervalMs);
  }

  async function finishOAuth() {
    if (!provider || !oauth) return;
    setBusy(true);
    setNote(null);
    try {
      const connection = await exchangeOAuth(provider.id, {
        code: callback.trim(),
        redirectUri: oauth.redirectUri,
        codeVerifier: oauth.codeVerifier,
        state: oauth.state,
      });
      setNote({ tone: "ok", text: `Connected as “${connection.name}”.` });
      onConnected();
      setTimeout(onClose, 900);
    } catch (err) {
      setNote({ tone: "warn", text: err instanceof Error ? err.message : "Exchange failed" });
    } finally {
      setBusy(false);
    }
  }

  const authUrl = oauth?.authUrl || oauth?.authorizeUrl || "";
  const isDeviceFlow = oauth?.flowType === "device_code";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Connect ${provider.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {mode === "apikey" ? (
            <Button variant="primary" loading={busy} disabled={!apiKey.trim()} onClick={saveApiKey}>
              Validate &amp; connect
            </Button>
          ) : !oauth ? (
            <Button variant="primary" loading={busy} onClick={beginOAuth}>
              Start authorization
            </Button>
          ) : isDeviceFlow ? (
            <Button variant="primary" loading disabled>
              Waiting…
            </Button>
          ) : (
            <Button variant="primary" loading={busy} disabled={!callback.trim()} onClick={finishOAuth}>
              Complete connection
            </Button>
          )}
        </>
      }
    >
      <div className="mb-5 flex items-center gap-3">
        <ProviderLogo id={provider.id} name={provider.name} size="md" />
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-[var(--text)]">{provider.name}</p>
          <p className="truncate text-[12px] text-[var(--text-subtle)]">{provider.tagline}</p>
        </div>
      </div>

      {provider.riskNotice && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-warn-500/30 bg-warn-50 px-3.5 py-3 dark:bg-warn-500/10">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn-600 dark:text-warn-500" />
          <p className="text-[12.5px] leading-relaxed text-warn-700 dark:text-warn-500">
            {provider.riskNotice.replace(/^⚠️\s*/, "")}
          </p>
        </div>
      )}

      {supportsApiKey && supportsOAuth && (
        <div className="mb-5">
          <Tabs
            tabs={[
              { id: "apikey", label: "API key" },
              { id: "oauth", label: "OAuth" },
            ]}
            active={mode}
            onChange={(id) => setMode(id as Mode)}
            size="sm"
          />
          <p className="mt-2 text-[12px] text-[var(--text-subtle)]">
            API key is the right choice for company use — it is licensed, billable and not tied to
            one person&rsquo;s login.
          </p>
        </div>
      )}

      {mode === "apikey" ? (
        <div className="space-y-4">
          <Input
            label="API key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={provider.keyFormat || "Your API key"}
            hint="Validated against the live provider before it is stored. It never leaves your backend."
            className="font-mono"
            autoFocus
          />

          <Input
            label="Connection name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`${provider.name} production`}
            hint="Useful once you add several keys for the same provider."
          />

          {needsAzureFields && (
            <Input
              label="Resource endpoint"
              value={extra.baseUrl}
              onChange={(e) => setExtra({ ...extra, baseUrl: e.target.value })}
              placeholder="https://your-resource.openai.azure.com"
              hint="Azure routes by resource; models are your deployment names."
              className="font-mono"
            />
          )}

          {needsVertexFields && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="GCP project ID"
                value={extra.projectId}
                onChange={(e) => setExtra({ ...extra, projectId: e.target.value })}
                placeholder="my-project-123"
                className="font-mono"
              />
              <Input
                label="Region"
                value={extra.region}
                onChange={(e) => setExtra({ ...extra, region: e.target.value })}
                placeholder="us-central1"
                className="font-mono"
              />
            </div>
          )}

          {provider.docsUrl && (
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--brand)] hover:underline"
            >
              Get a key from {provider.name} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {!oauth ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-4">
              <p className="flex items-center gap-2 text-[13px] font-medium text-[var(--text)]">
                <ShieldCheck className="h-4 w-4 text-[var(--brand)]" />
                How this works
              </p>
              <ol className="mt-2.5 space-y-1.5 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                <li>1. OptiAI builds {provider.name}&rsquo;s real authorize URL with a fresh PKCE challenge.</li>
                <li>2. You approve it in your browser.</li>
                <li>3. You paste the callback URL back here; OptiAI exchanges it for tokens and stores the connection.</li>
              </ol>
            </div>
          ) : isDeviceFlow ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3.5 py-3">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--brand)]" />
                <p className="text-[13px] text-[var(--text-muted)]">Waiting for you to authorize…</p>
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-[var(--text)]">Your code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 text-center font-mono text-[18px] font-semibold tracking-[0.2em] text-[var(--text)]">
                    {oauth.userCode}
                  </code>
                  <CopyButton value={oauth.userCode || ""} />
                </div>
              </div>
              {oauth.verificationUri && (
                <a
                  href={oauth.verificationUriComplete || oauth.verificationUri}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--brand)] hover:underline"
                >
                  Open {oauth.verificationUri} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ) : (
            <>
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-[var(--text)]">
                  Step 1 — authorize in your browser
                </p>
                <div className="flex gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 font-mono text-[12px] text-[var(--text-muted)]">
                    {authUrl}
                  </code>
                  <CopyButton value={authUrl} />
                </div>
                <a
                  href={authUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--brand)] hover:underline"
                >
                  Open authorization page <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <div>
                <p className="mb-1.5 text-[13px] font-medium text-[var(--text)]">
                  Step 2 — paste the callback URL
                </p>
                <p className="mb-2 text-[12px] text-[var(--text-subtle)]">
                  After approving, copy the full URL from your address bar. The page itself will
                  not load — that is expected, the code is in the URL.
                </p>
                <Input
                  value={callback}
                  onChange={(e) => setCallback(e.target.value)}
                  placeholder={`${oauth.redirectUri}?code=…`}
                  className="font-mono text-[12px]"
                />
              </div>
            </>
          )}
        </div>
      )}

      {note && (
        <div
          className={cx(
            "mt-5 flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] leading-relaxed",
            note.tone === "ok"
              ? "border-ok-500/25 bg-ok-50 text-ok-700 dark:bg-ok-500/10 dark:text-ok-500"
              : note.tone === "info"
                ? "border-[var(--brand-soft-border)] bg-[var(--brand-soft)] text-[var(--text-muted)]"
                : "border-warn-500/25 bg-warn-50 text-warn-700 dark:bg-warn-500/10 dark:text-warn-500"
          )}
        >
          {note.tone === "ok" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <p>{note.text}</p>
        </div>
      )}
    </Modal>
  );
}
