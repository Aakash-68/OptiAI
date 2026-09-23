"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { ProviderLogo } from "@/components/ui/ProviderLogo";
import { SKILL_LIBRARY } from "@/lib/catalog/skills";
import { useModelCatalog } from "@/hooks/useModelCatalog";
import { cx } from "@/lib/format";

/**
 * Picks what a project is allowed to use: models, skills, plugins.
 *
 * All three are multi-select and all three default to empty, which means "no
 * restriction". That default matters — a project created without opening this
 * panel must not silently end up with nothing available.
 *
 * Models list only connected ones. Offering a model the project could never
 * reach would make the restriction look broken the first time someone used it.
 */
export function ProjectScopePicker({
  models,
  skills,
  plugins,
  onChange,
}: {
  models: string[];
  skills: string[];
  plugins: string[];
  onChange: (patch: { models?: string[]; skills?: string[]; plugins?: string[] }) => void;
}) {
  const [tab, setTab] = useState("models");
  const [query, setQuery] = useState("");
  const catalog = useModelCatalog();

  const connected = useMemo(
    () => catalog.models.filter((m) => m.connected),
    [catalog.models]
  );

  const q = query.trim().toLowerCase();
  const modelRows = q
    ? connected.filter(
        (m) =>
          m.id.toLowerCase().includes(q) || (m.name || "").toLowerCase().includes(q)
      )
    : connected;

  const skillRows = SKILL_LIBRARY.filter(
    (s) => s.kind === "skill" && (!q || s.name.toLowerCase().includes(q))
  );
  const pluginRows = SKILL_LIBRARY.filter(
    (s) => s.kind === "plugin" && (!q || s.name.toLowerCase().includes(q))
  );

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  const counts = { models: models.length, skills: skills.length, plugins: plugins.length };

  return (
    <div>
      <Tabs
        size="sm"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "models", label: `Models${counts.models ? ` (${counts.models})` : ""}` },
          { id: "skills", label: `Skills${counts.skills ? ` (${counts.skills})` : ""}` },
          { id: "plugins", label: `Plugins${counts.plugins ? ` (${counts.plugins})` : ""}` },
        ]}
      />

      <div className="relative mt-2.5">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-subtle)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${tab}…`}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-8 pr-2.5 text-[12.5px] text-[var(--text)] placeholder:text-[var(--text-subtle)] hover:border-[var(--border-strong)] focus:border-[var(--border-strong)] focus:outline-none"
        />
      </div>

      <div className="mt-2 max-h-[220px] space-y-0.5 overflow-y-auto rounded-lg border border-[var(--border)] p-1">
        {tab === "models" &&
          (catalog.loading ? (
            <Row label="Loading connected models…" muted />
          ) : modelRows.length === 0 ? (
            <Row
              label={
                connected.length === 0
                  ? "No connected models. Connect a provider first."
                  : "Nothing matches that."
              }
              muted
            />
          ) : (
            modelRows.slice(0, 120).map((m) => (
              <PickRow
                key={`${m.providerId}-${m.id}`}
                selected={models.includes(m.id)}
                onClick={() => onChange({ models: toggle(models, m.id) })}
                leading={<ProviderLogo id={m.providerId} name={m.providerName} size="sm" />}
                label={m.name || m.id}
                hint={m.providerName}
              />
            ))
          ))}

        {tab === "skills" &&
          skillRows.map((s) => (
            <PickRow
              key={s.id}
              selected={skills.includes(s.id)}
              onClick={() => onChange({ skills: toggle(skills, s.id) })}
              label={s.name}
              hint={s.category}
            />
          ))}

        {tab === "plugins" &&
          (pluginRows.length === 0 ? (
            <Row label="No plugins in the library yet." muted />
          ) : (
            pluginRows.map((s) => (
              <PickRow
                key={s.id}
                selected={plugins.includes(s.id)}
                onClick={() => onChange({ plugins: toggle(plugins, s.id) })}
                label={s.name}
                hint={s.category}
              />
            ))
          ))}
      </div>

      <p className="mt-1.5 text-[11.5px] leading-snug text-[var(--text-subtle)]">
        {tab === "models"
          ? "Leave empty to allow any connected model. Otherwise chats in this project can only pick from these."
          : "Only what you tick here is active inside this project."}
      </p>
    </div>
  );
}

function Row({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <p
      className={cx(
        "px-2 py-2 text-[12.5px]",
        muted ? "text-[var(--text-subtle)]" : "text-[var(--text)]"
      )}
    >
      {label}
    </p>
  );
}

function PickRow({
  selected,
  onClick,
  label,
  hint,
  leading,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
  leading?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors active:scale-[0.99]",
        selected ? "bg-[var(--brand-soft)]" : "hover:bg-[var(--surface-hover)]"
      )}
    >
      <span
        aria-hidden
        className={cx(
          "grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors",
          selected
            ? "border-[var(--brand)] bg-[var(--brand)] text-white"
            : "border-[var(--border-strong)]"
        )}
      >
        {selected && <Check className="h-3 w-3" />}
      </span>
      {leading}
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--text)]">{label}</span>
      {hint && <span className="shrink-0 text-[11px] text-[var(--text-subtle)]">{hint}</span>}
    </button>
  );
}
