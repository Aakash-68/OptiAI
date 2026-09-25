"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Layers, Plug, Zap } from "lucide-react";
import Link from "next/link";
import { getCombos, getTestedModels } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { cx, shortModelName } from "@/lib/format";
import { ProviderLogo } from "@/components/ui/ProviderLogo";
import { CapabilityIcons } from "@/components/models/CapabilityIcons";
import { SearchInput } from "@/components/ui/Input";
import type { TestedModel } from "@/lib/types";

export interface ModelChoice {
  /** What gets sent as `model` to /api/chat — a combo name or a model id. */
  value: string;
  label: string;
  provider?: string;
  isCombo?: boolean;
  /** False when the owning provider has no connection yet. */
  ready?: boolean;
}

/**
 * Model / combo selector for the composer.
 *
 * Only models that are reachable *right now* are listed: the provider has a live
 * connection and the model itself last tested clean (GET /api/models/tested).
 * Untested and failing models are not shown at all — picking from this list is
 * meant to be a guarantee, not a suggestion.
 *
 * The earlier behaviour listed every provider in the catalog, connected or not,
 * so the dropdown was mostly models that could not answer. When nothing has been
 * tested the list is empty on purpose, and says where to go to fix that.
 */
export function ModelPicker({
  value,
  onChange,
  align = "left",
  allowedModels,
}: {
  value: ModelChoice | null;
  onChange: (choice: ModelChoice) => void;
  align?: "left" | "right";
  /**
   * When the thread belongs to a project that restricts its models, only
   * these ids are offered. Undefined or empty means no restriction.
   */
  allowedModels?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; bottom: number; maxHeight: number } | null>(null);

  const { data: tested, loading } = useApi(() => getTestedModels(), []);
  const { data: combos } = useApi(() => getCombos(), []);

  const models = useMemo(() => {
    const all = tested?.models || [];
    if (!allowedModels?.length) return all;
    const allow = new Set(allowedModels);
    // Match on either the catalog id or the routing value — a project stores
    // the catalog id, which is not always what gets sent as `model`.
    return all.filter((m) => allow.has(m.id) || allow.has(m.value));
  }, [tested, allowedModels]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /*
   * The menu is portalled to <body> and positioned from the trigger's rect.
   * It used to be an absolutely-positioned child, which meant any ancestor
   * with a clip — the composer's BorderBeam sets `overflow: hidden` on its
   * root — cropped it. Fixed coordinates also let it size itself to the space
   * actually above the trigger instead of a guessed max-height.
   */
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const WIDTH = 340;
      const GAP = 8;
      const EDGE = 8;
      const left = Math.min(
        Math.max(EDGE, align === "right" ? r.right - WIDTH : r.left),
        Math.max(EDGE, window.innerWidth - WIDTH - EDGE)
      );
      setPos({
        left,
        bottom: window.innerHeight - r.top + GAP,
        maxHeight: Math.max(200, r.top - GAP - EDGE),
      });
    };
    place();
    window.addEventListener("resize", place);
    // capture phase: any scrolling ancestor should reposition it, not just window
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align]);

  /**
   * A model that was selected earlier can stop being usable — its connection is
   * removed, or a re-test fails. Clearing the stale selection is better than
   * leaving a model in the composer that the list no longer contains.
   */
  useEffect(() => {
    if (loading || !tested || !value || value.isCombo) return;
    // Matched on `value` (the routing string). A selection saved before this
    // field existed holds a bare catalog id, so it will not match and is
    // correctly retired rather than left to fail on send.
    const stillUsable = models.some((m) => m.value === value.value);
    if (!stillUsable && value.ready !== false) {
      onChange({ ...value, ready: false });
    }
  }, [loading, tested, models, value, onChange]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? models.filter(
          (m) =>
            m.id.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q) ||
            m.providerName.toLowerCase().includes(q)
        )
      : models;

    const byProvider = new Map<string, { name: string; models: TestedModel[] }>();
    for (const model of filtered) {
      if (!byProvider.has(model.provider)) {
        byProvider.set(model.provider, { name: model.providerName, models: [] });
      }
      byProvider.get(model.provider)!.models.push(model);
    }
    return [...byProvider.entries()];
  }, [models, query]);

  const filteredCombos = useMemo(() => {
    if (query.trim()) return [];
    return combos || [];
  }, [combos, query]);

  const isEmpty = !loading && models.length === 0 && filteredCombos.length === 0;

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-[230px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[13px] font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)]"
      >
        {value?.isCombo ? (
          <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
        ) : value?.provider ? (
          <ProviderLogo id={value.provider} size="sm" className="!h-5 !w-5 !rounded-md" />
        ) : null}
        <span className="truncate">{value?.label || "Select a model"}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--text-subtle)]" />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              left: pos.left,
              bottom: pos.bottom,
              width: 340,
              maxHeight: pos.maxHeight,
            }}
            className="animate-in z-50 flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-[var(--shadow-lg)]"
          >
          <div className="shrink-0 border-b border-[var(--border)] p-2.5">
            <SearchInput value={query} onChange={setQuery} placeholder="Search models…" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {loading && (
              <div className="px-1 py-1">
                <SkeletonRows count={5} leading="circle" trailing={1} height="h-9" />
                <p className="px-2 pb-1 pt-2 text-center text-[11.5px] text-[var(--text-subtle)]">
                  Checking which models are reachable…
                </p>
              </div>
            )}

            {isEmpty && (
              <div className="px-3 py-4 text-center">
                <Plug className="mx-auto h-5 w-5 text-[var(--text-subtle)]" />
                <p className="mt-2 text-[13px] font-semibold text-[var(--text)]">
                  No tested models yet
                </p>
                <p className="mt-1 text-[12px] leading-snug text-[var(--text-subtle)]">
                  Only models that passed a live test appear here. Connect a provider and run
                  &ldquo;Test models&rdquo; on it.
                </p>
                <Link
                  href="/providers"
                  onClick={() => setOpen(false)}
                  className="mt-2.5 inline-block text-[12px] font-semibold text-[var(--brand)] underline underline-offset-2"
                >
                  Go to Providers
                </Link>
              </div>
            )}

            {filteredCombos.length > 0 && (
              <div className="mb-1">
                <p className="px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                  Combos
                </p>
                {filteredCombos.map((combo) => (
                  <button
                    key={combo.id}
                    onClick={() => {
                      onChange({ value: combo.name, label: combo.name, isCombo: true, ready: true });
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-[var(--text)] transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    <Layers className="h-3.5 w-3.5 text-[var(--brand)]" />
                    <span className="flex-1 truncate">{combo.name}</span>
                    <span className="text-[11px] text-[var(--text-subtle)]">
                      {combo.models.length} models
                    </span>
                    {value?.value === combo.name && (
                      <Check className="h-3.5 w-3.5 text-[var(--brand)]" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {grouped.map(([providerId, group]) => (
              <div key={providerId} className="mb-1">
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <ProviderLogo
                    id={providerId}
                    name={group.name}
                    size="sm"
                    className="!h-4 !w-4 !rounded"
                  />
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                    {group.name}
                  </p>
                </div>

                {group.models.map((model) => (
                  <button
                    key={`${providerId}:${model.id}`}
                    onClick={() => {
                      onChange({
                        // `value`, not `id`: the backend returns the fully
                        // qualified routing string (provider alias + catalog id,
                        // which may itself contain a slash). Sending the bare id
                        // makes the router read the catalog's own vendor prefix
                        // as the provider and drop it, which 404s upstream.
                        value: model.value,
                        label: model.name || shortModelName(model.id),
                        provider: model.provider,
                        ready: true,
                      });
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-[var(--text)]">
                        {model.name || shortModelName(model.id)}
                      </span>
                      <span className="block truncate font-mono text-[10.5px] text-[var(--text-subtle)]">
                        {model.id}
                      </span>
                    </span>
                    <CapabilityIcons
                      id={model.id}
                      name={model.name}
                      size="sm"
                      className="shrink-0"
                    />
                    {typeof model.latencyMs === "number" && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 text-[10.5px] tabular-nums text-ok-600 dark:text-ok-500">
                        <Zap className="h-3 w-3" />
                        {model.latencyMs}ms
                      </span>
                    )}
                    {value?.value === model.id && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {!isEmpty && !loading && (
            <p className="shrink-0 border-t border-[var(--border)] px-3 py-2 text-[11px] text-[var(--text-subtle)]">
              Showing {models.length} model{models.length === 1 ? "" : "s"} that passed a live test.
            </p>
          )}
          </div>,
          document.body
        )}
    </div>
  );
}
