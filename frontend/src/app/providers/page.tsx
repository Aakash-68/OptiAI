"use client";

import { useMemo, useState } from "react";
import { Plug } from "lucide-react";
import { PageContainer } from "@/components/layout/AppShell";
import { SearchInput } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState, ErrorNote } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonTile, stagger } from "@/components/ui/Skeleton";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { ConnectDialog } from "@/components/providers/ConnectDialog";
import { getModels } from "@/lib/api";
import { getProviders } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { formatNumber } from "@/lib/format";
import type { Provider } from "@/lib/types";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "connected", label: "Connected" },
  { id: "available", label: "Not connected" },
];

export default function ProvidersPage() {
  const { data: providers, loading, error, refetch } = useApi(() => getProviders(), []);
  const { data: catalog } = useApi(() => getModels(), []);

  /** Models grouped by provider, so each card can show what it can handle. */
  const modelsByProvider = useMemo(() => {
    const map = new Map<string, { id: string; name?: string }[]>();
    for (const m of catalog?.models || []) {
      const key = m.provider || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ id: m.id, name: m.name });
    }
    return map;
  }, [catalog]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [connecting, setConnecting] = useState<Provider | null>(null);

  const filtered = useMemo(() => {
    let list = providers || [];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          (p.tagline || "").toLowerCase().includes(q)
      );
    }
    if (filter === "connected") list = list.filter((p) => p.connections > 0);
    if (filter === "available") list = list.filter((p) => p.connections === 0);
    return list;
  }, [providers, query, filter]);

  const connectedCount = (providers || []).filter((p) => p.connections > 0).length;
  const totalModels = (providers || []).reduce((sum, p) => sum + p.modelCount, 0);

  return (
    <PageContainer
      title="Providers"
      description={
        providers
          ? `${providers.length} supported providers · ${formatNumber(totalModels)} models · ${connectedCount} connected`
          : "Connect accounts and control which models are available"
      }
      width="wide"
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search providers…"
          className="w-full max-w-xs"
        />
        <Tabs tabs={FILTERS} active={filter} onChange={setFilter} size="sm" />
      </div>

      {error && <ErrorNote message={error} className="mb-4" />}

      {loading ? (
        <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonTile
              key={i}
              index={i}
              icon="circle"
              lines={2}
              badges={2}
              className="rounded-2xl"
              footer={<Skeleton delay={stagger(i)} className="h-8 w-full rounded-lg" />}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Plug className="h-5 w-5" />}
          title="No providers match"
          description="Try a different search term or clear the filter."
        />
      ) : (
        <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {filtered.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              models={modelsByProvider.get(provider.id) || []}
              onConnect={setConnecting}
            />
          ))}
        </div>
      )}

      <p className="mt-6 text-[12px] leading-relaxed text-[var(--text-subtle)]">
        OptiAI supports a curated set of enterprise providers reached with licensed API
        credentials. Providers that work by proxying a personal subscription or an IDE&rsquo;s
        OAuth session are intentionally not offered.
      </p>

      <ConnectDialog
        provider={connecting}
        open={!!connecting}
        onClose={() => setConnecting(null)}
        onConnected={refetch}
      />
    </PageContainer>
  );
}
