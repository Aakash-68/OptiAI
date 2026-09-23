"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge, StatusDot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ProviderLogo } from "@/components/ui/ProviderLogo";
import { ErrorNote, Skeleton } from "@/components/ui/EmptyState";
import { ConnectDialog } from "@/components/providers/ConnectDialog";
import { ModelGrid } from "@/components/providers/ModelGrid";
import {
  deleteConnection,
  getConnections,
  getModelTests,
  getModels,
  getProviders,
  testConnection,
  testModels,
  testProviderModels,
} from "@/lib/api";
import { useApi, useLocalStorage } from "@/hooks/useApi";
import { formatRelativeTime } from "@/lib/format";
import type { Model, ModelTestResult } from "@/lib/types";

export default function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: providers, loading: loadingProviders, refetch: refetchProviders } = useApi(
    () => getProviders(),
    []
  );
  const { data: connections, refetch: refetchConnections } = useApi(() => getConnections(), []);
  const { data: modelData, loading: loadingModels } = useApi(() => getModels(id), [id]);

  const [connectOpen, setConnectOpen] = useState(false);
  const [addModelOpen, setAddModelOpen] = useState(false);
  const [customModelId, setCustomModelId] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [connectionResult, setConnectionResult] = useState<Record<string, string>>({});
  const [testingModels, setTestingModels] = useState<Set<string>>(new Set());
  const [modelResults, setModelResults] = useState<Record<string, ModelTestResult>>({});

  /**
   * Verdicts are persisted server-side, so a reload or a trip to /chat no longer
   * wipes them. This is also what the chat composer reads to decide which models
   * it may offer — the two views cannot disagree.
   */
  const { data: storedTests } = useApi(() => getModelTests(id), [id]);

  useEffect(() => {
    if (!storedTests?.results) return;
    setModelResults((prev) => ({ ...storedTests.results, ...prev }));
  }, [storedTests]);

  /**
   * Selection and custom models are per-browser: the backend has a
   * disabledModels repo but no route exposing it, and no concept of a
   * user-added model id. Both are labelled in the UI.
   */
  const [deselected, setDeselected] = useLocalStorage<string[]>(`optiai.deselectedModels.${id}`, []);
  const [customModels, setCustomModels] = useLocalStorage<Model[]>(`optiai.customModels.${id}`, []);
  const [roundRobin, setRoundRobin] = useLocalStorage(`optiai.roundRobin.${id}`, false);

  const provider = providers?.find((p) => p.id === id);
  const providerConnections = useMemo(
    () => (connections || []).filter((c) => c.provider === id),
    [connections, id]
  );

  const models = useMemo(
    () => [...(modelData?.models || []), ...customModels],
    [modelData, customModels]
  );
  const selected = useMemo(
    () => models.map((m) => m.id).filter((mid) => !deselected.includes(mid)),
    [models, deselected]
  );

  async function runConnectionTest(connectionId: string) {
    setTesting(connectionId);
    try {
      const res = await testConnection(connectionId);
      const ok = res.valid ?? res.ok;
      setConnectionResult((prev) => ({
        ...prev,
        [connectionId]: ok ? "healthy" : res.error || "test failed",
      }));
    } catch (err) {
      setConnectionResult((prev) => ({
        ...prev,
        [connectionId]: err instanceof Error ? err.message : "test failed",
      }));
    } finally {
      setTesting(null);
      await refetchConnections();
    }
  }

  /**
   * Ping the selected models through the real pipeline.
   *
   * No-auth providers have no connection row — the router injects a virtual one
   * — so they test by provider id instead.
   */
  async function runModelTests() {
    const connection = providerConnections[0];
    if (selected.length === 0) return;
    if (!provider?.noAuth && !connection) return;

    setTestingModels(new Set(selected));
    try {
      const res = provider?.noAuth
        ? await testProviderModels(provider.id, selected)
        : await testModels(connection!.id, selected);
      const next: Record<string, ModelTestResult> = {};
      for (const result of res.results) next[result.modelId] = result;
      setModelResults((prev) => ({ ...prev, ...next }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Test failed";
      setModelResults((prev) => {
        const next = { ...prev };
        for (const modelId of selected) {
          next[modelId] = { modelId, name: modelId, ok: false, error: message };
        }
        return next;
      });
    } finally {
      setTestingModels(new Set());
    }
  }

  if (loadingProviders || !provider) {
    return (
      <div className="mx-auto w-full max-w-[1120px] px-6 py-6">
        <BackLink />
        {loadingProviders ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : (
          <ErrorNote
            message={`"${id}" is not one of OptiAI's supported providers.`}
          />
        )}
      </div>
    );
  }

  const hasConnection = providerConnections.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1120px] px-6 py-6">
      <BackLink />

      {/* Identity */}
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <ProviderLogo id={provider.id} name={provider.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[26px] font-bold tracking-tight text-[var(--text)]">
              {provider.name}
            </h1>
            {provider.docsUrl && (
              <a
                href={provider.docsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--brand)] hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Get a key
              </a>
            )}
          </div>
          <p className="mt-1 text-[13.5px] text-[var(--text-subtle)]">{provider.tagline}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={provider.authModes.includes("apikey") ? "accent" : "brand"}>
            {provider.authModes.join(" · ")}
          </Badge>
          <Badge>{models.length} models</Badge>
        </div>
      </div>

      {provider.riskNotice && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-warn-500/30 bg-warn-50 px-4 py-3 dark:bg-warn-500/10">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn-600 dark:text-warn-500" />
          <p className="text-[13px] leading-relaxed text-warn-700 dark:text-warn-500">
            {provider.riskNotice.replace(/^⚠️\s*/, "")}
          </p>
        </div>
      )}

      {provider.noAuth && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-ok-500/25 bg-ok-50 px-4 py-3 dark:bg-ok-500/10">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok-600 dark:text-ok-500" />
          <p className="text-[13px] leading-relaxed text-ok-700 dark:text-ok-500">
            <strong className="font-semibold">No setup required.</strong> This provider is
            public — the router sends <code className="font-mono">Authorization: Bearer public</code>{" "}
            and never reads a stored credential. Pick a model in Chat and send. There is nothing
            to connect, so it holds no accounts and no per-account limits apply.
          </p>
        </div>
      )}

      {/* Connections */}
      {!provider.noAuth && (
      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[16px] font-semibold text-[var(--text)]">Connections</h2>
          <label className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
            Round robin
            <Toggle checked={roundRobin} onChange={setRoundRobin} label="Round robin" size="sm" />
          </label>
        </div>

        <div className="mt-4">
          {!hasConnection ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-5">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--surface-sunken)] text-[var(--text-subtle)]">
                  <Lock className="h-4 w-4" />
                </span>
                <p className="text-[13.5px] text-[var(--text-muted)]">No connections yet</p>
              </div>
              <Button
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setConnectOpen(true)}
              >
                Add Connection
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {providerConnections.map((connection) => {
                const result = connectionResult[connection.id];
                const healthy = connection.testStatus === "active" || result === "healthy";
                return (
                  <div
                    key={connection.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3.5 py-3"
                  >
                    <StatusDot tone={connection.lastError || result && result !== "healthy" ? "err" : healthy ? "ok" : "neutral"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-[var(--text)]">
                        {connection.name}
                      </p>
                      <p className="truncate text-[11.5px] text-[var(--text-subtle)]">
                        {connection.authType} · priority {connection.priority ?? "—"} · added{" "}
                        {formatRelativeTime(connection.createdAt)}
                        {result && ` · ${result}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<RefreshCw className="h-3.5 w-3.5" />}
                      loading={testing === connection.id}
                      onClick={() => runConnectionTest(connection.id)}
                    >
                      Test
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove connection"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={async () => {
                        await deleteConnection(connection.id);
                        await refetchConnections();
                        await refetchProviders();
                      }}
                    />
                  </div>
                );
              })}
              <Button
                variant="secondary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setConnectOpen(true)}
              >
                Add another connection
              </Button>
            </div>
          )}
        </div>
      </Card>
      )}

      {/* Models */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-[16px] font-semibold text-[var(--text)]">Models</h2>
            <p className="mt-0.5 text-[12.5px] text-[var(--text-subtle)]">
              {selected.length} of {models.length} active · click a model to toggle it
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setAddModelOpen(true)}
            >
              Add Model
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<Check className="h-3.5 w-3.5" />}
              onClick={() =>
                setDeselected(deselected.length > 0 ? [] : models.map((m) => m.id))
              }
            >
              {deselected.length > 0 ? "Select all" : "Deselect all"}
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<Zap className="h-3.5 w-3.5" />}
              disabled={(!hasConnection && !provider.noAuth) || selected.length === 0}
              loading={testingModels.size > 0}
              onClick={runModelTests}
              title={
                hasConnection || provider.noAuth
                  ? "Send a 1-token request to each selected model"
                  : "Connect this provider first"
              }
            >
              Test models
            </Button>
          </div>
        </div>

        {!hasConnection && !provider.noAuth && (
          <p className="mt-3 rounded-lg border border-warn-500/25 bg-warn-50 px-3.5 py-2.5 text-[12.5px] text-warn-700 dark:bg-warn-500/10 dark:text-warn-500">
            Testing needs a connection — each test is a real request to {provider.name}.
          </p>
        )}

        {provider.modelsAreDeployments && (
          <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-[12.5px] text-[var(--text-muted)]">
            Azure names models after your own deployments, so there is no static catalog. Use
            <strong className="font-semibold"> Add Model</strong> to enter your deployment names.
          </p>
        )}

        <div className="mt-4">
          {loadingModels ? (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] rounded-xl" />
              ))}
            </div>
          ) : models.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--text-subtle)]">
              No models listed. Add one with its exact id to get started.
            </p>
          ) : (
            <ModelGrid
              models={models}
              selected={selected}
              results={modelResults}
              testing={testingModels}
              onToggle={(modelId) =>
                setDeselected((prev) =>
                  prev.includes(modelId)
                    ? prev.filter((m) => m !== modelId)
                    : [...prev, modelId]
                )
              }
            />
          )}
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-subtle)]">
          Selection is stored in this browser — the router&rsquo;s model-lock repo exists but is
          not routed yet. Test results reflect a real request to the provider: green is a
          successful round trip, red carries the upstream error.
        </p>
      </Card>

      <ConnectDialog
        provider={provider}
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnected={async () => {
          await refetchConnections();
          await refetchProviders();
        }}
      />

      {/* Add a model by id — for deployments and models newer than the catalog. */}
      <Modal
        open={addModelOpen}
        onClose={() => setAddModelOpen(false)}
        title="Add Model"
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddModelOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!customModelId.trim()}
              onClick={() => {
                const modelId = customModelId.trim();
                if (!models.some((m) => m.id === modelId)) {
                  setCustomModels((prev) => [...prev, { id: modelId, name: modelId }]);
                }
                setCustomModelId("");
                setAddModelOpen(false);
              }}
            >
              Add
            </Button>
          </>
        }
      >
        <Input
          label="Model ID"
          value={customModelId}
          onChange={(e) => setCustomModelId(e.target.value)}
          placeholder={provider.modelsAreDeployments ? "my-gpt4o-deployment" : "provider-model-id"}
          hint="Exactly as the provider names it. Useful for Azure deployments or a model released after this catalog was built."
          className="font-mono"
          autoFocus
        />
      </Modal>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/providers"
      className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Providers
    </Link>
  );
}
