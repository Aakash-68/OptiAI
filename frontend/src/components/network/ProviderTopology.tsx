"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { ProviderLogo } from "@/components/ui/ProviderLogo";
import { StatusDot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { checkNetworkProvider, getModelTests, getNetwork } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { cx, formatLatency, formatRelativeTime, shortModelName } from "@/lib/format";
import type { NetworkCheck, NetworkNode, NetworkStatus } from "@/lib/types";

type LiveStatus = NetworkStatus | "checking";

/**
 * Ring layout, percent coordinates. Alternating radii give the loose,
 * scattered look rather than a perfect circle; past a dozen nodes a second,
 * tighter ring takes the overflow so labels stop colliding.
 */
function layout(count: number): { x: number; y: number }[] {
  const outer = Math.min(count, 12);
  return Array.from({ length: count }, (_, i) => {
    const ring = i < outer ? 0 : 1;
    const n = ring === 0 ? outer : count - outer;
    const j = ring === 0 ? i : i - outer;
    const angle = -Math.PI / 2 + (2 * Math.PI * j) / n - Math.PI / (n * 2) + (ring ? Math.PI / n : 0);
    const base = ring === 0 ? 1 : 0.5;
    const r = base * (n > 3 && j % 2 === 1 ? 1 : 0.8);
    return { x: 50 + 40 * r * Math.cos(angle), y: 50 + 40 * r * Math.sin(angle) };
  });
}

/** One S-curve from the hub to a node; control points bend it gently. */
function link(x: number, y: number) {
  const dx = x - 50;
  const dy = y - 50;
  return `M 50 50 C ${50 + dx * 0.5} ${50 + dy * 0.05}, ${x - dx * 0.5} ${y - dy * 0.05}, ${x} ${y}`;
}

const LINE: Record<LiveStatus, string> = {
  ok: "var(--color-ok-500)",
  error: "var(--color-err-500)",
  unknown: "var(--border-strong)",
  checking: "url(#optiai-flow)",
};

const POLL_MS = 20000;

/**
 * The network map: OptiAI in the middle, every provider it can route to
 * around it, one line each.
 *
 * On load every line is checked for real — each key is probed through the
 * router's own connection test, and a no-auth provider gets a one-token
 * completion. While a probe is in flight its line runs blue→violet, the same
 * breathing the chat shows while it waits for a first token; it settles green
 * or red when the answer comes back.
 *
 * Clicking a provider zooms in: it takes the hub and its tested models become
 * the ring, green for the ones that passed and red for the ones that did
 * not. Back returns to the provider view. The topology itself is re-read
 * every 20 s so a key added elsewhere shows up without a reload.
 */
export function ProviderTopology({
  refreshKey = 0,
  className,
}: {
  /** Bump to re-read the topology and re-run every probe. */
  refreshKey?: number;
  className?: string;
}) {
  const network = useApi(() => getNetwork(), []);
  const nodes = useMemo(() => network.data?.nodes ?? [], [network.data]);

  const [live, setLive] = useState<Record<string, LiveStatus>>({});
  const [results, setResults] = useState<Record<string, NetworkCheck>>({});
  const [flash, setFlash] = useState<Record<string, boolean>>({});
  const [focus, setFocus] = useState<string | null>(null);
  const checkedOnce = useRef(false);

  const statusOf = useCallback(
    (node: NetworkNode): LiveStatus => live[node.id] ?? node.status,
    [live]
  );

  /**
   * Probes are staggered rather than fired at once so the lines light up one
   * after another and a slow provider is visibly the slow one. They still
   * overlap, so the whole map settles in a few seconds, not one per provider.
   */
  const runChecks = useCallback(async (targets: NetworkNode[]) => {
    await Promise.all(
      targets.map(
        (node, i) =>
          new Promise<void>((resolve) => {
            setTimeout(async () => {
              setLive((prev) => ({ ...prev, [node.id]: "checking" }));
              try {
                const result = await checkNetworkProvider(node.id);
                setResults((prev) => ({ ...prev, [node.id]: result }));
                setLive((prev) => ({ ...prev, [node.id]: result.ok ? "ok" : "error" }));
              } catch (err) {
                setResults((prev) => ({
                  ...prev,
                  [node.id]: {
                    provider: node.id,
                    ok: false,
                    error: err instanceof Error ? err.message : "Check failed",
                    connections: [],
                    latencyMs: 0,
                  },
                }));
                setLive((prev) => ({ ...prev, [node.id]: "error" }));
              }
              setFlash((prev) => ({ ...prev, [node.id]: true }));
              setTimeout(() => setFlash((prev) => ({ ...prev, [node.id]: false })), 1400);
              resolve();
            }, i * 350);
          })
      )
    );
  }, []);

  useEffect(() => {
    if (checkedOnce.current || nodes.length === 0) return;
    checkedOnce.current = true;
    void runChecks(nodes);
  }, [nodes, runChecks]);

  // An explicit refresh re-reads the map and re-probes everything.
  const lastRefresh = useRef(refreshKey);
  useEffect(() => {
    if (refreshKey === lastRefresh.current) return;
    lastRefresh.current = refreshKey;
    void network.refetch().then(() => {
      checkedOnce.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Quiet background re-read: new keys appear, nothing is re-probed.
  useEffect(() => {
    const timer = setInterval(() => void network.refetch(), POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const anyChecking = Object.values(live).some((s) => s === "checking");
  const okCount = nodes.filter((n) => statusOf(n) === "ok").length;
  const errCount = nodes.filter((n) => statusOf(n) === "error").length;
  const focused = nodes.find((n) => n.id === focus) || null;

  return (
    <div className={cx("flex h-full flex-col", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-start gap-2">
          {focused && (
            <button
              onClick={() => setFocus(null)}
              aria-label="Back to all providers"
              className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-[15px] font-semibold text-[var(--text)]">
              {focused ? focused.name : "Network"}
            </h2>
            <p className="mt-0.5 text-[13px] text-[var(--text-subtle)]">
              {focused ? (
                <FocusBlurb node={focused} status={statusOf(focused)} result={results[focused.id]} />
              ) : network.loading && nodes.length === 0 ? (
                "Finding what OptiAI can route to…"
              ) : nodes.length === 0 ? (
                "No connected providers yet"
              ) : (
                `${nodes.length} reachable · ${okCount} healthy${errCount ? ` · ${errCount} failing` : ""}`
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Legend />
          {focused ? (
            <Link href={`/providers/${focused.id}`}>
              <Button size="sm" variant="ghost" icon={<ArrowUpRight className="h-3.5 w-3.5" />}>
                Manage
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              icon={<RefreshCw className={cx("h-3.5 w-3.5", anyChecking && "animate-spin")} />}
              onClick={() => void runChecks(nodes)}
              disabled={anyChecking || nodes.length === 0}
            >
              Re-check
            </Button>
          )}
        </div>
      </div>

      {/* The map. Percent coordinates for nodes and a stretched SVG for the
          lines so both agree at any card width. */}
      <div className="relative mx-3 mt-2 min-h-[380px] flex-1 overflow-hidden rounded-xl">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
          }}
        />

        {focused ? (
          <ModelRing key={focused.id} node={focused} status={statusOf(focused)} />
        ) : network.loading && nodes.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center">
            <Skeleton className="h-16 w-40 rounded-xl" />
          </div>
        ) : nodes.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <p className="text-[13.5px] font-medium text-[var(--text)]">Nothing connected yet</p>
              <p className="mt-1 text-[12.5px] text-[var(--text-subtle)]">
                Connect a provider and it appears here with a live line to OptiAI.
              </p>
              <Link href="/providers" className="mt-3 inline-block">
                <Button size="sm" variant="primary">
                  Open Providers
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <Ring
            hub={
              <>
                <LogoMark size={18} />
                <span className="font-display text-[13.5px] font-bold tracking-tight text-[var(--text)]">
                  OptiAI
                </span>
              </>
            }
            hubChecking={anyChecking}
            items={nodes.map((node) => {
              const status = statusOf(node);
              return {
                id: node.id,
                status,
                flash: Boolean(flash[node.id]),
                title: results[node.id]?.error || node.name,
                onClick: () => setFocus(node.id),
                content: (
                  <>
                    <ProviderLogo id={node.id} name={node.name} size="sm" className="!h-6 !w-6 !rounded-md" />
                    <span className="whitespace-nowrap text-[12.5px] font-medium text-[var(--text)]">
                      {node.name}
                    </span>
                    <StatusDot
                      tone={status === "ok" ? "ok" : status === "error" ? "err" : status === "checking" ? "warn" : "neutral"}
                    />
                  </>
                ),
              };
            })}
          />
        )}
      </div>
    </div>
  );
}

function FocusBlurb({
  node,
  status,
  result,
}: {
  node: NetworkNode;
  status: LiveStatus;
  result?: NetworkCheck;
}) {
  const parts: string[] = [];
  parts.push(
    status === "checking"
      ? "checking…"
      : status === "ok"
        ? "reachable"
        : status === "error"
          ? `failing${result?.error ? ` — ${result.error}` : ""}`
          : "not checked"
  );
  if (result?.probedModel) parts.push(`probed ${shortModelName(result.probedModel)} in ${formatLatency(result.latencyMs)}`);
  else if (result) parts.push(`${result.connections.length} ${result.connections.length === 1 ? "key" : "keys"} checked`);
  if (node.lastTestedAt) parts.push(`models tested ${formatRelativeTime(node.lastTestedAt)}`);
  return <>{parts.join(" · ")}</>;
}

/**
 * Provider view: the provider is the hub and its tested models are the ring.
 * Each verdict is the last real one-token completion for that model, so the
 * green ones are exactly what the chat composer will offer.
 */
function ModelRing({ node, status }: { node: NetworkNode; status: LiveStatus }) {
  const tests = useApi(() => getModelTests(node.id), [node.id]);
  const verdicts = useMemo(
    () =>
      Object.values(tests.data?.results ?? {}).sort((a, b) => {
        if (a.ok !== b.ok) return a.ok ? -1 : 1;
        return (a.latencyMs ?? Infinity) - (b.latencyMs ?? Infinity);
      }),
    [tests.data]
  );

  if (tests.loading) {
    return (
      <div className="absolute inset-0 grid place-items-center">
        <Skeleton className="h-16 w-40 rounded-xl" />
      </div>
    );
  }

  if (verdicts.length === 0) {
    return (
      <div className="absolute inset-0 grid place-items-center p-6 text-center">
        <div>
          <p className="text-[13.5px] font-medium text-[var(--text)]">No models tested yet</p>
          <p className="mt-1 text-[12.5px] text-[var(--text-subtle)]">
            Run Test models on {node.name} and each one appears here with its verdict.
          </p>
          <Link href={`/providers/${node.id}`} className="mt-3 inline-block">
            <Button size="sm" variant="primary">
              Test models
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Ring
      hub={
        <>
          <ProviderLogo id={node.id} name={node.name} size="sm" className="!h-6 !w-6 !rounded-md" />
          <span className="font-display whitespace-nowrap text-[13.5px] font-bold tracking-tight text-[var(--text)]">
            {node.name}
          </span>
          <StatusDot tone={status === "ok" ? "ok" : status === "error" ? "err" : status === "checking" ? "warn" : "neutral"} />
        </>
      }
      hubChecking={status === "checking"}
      items={verdicts.map((v) => ({
        id: v.modelId,
        status: v.ok ? ("ok" as const) : ("error" as const),
        flash: false,
        title: v.ok
          ? `${v.modelId}${v.connectionName ? ` · answered by ${v.connectionName}` : ""}${v.latencyMs != null ? ` · ${formatLatency(v.latencyMs)}` : ""}`
          : `${v.modelId} · ${v.error || (v.status ? `HTTP ${v.status}` : "failed")}`,
        content: (
          <>
            <StatusDot tone={v.ok ? "ok" : "err"} />
            <span className="max-w-[150px] truncate font-mono text-[11.5px] text-[var(--text)]">
              {shortModelName(v.modelId)}
            </span>
            <span className="shrink-0 tabular-nums text-[10.5px] text-[var(--text-subtle)]">
              {v.ok ? (v.latencyMs != null ? formatLatency(v.latencyMs) : "ok") : v.status ? `${v.status}` : "×"}
            </span>
          </>
        ),
      }))}
    />
  );
}

interface RingItem {
  id: string;
  status: LiveStatus;
  flash: boolean;
  title: string;
  content: React.ReactNode;
  onClick?: () => void;
}

/** Hub plus ring, lines drawn beneath. Shared by both zoom levels. */
function Ring({
  hub,
  hubChecking,
  items,
}: {
  hub: React.ReactNode;
  hubChecking: boolean;
  items: RingItem[];
}) {
  const positions = useMemo(() => layout(items.length), [items.length]);
  return (
    <>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="optiai-flow" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#2f80fc" />
            <stop offset="50%" stopColor="#6768fb" />
            <stop offset="100%" stopColor="#9642fd" />
          </linearGradient>
        </defs>
        {items.map((item, i) => {
          const p = positions[i];
          return (
            <g key={item.id}>
              {item.flash && item.status !== "checking" && (
                <path
                  d={link(p.x, p.y)}
                  fill="none"
                  stroke={LINE[item.status]}
                  strokeWidth={8}
                  strokeOpacity={0.18}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className="net-flash"
                />
              )}
              <path
                d={link(p.x, p.y)}
                fill="none"
                stroke={LINE[item.status]}
                strokeWidth={item.status === "checking" ? 2.5 : item.status === "unknown" ? 1.25 : 1.75}
                strokeOpacity={item.status === "unknown" ? 0.9 : 1}
                strokeDasharray={item.status === "checking" ? "7 9" : item.status === "unknown" ? "3 6" : undefined}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className={cx("transition-[stroke] duration-500", item.status === "checking" && "net-flow")}
              />
            </g>
          );
        })}
      </svg>

      <div
        className={cx(
          "animate-in absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-xl border bg-[var(--surface)] px-3.5 py-2 shadow-[var(--shadow-md)]",
          hubChecking ? "net-grad net-hub-pulse border-transparent" : "border-[var(--brand-soft-border)]"
        )}
      >
        {hub}
      </div>

      {items.map((item, i) => {
        const p = positions[i];
        const Tag = item.onClick ? "button" : "div";
        return (
          <Tag
            key={item.id}
            type={item.onClick ? "button" : undefined}
            onClick={item.onClick}
            title={item.title}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className={cx(
              "animate-in absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-xl border bg-[var(--surface)] py-1.5 pl-1.5 pr-3 text-left shadow-[var(--shadow-sm)] transition-all duration-300",
              item.onClick && "cursor-pointer hover:shadow-[var(--shadow-md)] active:scale-[0.98]",
              item.status === "checking" && "net-grad net-node-pulse border-transparent",
              item.status === "ok" && "border-ok-500/50",
              item.status === "error" && "border-err-500/60",
              item.status === "unknown" && "border-[var(--border)]",
              item.flash && item.status === "ok" && "net-flash-ok",
              item.flash && item.status === "error" && "net-flash-err"
            )}
          >
            {item.content}
          </Tag>
        );
      })}
    </>
  );
}

function Legend() {
  return (
    <span className="mr-1 hidden items-center gap-2.5 text-[11px] text-[var(--text-subtle)] @2xl:inline-flex">
      <span className="inline-flex items-center gap-1">
        <span className="h-[3px] w-4 rounded-full grad-brand" /> checking
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-[3px] w-4 rounded-full bg-ok-500" /> ok
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-[3px] w-4 rounded-full bg-err-500" /> failed
      </span>
    </span>
  );
}
