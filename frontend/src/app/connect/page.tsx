"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Globe, Link2, Plus, RotateCw, Trash2, Wrench } from "lucide-react";
import { SearchInput } from "@/components/ui/Input";
import { CopyButton } from "@/components/ui/CodeBlock";
import { CliToolLogo } from "@/components/ui/CliToolLogo";
import { ErrorNote, Skeleton } from "@/components/ui/EmptyState";
import { createApiKey, deleteApiKey, getApiKeys, getCliTools } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { cx } from "@/lib/format";
import type { CliTool } from "@/lib/types";

/**
 * Connect is the CLI integration centre: OptiAI is the endpoint your existing
 * tools point at, so every request they make is routed, priced and recorded.
 *
 * The gateway panel is the whole setup — a base URL and a key — so it sits in
 * one framed block at the top rather than being spread over cards. Below it,
 * every supported tool as a card carrying its real configured state, read off
 * that tool's own config file.
 */
export default function ConnectPage() {
  const { data: tools, loading, error } = useApi(() => getCliTools(), []);
  const keys = useApi(() => getApiKeys(), []);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const gateway = "http://127.0.0.1:20180/v1";
  const activeKey = (keys.data || [])[0];

  const filtered = (tools || []).filter(
    (tool) =>
      !query.trim() ||
      tool.name.toLowerCase().includes(query.toLowerCase()) ||
      tool.id.toLowerCase().includes(query.toLowerCase())
  );

  async function issueKey() {
    setCreating(true);
    try {
      await createApiKey("CLI key");
      await keys.refetch();
    } finally {
      setCreating(false);
    }
  }

  async function regenerate() {
    setCreating(true);
    try {
      if (activeKey) await deleteApiKey(activeKey.id);
      await createApiKey("CLI key");
      await keys.refetch();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] px-6 py-6">
      {/* Gateway: the entire setup, in one block. */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)]">
            <Link2 className="h-5 w-5 text-[var(--brand)]" />
          </span>
          <div>
            <h1 className="font-display text-[22px] font-bold tracking-tight text-[var(--text)]">
              Connect
            </h1>
            <p className="mt-0.5 text-[13px] text-[var(--text-subtle)]">
              Point your CLI tools at OptiAI — one endpoint, one key, every request tracked.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 @3xl:grid-cols-2 @3xl:divide-x @3xl:divide-[var(--border)]">
          <Panel icon={<Globe className="h-4.5 w-4.5 text-[var(--brand)]" />} label="Base URL">
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 font-mono text-[12.5px] text-[var(--text)]">
                {gateway}
              </code>
              <CopyButton value={gateway} />
            </div>
            <Hint>
              Use this endpoint in your CLI tools (Claude Code, Codex, OpenClaw, Cursor, Cline,
              etc.).
            </Hint>
          </Panel>

          <Panel
            icon={<Wrench className="h-4.5 w-4.5 text-[var(--brand)]" />}
            label="API key"
            className="@3xl:pl-6"
          >
            {keys.loading ? (
              <Skeleton className="h-[38px] rounded-lg" />
            ) : activeKey ? (
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 font-mono text-[12.5px] text-[var(--text)]">
                  {activeKey.key}
                </code>
                <CopyButton value={activeKey.key} />
                <button
                  onClick={regenerate}
                  disabled={creating}
                  title="Regenerate key"
                  aria-label="Regenerate key"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)] disabled:opacity-50"
                >
                  <RotateCw className={cx("h-4 w-4", creating && "animate-spin")} />
                </button>
              </div>
            ) : (
              <button
                onClick={issueKey}
                disabled={creating}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-2 text-[12.5px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {creating ? "Issuing…" : "Issue an API key"}
              </button>
            )}
            <Hint>Keep this key secure. You can regenerate it anytime.</Hint>

            {(keys.data || []).length > 1 && (
              <div className="mt-2 space-y-1">
                {(keys.data || []).slice(1).map((key) => (
                  <div key={key.id} className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-[var(--text-subtle)]">
                      {key.key}
                    </code>
                    <button
                      onClick={async () => {
                        await deleteApiKey(key.id);
                        await keys.refetch();
                      }}
                      aria-label="Revoke key"
                      className="grid h-6 w-6 shrink-0 place-items-center rounded text-[var(--text-subtle)] transition-colors hover:text-err-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </section>

      <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[19px] font-bold tracking-tight text-[var(--text)]">
          CLI tools{" "}
          {tools && <span className="font-medium text-[var(--text-subtle)]">({tools.length})</span>}
        </h2>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search tools…"
          className="w-full max-w-xs"
        />
      </div>

      {error && <ErrorNote message={error} className="mb-4" />}

      {loading ? (
        <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {filtered.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="py-8 text-center text-[13px] text-[var(--text-subtle)]">
          No tools match “{query}”.
        </p>
      )}
    </div>
  );
}

function ToolCard({ tool }: { tool: CliTool }) {
  return (
    <Link
      href={`/connect/${tool.id}`}
      className="group flex items-start gap-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-[border-color,box-shadow,transform] duration-150 ease-out hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] active:scale-[0.99]"
    >
      <CliToolLogo id={tool.id} name={tool.name} color={tool.color} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-display text-[14.5px] font-semibold text-[var(--text)]">
            {tool.name}
          </p>
          <span className="shrink-0 rounded-md bg-[var(--brand-soft)] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--brand)]">
            {tool.configType === "mitm" ? "Proxy" : "Coding harness"}
          </span>
        </div>

        {tool.description && (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-[var(--text-subtle)]">
            {tool.description}
          </p>
        )}

        <ConfiguredBadge tool={tool} />
      </div>

      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--text-subtle)] transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
    </Link>
  );
}

/**
 * Three states, not two.
 *
 * `null` means OptiAI has no probe for this tool, and says so — drawing it as
 * "not configured" would be asserting a check we never ran. The tooltip
 * carries the file the answer came from, so a wrong-looking badge is
 * diagnosable without leaving the page.
 */
function ConfiguredBadge({ tool }: { tool: CliTool }) {
  const { configured, configPath, pointsAt } = tool;

  const tone =
    configured === true
      ? "bg-ok-500"
      : configured === false
        ? "bg-[var(--text-subtle)]"
        : "bg-warn-500";

  const label =
    configured === true
      ? "Configured"
      : configured === false
        ? "Not configured"
        : "Not checked";

  const title =
    configured === true
      ? `Points at ${pointsAt} — found in ${configPath}`
      : configured === false
        ? `No OptiAI endpoint found${configPath ? ` in ${configPath}` : ""}`
        : "OptiAI cannot read this tool's config automatically — open it for setup steps";

  return (
    <span className="mt-1.5 flex items-center gap-1.5" title={title}>
      <span aria-hidden className={cx("h-[6px] w-[6px] shrink-0 rounded-full", tone)} />
      <span className="text-[11.5px] text-[var(--text-subtle)]">{label}</span>
    </span>
  );
}

function Panel({
  icon,
  label,
  children,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex gap-3", className)}>
      <span className="mt-6 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[12.5px] font-medium text-[var(--text-muted)]">{label}</p>
        {children}
      </div>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[11.5px] leading-snug text-[var(--text-subtle)]">{children}</p>;
}
