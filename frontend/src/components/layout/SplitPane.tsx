"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftToLine, MessageCircle, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { cx } from "@/lib/format";
import { useChatStore } from "@/hooks/useChatStore";
import { PaneProvider, useSplitView, type PaneTarget } from "@/hooks/useSplitView";
import { PaneRouter } from "./PaneRouter";

/**
 * The right half of a split.
 *
 * A thin header names what is showing — the page, or the chat's title — and
 * offers to move it into the main column. The close control sits at the
 * bottom right, out of the way of page headings, the way the split it was
 * modelled on does it.
 */
export function SplitPane({ target }: { target: PaneTarget }) {
  const { close } = useSplitView();
  const router = useRouter();
  const { threads, hydrated, selectThread } = useChatStore();

  // A thread deleted from the sidebar takes its pane with it.
  useEffect(() => {
    if (target.kind === "thread" && hydrated && !threads.some((t) => t.id === target.threadId)) {
      close();
    }
  }, [target, threads, hydrated, close]);

  const nav = target.kind === "route" ? NAV_ITEMS.find((i) => i.href === target.href) : null;
  const Icon = nav?.icon ?? MessageCircle;
  const title =
    target.kind === "route"
      ? nav?.label ?? target.label
      : threads.find((t) => t.id === target.threadId)?.title ?? target.title;

  function promote() {
    if (target.kind === "thread") {
      selectThread(target.threadId);
      router.push("/chat");
    } else {
      router.push(target.href);
    }
    close();
  }

  return (
    <section
      aria-label={`${title} pane`}
      className="pane-in relative flex min-h-0 min-w-0 flex-1 flex-col border-l border-[var(--border)] bg-[var(--canvas)]"
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3">
        <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[var(--text)]">{title}</span>
        <button
          onClick={promote}
          title="Move to main view"
          aria-label="Move to main view"
          className="grid h-6 w-6 place-items-center rounded-md text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        >
          <ArrowLeftToLine className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="@container min-h-0 flex-1 overflow-y-auto">
        <PaneProvider
          scope={target.kind === "thread" ? { inPane: true, threadId: target.threadId } : { inPane: true }}
        >
          {/* key remounts the page when the pane's target changes, so state
              from a previous tab never leaks into the next one */}
          <PaneRouter key={target.kind === "thread" ? `thread:${target.threadId}` : target.href} href={target.kind === "thread" ? "/chat" : target.href} />
        </PaneProvider>
      </div>

      <button
        onClick={close}
        aria-label="Close split view"
        title="Close split view"
        className={cx(
          "absolute bottom-4 right-4 z-20 grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] shadow-[var(--shadow-md)]",
          "transition-all hover:border-[var(--border-strong)] hover:text-[var(--text)] active:scale-95"
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </section>
  );
}

/**
 * The divider between the two columns. Dragging it re-balances the split;
 * the ratio is what the shell stores, not pixels, so it survives a resize.
 */
export function ResizeHandle({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const { setRatio } = useSplitView();
  const active = useRef(false);

  useEffect(() => {
    function move(e: PointerEvent) {
      if (!active.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setRatio((e.clientX - rect.left) / rect.width);
    }
    function up() {
      if (!active.current) return;
      active.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [containerRef, setRatio]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize split view"
      onPointerDown={(e) => {
        e.preventDefault();
        active.current = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      onDoubleClick={() => setRatio(0.5)}
      className="group relative z-10 w-1.5 shrink-0 cursor-col-resize bg-transparent"
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--border)] transition-colors group-hover:bg-[var(--brand)] group-active:bg-[var(--brand)]" />
    </div>
  );
}
