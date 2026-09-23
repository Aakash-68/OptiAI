"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

/**
 * Light/dark, parked at the right end of the topbar.
 *
 * It lived in the composer for a while, which put an app-wide setting inside
 * a per-message control strip. Appearance is not something you change per
 * message, and from the topbar it is reachable from every tab rather than
 * only from Chat.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-subtle)] transition-[background-color,color,transform] duration-150 ease-out hover:bg-[var(--surface-hover)] hover:text-[var(--text)] active:scale-[0.94]"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
