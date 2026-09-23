"use client";

import { useMemo, useState } from "react";
import { Package, Puzzle, ShieldCheck, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/layout/AppShell";
import { AiSearchBar } from "@/components/ui/AiSearchBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLocalStorage } from "@/hooks/useApi";
import { SKILL_CATEGORIES, SKILL_LIBRARY } from "@/lib/catalog/skills";
import { cx } from "@/lib/format";

const AI_SUGGESTIONS = [
  "Something that can analyze my GitHub repository",
  "Help me spend less on long prompts",
  "Turn meeting notes into action items",
];

export default function SkillsPage() {
  const [enabled, setEnabled] = useLocalStorage<string[]>(
    "optiai.enabledSkills",
    SKILL_LIBRARY.filter((s) => s.defaultEnabled).map((s) => s.id)
  );
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [category, setCategory] = useState<string | null>(null);
  const [aiMatch, setAiMatch] = useState<string[] | null>(null);

  const filtered = useMemo(() => {
    let list = SKILL_LIBRARY;

    if (aiMatch) list = list.filter((s) => aiMatch.includes(s.id));
    if (kind === "skills") list = list.filter((s) => s.kind === "skill");
    if (kind === "plugins") list = list.filter((s) => s.kind === "plugin");
    if (kind === "enabled") list = list.filter((s) => enabled.includes(s.id));
    if (category) list = list.filter((s) => s.category === category);

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.summary.toLowerCase().includes(q) ||
          s.tags.some((t) => t.includes(q))
      );
    }
    return list;
  }, [query, kind, category, enabled, aiMatch]);

  /**
   * Keyword match over the library stands in for the routing model. It is
   * labelled as such rather than presented as an AI answer.
   */
  function handleAiSearch(q: string) {
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const scored = SKILL_LIBRARY.map((skill) => {
      const haystack = `${skill.name} ${skill.summary} ${skill.detail} ${skill.tags.join(" ")}`.toLowerCase();
      return { id: skill.id, score: words.filter((w) => haystack.includes(w)).length };
    })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    setAiMatch(scored.length > 0 ? scored.map((s) => s.id) : []);
    setQuery("");
  }

  function toggle(id: string, next: boolean) {
    setEnabled((prev) => (next ? [...prev, id] : prev.filter((s) => s !== id)));
  }

  return (
    <PageContainer
      title="Skills"
      description={`${SKILL_LIBRARY.length} in the OptiAI library · ${enabled.length} enabled`}
      width="wide"
    >
      <div className="mb-5">
        <AiSearchBar
          aiPlaceholder="Say OptiAI what you want…"
          searchPlaceholder="Search skills and plugins by name, tag or category…"
          onAiSubmit={handleAiSearch}
          onQueryChange={setQuery}
          suggestions={AI_SUGGESTIONS}
        />
        {aiMatch && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--brand-soft-border)] bg-[var(--brand-soft)] px-3.5 py-2.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
            <p className="flex-1 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
              {aiMatch.length > 0
                ? `Matched ${aiMatch.length} skill${aiMatch.length === 1 ? "" : "s"} in the library. This is a keyword match — semantic search runs once a provider is connected.`
                : "Nothing in the library matches that yet."}
            </p>
            <button
              onClick={() => setAiMatch(null)}
              className="text-[12px] font-semibold text-[var(--brand)] hover:underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Tabs
          tabs={[
            { id: "all", label: "All", count: SKILL_LIBRARY.length },
            { id: "skills", label: "Skills" },
            { id: "plugins", label: "Plugins" },
            { id: "enabled", label: "Enabled", count: enabled.length },
          ]}
          active={kind}
          onChange={setKind}
          size="sm"
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <CategoryChip active={category === null} onClick={() => setCategory(null)}>
          All categories
        </CategoryChip>
        {SKILL_CATEGORIES.map((c) => (
          <CategoryChip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c}
          </CategoryChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="h-5 w-5" />}
          title="Nothing matches"
          description="Try another term, or clear the category filter."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((skill) => {
            const isOn = enabled.includes(skill.id);
            return (
              <Card key={skill.id} className={cx("flex flex-col", isOn && "border-[var(--brand-soft-border)]")}>
                <div className="flex items-start gap-2.5">
                  <span
                    className={cx(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                      isOn
                        ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                        : "bg-[var(--surface-sunken)] text-[var(--text-subtle)]"
                    )}
                  >
                    {skill.kind === "plugin" ? (
                      <Puzzle className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[13.5px] font-semibold text-[var(--text)]">
                      {skill.name}
                    </p>
                    <p className="text-[11px] text-[var(--text-subtle)]">
                      {skill.author} · v{skill.version}
                    </p>
                  </div>
                  <Toggle
                    size="sm"
                    checked={isOn}
                    onChange={(next) => toggle(skill.id, next)}
                    label={`Enable ${skill.name}`}
                  />
                </div>

                <p className="mt-2.5 flex-1 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                  {skill.summary}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge tone={skill.kind === "plugin" ? "accent" : "brand"}>{skill.kind}</Badge>
                  <Badge>{skill.category}</Badge>
                  {skill.tokenImpact && <Badge tone="ok">{skill.tokenImpact}</Badge>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
        <p className="text-[12.5px] leading-relaxed text-[var(--text-muted)]">
          <strong className="font-semibold text-[var(--text)]">
            OptiAI controls this library.
          </strong>{" "}
          Skills and plugins can only be enabled from the curated list above — there is no way to
          install an arbitrary Git repository. A repository becomes installable only once OptiAI has
          reviewed it and added it here.
        </p>
      </div>
    </PageContainer>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
        active
          ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
      )}
    >
      {children}
    </button>
  );
}
