"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { CirclePlus, Replace } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ModeSwitch } from "./ModeSwitch";
import { ResizeHandle, SplitPane } from "./SplitPane";
import { useLocalStorage } from "@/hooks/useApi";
import { useChatMode } from "@/hooks/useChatMode";
import { useChatStore } from "@/hooks/useChatStore";
import { readPaneDrop, useSplitView, type PaneTarget } from "@/hooks/useSplitView";
import { cx } from "@/lib/format";

/**
 * Two-column app frame: a fixed sidebar and a content column with its own
 * topbar. The content column owns the scroll (not <body>) so the sidebar and
 * topbar stay put on long Usage tables.
 *
 * The content column can split. Anything in the sidebar — a tab or a chat —
 * can be dragged onto its right half and opens there beside whatever the
 * main column is showing; the divider between them drags, and the pane
 * closes from its bottom-right corner.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useLocalStorage("optiai.sidebarCollapsed", false);
  const pathname = usePathname();
  const router = useRouter();
  const { mode, setMode } = useChatMode();
  const { pane, open, ratio, dragging } = useSplitView();
  const { selectThread } = useChatStore();

  const rowRef = useRef<HTMLDivElement>(null);
  const [zone, setZone] = useState<"main" | "pane" | null>(null);

  const onChat = pathname.startsWith("/chat");

  /** Dropping on the left navigates the main column; on the right, it opens the pane. */
  function land(target: PaneTarget, where: "main" | "pane") {
    if (where === "pane") {
      open(target);
      return;
    }
    if (target.kind === "thread") {
      selectThread(target.threadId);
      router.push("/chat");
    } else {
      router.push(target.href);
    }
  }

  function zoneFor(e: DragEvent<HTMLElement>): "main" | "pane" {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX - rect.left > rect.width * (pane ? ratio : 0.5) ? "pane" : "main";
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--canvas)]">
      <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((v) => !v)} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar
          sidebarCollapsed={collapsed}
          center={onChat ? <ModeSwitch mode={mode} onChange={setMode} /> : null}
        />

        <div ref={rowRef} className="flex min-h-0 flex-1">
          {/* @container: pages lay themselves out by the width they actually
              get, which is half the window when a pane is open. */}
          <main
            className="@container min-h-0 min-w-0 overflow-y-auto"
            style={pane ? { flex: `0 0 calc(${ratio * 100}% - 3px)` } : { flex: "1 1 0%" }}
          >
            {children}
          </main>

          {pane && (
            <>
              <ResizeHandle containerRef={rowRef} />
              <SplitPane target={pane} />
            </>
          )}
        </div>

        {/*
         * The drop target only exists while something is being dragged from
         * the sidebar, so it never intercepts an ordinary click. It covers
         * the whole content column and lights up the half the pointer is
         * over: left to open in place, right to open beside.
         */}
        {dragging && (
          <div
            className="drop-in absolute inset-x-0 bottom-0 top-14 z-40 flex"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              const next = zoneFor(e);
              if (next !== zone) setZone(next);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setZone(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const target = readPaneDrop(e, dragging);
              const where = zoneFor(e);
              setZone(null);
              if (target) land(target, where);
            }}
          >
            <DropZone
              active={zone === "main"}
              label="Open here"
              icon={<Replace className="h-5 w-5" />}
              style={{ flex: `0 0 ${(pane ? ratio : 0.5) * 100}%` }}
            />
            <DropZone
              active={zone === "pane"}
              label={pane ? "Replace split view" : "Create split view"}
              icon={<CirclePlus className="h-5 w-5" />}
              style={{ flex: "1 1 0%" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DropZone({
  active,
  label,
  icon,
  style,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cx(
        "m-2 grid place-items-center rounded-xl border-2 border-dashed transition-all duration-150",
        active
          ? "border-accent-400 bg-accent-50/80 text-accent-700 dark:bg-accent-500/12 dark:text-accent-300"
          : "border-[var(--border-strong)] bg-[var(--canvas)]/70 text-[var(--text-subtle)]"
      )}
    >
      <div className="pointer-events-none flex flex-col items-center gap-1.5">
        {icon}
        <span className="text-[13px] font-medium">{label}</span>
      </div>
    </div>
  );
}

/**
 * Standard page frame for every tab except Chat (which is full-bleed).
 * Keeps the max width, gutters and heading rhythm identical across screens.
 */
export function PageContainer({
  title,
  description,
  actions,
  children,
  width = "default",
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  width?: "default" | "wide";
}) {
  return (
    <div
      className={
        width === "wide"
          ? "mx-auto w-full max-w-[1400px] px-6 py-6"
          : "mx-auto w-full max-w-[1120px] px-6 py-6"
      }
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight text-[var(--text)]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-[13.5px] text-[var(--text-subtle)]">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
