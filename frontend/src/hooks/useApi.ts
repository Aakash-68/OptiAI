"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Fetch-on-mount with manual refetch.
 *
 * `deps` controls re-fetching; the fetcher itself is held in a ref so callers
 * can pass an inline arrow without causing an infinite loop.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): ApiState<T> & {
  refetch: () => Promise<void>;
  setData: (next: T) => void;
} {
  const [state, setState] = useState<ApiState<T>>({ data: null, error: null, loading: true });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcherRef.current();
      if (aliveRef.current) setState({ data, error: null, loading: false });
    } catch (err) {
      if (aliveRef.current) {
        setState({
          data: null,
          error: err instanceof Error ? err.message : "Request failed",
          loading: false,
        });
      }
    }
  }, []);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback((next: T) => setState((s) => ({ ...s, data: next })), []);

  return { ...state, refetch: run, setData };
}

/** localStorage-backed state that degrades to in-memory when storage is blocked. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* private mode / blocked storage — keep the in-memory default */
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota or blocked storage — the UI still works, it just won't persist */
    }
  }, [key, value, hydrated]);

  return [value, setValue, hydrated] as const;
}
