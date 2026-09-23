"use client";

import { cx } from "@/lib/format";

export interface TabDef {
  id: string;
  label: string;
  count?: number;
}

/** Segmented control. Used for Usage Overview/Details and period pickers. */
export function Tabs({
  tabs,
  active,
  onChange,
  size = "md",
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="tablist"
      className="inline-flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-0.5"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cx(
              "rounded-[7px] font-medium transition-all duration-150",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-[13px]",
              isActive
                ? "bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-sm)]"
                : "text-[var(--text-subtle)] hover:text-[var(--text)]"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-[var(--text-subtle)] tabular-nums">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
