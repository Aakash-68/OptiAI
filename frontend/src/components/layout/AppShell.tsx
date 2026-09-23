"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ModeSwitch } from "./ModeSwitch";
import { useLocalStorage } from "@/hooks/useApi";
import { useChatMode } from "@/hooks/useChatMode";

/**
 * Two-column app frame: a fixed sidebar and a scrolling content column with its
 * own topbar. The content column owns the scroll (not <body>) so the sidebar
 * and topbar stay put on long Usage tables.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useLocalStorage("optiai.sidebarCollapsed", false);
  const pathname = usePathname();
  const { mode, setMode } = useChatMode();

  const onChat = pathname.startsWith("/chat");

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--canvas)]">
      <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((v) => !v)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          sidebarCollapsed={collapsed}
          center={onChat ? <ModeSwitch mode={mode} onChange={setMode} /> : null}
        />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
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
