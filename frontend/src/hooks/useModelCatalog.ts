"use client";

import { useEffect, useState } from "react";
import { getModels, getProviders } from "@/lib/api";
import type { Model, Provider } from "@/lib/types";

export interface CatalogModel extends Model {
  providerId: string;
  providerName: string;
  connected: boolean;
}

/**
 * Aggregated model catalog.
 *
 * Now that the backend serves only the supported provider set, `GET /api/models`
 * with no provider returns every model in one response — two requests total
 * instead of one per provider.
 */
export function useModelCatalog() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [list, catalog] = await Promise.all([getProviders(), getModels()]);
        if (!alive) return;

        setProviders(list);
        const byId = new Map(list.map((p) => [p.id, p]));

        setModels(
          (catalog.models || []).map<CatalogModel>((model) => {
            const provider = byId.get(model.provider || "");
            return {
              ...model,
              providerId: model.provider || "",
              providerName: provider?.name || model.provider || "",
              connected: (provider?.connections || 0) > 0,
            };
          })
        );
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Failed to load models");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  /** Kept for API compatibility — the catalog is already complete. */
  async function loadProvider(_providerId: string) {
    return;
  }

  return { providers, models, loading, error, loadProvider };
}
