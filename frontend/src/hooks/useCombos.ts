"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createCombo as createComboApi, deleteCombo as deleteComboApi, getCombos, updateCombo as updateComboApi } from "@/lib/api";
import { useLocalStorage } from "./useApi";
import type { Combo } from "@/lib/types";

/**
 * Combos, stored in the backend.
 *
 * They used to be held in this browser because only GET was routed. That made
 * them invisible to everything except this tab — and a combo's whole job is to
 * be a model name a CLI can send, which the router resolves by looking it up
 * in the database. A combo that existed only in localStorage could never
 * resolve, so pointing a CLI at one failed with "No active credentials for
 * provider: openai": the name matched nothing, so it fell through to a default
 * provider. Now every write goes to `/api/models/combos` and the list is
 * re-read from the server, so what you see is what the router sees.
 */
export interface UiCombo extends Combo {
  /** Kept so callers that branch on it still compile; always false now. */
  isLocal: boolean;
}

export function useCombos() {
  const [combos, setCombos] = useState<UiCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Combos made before the server route existed. Pushed up once, then cleared.
  const [orphans, setOrphans] = useLocalStorage<Combo[]>("optiai.localCombos", []);
  const migrated = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const list = await getCombos();
      setCombos(list.map((c) => ({ ...c, isLocal: false })));
      setError(null);
      return list;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load combos");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Carry browser-only combos up to the server once, so upgrading does not
   * silently drop what you already built. A name that already exists server
   * side wins — it is the one the router is already resolving.
   */
  useEffect(() => {
    if (migrated.current || loading || orphans.length === 0) return;
    migrated.current = true;

    void (async () => {
      const taken = new Set(combos.map((c) => c.name.toLowerCase()));
      for (const orphan of orphans) {
        if (taken.has(orphan.name.toLowerCase())) continue;
        try {
          await createComboApi({ name: orphan.name, models: orphan.models || [] });
        } catch {
          /* a rejected name is not worth blocking the rest of the migration */
        }
      }
      setOrphans([]);
      await refresh();
    })();
  }, [loading, orphans, combos, setOrphans, refresh]);

  const createCombo = useCallback(
    async (name: string, models: string[] = []) => {
      const created = await createComboApi({ name, models });
      await refresh();
      return created.id;
    },
    [refresh]
  );

  const updateCombo = useCallback(
    async (id: string, patch: Partial<Combo>) => {
      await updateComboApi(id, patch);
      await refresh();
    },
    [refresh]
  );

  const deleteCombo = useCallback(
    async (id: string) => {
      await deleteComboApi(id);
      await refresh();
    },
    [refresh]
  );

  /** Name rule mirrors the backend's: letters, numbers, - _ and . only. */
  const isValidName = (name: string) => /^[A-Za-z0-9._-]+$/.test(name);

  const nameTaken = useCallback(
    (name: string, exceptId?: string) =>
      combos.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== exceptId),
    [combos]
  );

  return useMemo(
    () => ({
      combos,
      loading,
      error,
      refresh,
      createCombo,
      updateCombo,
      deleteCombo,
      isValidName,
      nameTaken,
    }),
    [combos, loading, error, refresh, createCombo, updateCombo, deleteCombo, nameTaken]
  );
}
