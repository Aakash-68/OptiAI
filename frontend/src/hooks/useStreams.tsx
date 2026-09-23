"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface Streams {
  /** Thread ids currently generating. */
  active: Record<string, boolean>;
  isStreaming: (threadId?: string | null) => boolean;
  /** Register a thread as generating and get its abort handle. */
  begin: (threadId: string) => AbortController;
  end: (threadId: string) => void;
  stop: (threadId: string) => void;
  anyActive: boolean;
}

const StreamsContext = createContext<Streams>({
  active: {},
  isStreaming: () => false,
  begin: () => new AbortController(),
  end: () => {},
  stop: () => {},
  anyActive: false,
});

/**
 * Which threads are mid-generation, keyed by thread.
 *
 * This used to be one boolean and one AbortController on the chat page, which
 * meant a single request locked the composer everywhere: you could not open
 * another chat and ask something else while the first was still answering,
 * and starting a second would have orphaned the first one's controller so it
 * could never be stopped. Nothing about that was a provider limit — every
 * request is an independent HTTP call, and the browser will happily run
 * several.
 *
 * It lives above the chat page so the sidebar can mark which conversations
 * are still working, which is what makes running several of them legible
 * rather than confusing.
 */
export function StreamsProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Record<string, boolean>>({});
  const controllers = useRef(new Map<string, AbortController>());

  const begin = useCallback((threadId: string) => {
    // A thread only ever has one request in flight, so a second begin on the
    // same thread replaces the first rather than racing it.
    controllers.current.get(threadId)?.abort();
    const controller = new AbortController();
    controllers.current.set(threadId, controller);
    setActive((prev) => ({ ...prev, [threadId]: true }));
    return controller;
  }, []);

  const end = useCallback((threadId: string) => {
    controllers.current.delete(threadId);
    setActive((prev) => {
      if (!prev[threadId]) return prev;
      const next = { ...prev };
      delete next[threadId];
      return next;
    });
  }, []);

  const stop = useCallback((threadId: string) => {
    controllers.current.get(threadId)?.abort();
  }, []);

  const isStreaming = useCallback(
    (threadId?: string | null) => Boolean(threadId && active[threadId]),
    [active]
  );

  // Leaving the app should not leave requests running against a dead page.
  useEffect(() => {
    const map = controllers.current;
    return () => {
      for (const controller of map.values()) controller.abort();
      map.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      active,
      isStreaming,
      begin,
      end,
      stop,
      anyActive: Object.keys(active).length > 0,
    }),
    [active, isStreaming, begin, end, stop]
  );

  return <StreamsContext.Provider value={value}>{children}</StreamsContext.Provider>;
}

export const useStreams = () => useContext(StreamsContext);
