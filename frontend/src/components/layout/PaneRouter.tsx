"use client";

import type { ComponentType } from "react";
import ChatPage from "@/app/chat/page";
import ProjectsPage from "@/app/projects/page";
import ModelsPage from "@/app/models/page";
import UsagePage from "@/app/usage/page";
import AnalyticsPage from "@/app/analytics/page";
import SkillsPage from "@/app/skills/page";
import ProvidersPage from "@/app/providers/page";
import ConnectPage from "@/app/connect/page";
import SettingsPage from "@/app/settings/page";

/**
 * Which page a pane renders for a sidebar href.
 *
 * The pane is not a second Next router — it is the same page component the
 * route would render, mounted inside the shell. Only the sidebar's own tabs
 * are here; a dynamic route reached by clicking inside the pane navigates the
 * main column, which is what a link is supposed to do.
 */
const PAGES: Record<string, ComponentType> = {
  "/chat": ChatPage,
  "/projects": ProjectsPage,
  "/models": ModelsPage,
  "/usage": UsagePage,
  "/analytics": AnalyticsPage,
  "/skills": SkillsPage,
  "/providers": ProvidersPage,
  "/connect": ConnectPage,
  "/settings": SettingsPage,
};

export function PaneRouter({ href }: { href: string }) {
  const Page = PAGES[href];
  if (!Page) {
    return (
      <div className="grid h-full place-items-center p-6 text-center text-[13px] text-[var(--text-subtle)]">
        Nothing to show for {href}.
      </div>
    );
  }
  return <Page />;
}

export const PANE_ROUTES = Object.keys(PAGES);
