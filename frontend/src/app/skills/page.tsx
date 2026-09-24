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
import { aiRank } from "@/lib/api";
import { shortModelName } from "@/lib/format";
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
  const [aiReasons, setAiReasons] = useState<Record<string, string>>({});
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const filtered = useMemo(() => {
    let list = SKILL_LIBRARY;

    if (aiMatch) {
      const order = new Map(aiMatch.map((id, i) => [id, i]));
      list = list.filter((s) => order.has(s.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    }
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
   * OptiAI search: every skill's name and one-line summary go to the fastest
   * tested model, which returns the five that fit the sentence, with reasons.
   * Falls back to a plain keyword match — labelled as such — when no model
   * is available, so the bar never dead-ends.
   */
  async function handleAiSearch(q: string) {
    setAiBusy(true);
    setAiNote(null);
    setQuery("");
    try {
      const out = await aiRank({
        query: q,
        limit: 5,
        candidates: SKILL_LIBRARY.map((s) => ({
          id: s.id,
          name: `${s.name} [${s.kind}, ${s.category}]`,
          description: s.summary,
        })),
      });
      setAiMatch(out.results.map((r) => r.id));
      setAiReasons(Object.fromEntries(out.results.map((r) => [r.id, r.reason])));
      setAiNote(
        out.results.length > 0
          ? `Top ${out.results.length} for “${q}”, chosen by ${shortModelName(out.model)}.`
          : `${shortModelName(out.model)} found nothing in the library for “${q}”.`
      );
    } catch (err) {
      const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const scored = SKILL_LIBRARY.map((skill) => {
        const haystack = `${skill.name} ${skill.summary} ${skill.detail} ${skill.tags.join(" ")}`.toLowerCase();
        return { id: skill.id, score: words.filter((w) => haystack.includes(w)).length };
      })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      setAiMatch(scored.map((s) => s.id));
      setAiReasons({});
      setAiNote(
        `${err instanceof Error ? err.message : "No model available"} — showing a keyword match instead.`
      );
    } finally {
      setAiBusy(false);
    }
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
          onAiSubmit={(q) => void handleAiSearch(q)}
          onQueryChange={setQuery}
          suggestions={AI_SUGGESTIONS}
          busy={aiBusy}
        />
        {(aiMatch || aiBusy) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--brand-soft-border)] bg-[var(--brand-soft)] px-3.5 py-2.5">
            <Sparkles className={cx("h-3.5 w-3.5 shrink-0 text-[var(--brand)]", aiBusy && "think-pulse")} />
            <p className="flex-1 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
              {aiBusy ? "OptiAI is reading the library…" : aiNote}
            </p>
            {aiMatch && (
              <button
                onClick={() => {
                  setAiMatch(null);
                  setAiReasons({});
                  setAiNote(null);
                }}
                className="text-[12px] font-semibold text-[var(--brand)] hover:underline"
              >
                Clear
              </button>
            )}
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
        <div className="grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
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
                {aiReasons[skill.id] && (
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-[var(--brand-soft)] px-2.5 py-1.5 text-[12px] leading-snug text-[var(--text-muted)]">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[var(--brand)]" />
                    {aiReasons[skill.id]}
                  </p>
                )}

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
