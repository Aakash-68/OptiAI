"use client";

import type { ReactNode } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { ThemeToggle } from "./ThemeToggle";

/**
 * The strip above the content area.
 *
 * It carries no background, border or shadow of its own — it sits directly on
 * the canvas so the chat column reads as one continuous surface rather than
 * starting under a banded header. Intentionally near-empty: every tab except
 * Chat carries its own heading, and Chat fills the centre slot with the
 * Chat/Ask switch.
 *
 * The three columns are equal width so the centre stays optically centred
 * whether or not the collapsed-sidebar mark is showing on the left. The right
 * end carries light/dark, which is app-wide and so belongs here rather than
 * in the chat composer.
 */
export function Topbar({
  center,
  sidebarCollapsed,
}: {
  center?: ReactNode;
  sidebarCollapsed: boolean;
}) {
  return (
    <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 bg-transparent px-4">
      <div className="flex items-center">{sidebarCollapsed && <LogoMark size={20} />}</div>

      <div className="flex justify-center">{center}</div>

      <div className="flex justify-end">
        <ThemeToggle />
      </div>
    </header>
  );
}
