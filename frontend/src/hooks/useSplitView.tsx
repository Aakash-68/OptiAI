"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { useLocalStorage } from "./useApi";

/**
 * What a pane can show: a sidebar tab, or one chat thread.
 *
 * Only these two — the things you can pick up from the sidebar. Dynamic
 * routes (a provider's page, a CLI tool's setup) are reached by clicking
 * through inside the pane and navigate the main column instead.
 */
export type PaneTarget =
  | { kind: "route"; href: string; label: string }
  | { kind: "thread"; threadId: string; title: string };

/** MIME type on the drag payload. Anything else dropped on the shell is ignored. */
export const PANE_DRAG_TYPE = "application/x-optiai-pane";

interface SplitView {
  /** What the right pane shows, or null when there is no split. */
  pane: PaneTarget | null;
  open: (target: PaneTarget) => void;
  close: () => void;
  /** Main column's share of the width, 0.3–0.7. */
  ratio: number;
  setRatio: (ratio: number) => void;
  /** The item currently being dragged from the sidebar, for the drop target. */
  dragging: PaneTarget | null;
  /** Wire these onto any draggable sidebar row. */
  dragHandlers: (target: PaneTarget) => {
    draggable: true;
    onDragStart: (e: DragEvent) => void;
    onDragEnd: () => void;
  };
}

const SplitViewContext = createContext<SplitView>({
  pane: null,
  open: () => {},
  close: () => {},
  ratio: 0.5,
  setRatio: () => {},
  dragging: null,
  dragHandlers: () => ({ draggable: true, onDragStart: () => {}, onDragEnd: () => {} }),
});

const clampRatio = (r: number) => Math.min(0.7, Math.max(0.3, r));

/**
 * The split is remembered per browser so a Usage pane you keep beside Chat
 * survives a reload. The ratio is remembered separately so closing and
 * reopening a pane lands it at the width you had set.
 */
export function SplitViewProvider({ children }: { children: ReactNode }) {
  const [pane, setPane] = useLocalStorage<PaneTarget | null>("optiai.splitPane", null);
  const [ratio, setRatioRaw] = useLocalStorage("optiai.splitRatio", 0.5);
  const [dragging, setDragging] = useState<PaneTarget | null>(null);

  const open = useCallback((target: PaneTarget) => setPane(target), [setPane]);
  const close = useCallback(() => setPane(null), [setPane]);
  const setRatio = useCallback((r: number) => setRatioRaw(clampRatio(r)), [setRatioRaw]);

  const dragHandlers = useCallback(
    (target: PaneTarget) => ({
      draggable: true as const,
      onDragStart: (e: DragEvent) => {
        e.dataTransfer.setData(PANE_DRAG_TYPE, JSON.stringify(target));
        // Plain text too, so dropping outside the app pastes something sane.
        e.dataTransfer.setData("text/plain", target.kind === "route" ? target.href : target.title);
        e.dataTransfer.effectAllowed = "copy";
        setDragging(target);
      },
      onDragEnd: () => setDragging(null),
    }),
    []
  );

  const value = useMemo(
    () => ({ pane, open, close, ratio: clampRatio(ratio), setRatio, dragging, dragHandlers }),
    [pane, open, close, ratio, setRatio, dragging, dragHandlers]
  );

  return <SplitViewContext.Provider value={value}>{children}</SplitViewContext.Provider>;
}

export const useSplitView = () => useContext(SplitViewContext);

/** Reads a dropped payload; falls back to whatever the shell saw being dragged. */
export function readPaneDrop(e: DragEvent, fallback: PaneTarget | null): PaneTarget | null {
  try {
    const raw = e.dataTransfer.getData(PANE_DRAG_TYPE);
    if (raw) return JSON.parse(raw) as PaneTarget;
  } catch {
    /* malformed payload — use the fallback */
  }
  return fallback;
}

/* -------------------------------------------------------------------------- */

/**
 * Tells a page it is rendering inside the right pane, and for Chat, which
 * thread it should show there. Pages read this instead of the global
 * selection so the pane and the main column can show different threads.
 */
export interface PaneScope {
  inPane: true;
  threadId?: string;
}

const PaneContext = createContext<PaneScope | null>(null);

export function PaneProvider({ scope, children }: { scope: PaneScope; children: ReactNode }) {
  return <PaneContext.Provider value={scope}>{children}</PaneContext.Provider>;
}

export const usePane = () => useContext(PaneContext);
