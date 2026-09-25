"use client";

import { useState } from "react";
import { Database, Monitor, Moon, Palette, Server, Shield, Sun, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Badge, StatusDot } from "@/components/ui/Badge";
import { SkeletonStat } from "@/components/ui/Skeleton";
import { ModelPicker, type ModelChoice } from "@/components/chat/ModelPicker";
import { getHealth } from "@/lib/api";
import { useApi, useLocalStorage } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { API_BASE } from "@/lib/api";
import { cx } from "@/lib/format";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { data: health, loading } = useApi(() => getHealth(), []);
  const [defaultModel, setDefaultModel] = useLocalStorage<ModelChoice | null>(
    "optiai.defaultModel",
    null
  );
  const [streamResponses, setStreamResponses] = useLocalStorage("optiai.streamResponses", true);
  const [showTelemetry, setShowTelemetry] = useLocalStorage("optiai.showTelemetry", true);
  const [cleared, setCleared] = useState(false);

  function clearLocalData() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("optiai."))
        .forEach((k) => localStorage.removeItem(k));
      setCleared(true);
    } catch {
      /* blocked storage — nothing to clear */
    }
  }

  return (
    <PageContainer title="Settings" description="Defaults, appearance and system configuration">
      <div className="space-y-5">
        {/* Appearance */}
        <Card>
          <CardHeader
            title="Appearance"
            description="Theme applies immediately and is remembered in this browser"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                { id: "light", label: "Light", icon: Sun },
                { id: "dark", label: "Dark", icon: Moon },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              const active = theme === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setTheme(option.id)}
                  className={cx(
                    "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-all",
                    active
                      ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Defaults */}
        <Card>
          <CardHeader
            title="Chat defaults"
            description="Used whenever a chat does not belong to a project with its own preference"
          />
          <div className="mt-4 space-y-4">
            <Row
              label="Default model or combo"
              hint="Pre-selected in the composer for new chats"
            >
              <ModelPicker value={defaultModel} onChange={setDefaultModel} align="right" />
            </Row>

            <Row label="Stream responses" hint="Show tokens as they arrive instead of all at once">
              <Toggle checked={streamResponses} onChange={setStreamResponses} label="Stream responses" />
            </Row>

            <Row
              label="Show per-message telemetry"
              hint="Model, tokens, cost and latency beneath each answer"
            >
              <Toggle checked={showTelemetry} onChange={setShowTelemetry} label="Show telemetry" />
            </Row>
          </div>
        </Card>

        {/* System */}
        <Card>
          <CardHeader title="System" description="Live status of the OptiAI backend" />
          {loading ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonStat key={i} index={i} />
              ))}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoTile
                icon={<Server className="h-3.5 w-3.5" />}
                label="Backend"
                value={API_BASE}
                status={health?.ok ? "ok" : "err"}
              />
              <InfoTile
                icon={<Database className="h-3.5 w-3.5" />}
                label="Database driver"
                value={health?.database.driver || "—"}
                status={health?.database.connected ? "ok" : "err"}
              />
              <InfoTile
                icon={<Shield className="h-3.5 w-3.5" />}
                label="Router version"
                value={health?.router.version || "—"}
                status={health?.router.loaded ? "ok" : "err"}
              />
              <InfoTile
                icon={<Palette className="h-3.5 w-3.5" />}
                label="Providers registered"
                value={String(health?.router.providers ?? "—")}
                status="ok"
              />
            </div>
          )}
          {health && (
            <p className="mt-3 text-[12px] text-[var(--text-subtle)]">
              Data directory <code className="font-mono">{health.database.dataDir}</code> — kept
              separate from any existing 9Router install.
            </p>
          )}
        </Card>

        {/* Data */}
        <Card>
          <CardHeader
            title="Local data"
            description="Chats, projects, combos and preferences are stored in this browser"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={clearLocalData}
            >
              Clear local OptiAI data
            </Button>
            {cleared && (
              <span className="text-[13px] text-ok-600 dark:text-ok-500">
                Cleared — reload to see the effect.
              </span>
            )}
          </div>
          <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-[var(--text-subtle)]">
            <Monitor className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This does not touch usage history or provider connections — those live in the
            backend&rsquo;s SQLite database, not in the browser.
          </p>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader title="Account" description="App-level authentication" />
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3.5 py-3">
            <Badge tone="warn">not implemented</Badge>
            <p className="text-[12.5px] leading-relaxed text-[var(--text-muted)]">
              OptiAI has no user accounts yet. The 9Router dashboard&rsquo;s login stack was
              deliberately excluded from the extraction, and OptiAI&rsquo;s own auth is a separate
              design. Keep the backend bound to loopback until it exists — that process holds your
              provider credentials.
            </p>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-[var(--text)]">{label}</p>
        {hint && <p className="mt-0.5 text-[12px] text-[var(--text-subtle)]">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: "ok" | "err";
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
        {icon}
        {label}
      </p>
      <p className="mt-1.5 flex items-center gap-1.5">
        <StatusDot tone={status} />
        <span className="truncate font-mono text-[12.5px] text-[var(--text)]">{value}</span>
      </p>
    </div>
  );
}
