"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  FolderOpen,
  HardDriveDownload,
  Package,
  Puzzle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/AppShell";
import { AiSearchBar } from "@/components/ui/AiSearchBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonTile, stagger } from "@/components/ui/Skeleton";
import { useLocalStorage } from "@/hooks/useApi";
import { useSkills, skillCategories } from "@/hooks/useSkills";
import { aiRank, getSkill, skillTargets, syncSkills, uninstallSkills } from "@/lib/api";
import type { SkillDefinition, SkillDetail, SkillInfluence, SkillTarget } from "@/lib/types";
import { shortModelName } from "@/lib/format";
import { cx } from "@/lib/format";

const AI_SUGGESTIONS = [
  "Help me spend less on long coding sessions",
  "Something that keeps my UI work polished",
  "Turn a rough idea into a spec",
];

const INFLUENCE: { id: SkillInfluence; label: string; bars: number; hint: string }[] = [
  { id: "low", label: "Low", bars: 1, hint: "Chat: only the description is sent. CLI: installed but only runs when you type /name." },
  { id: "medium", label: "Medium", bars: 2, hint: "Chat: full skill, applied when the request matches. CLI: auto-invoked from its description." },
  { id: "high", label: "High", bars: 3, hint: "Chat: full skill, applied to every reply. CLI: auto-invoked from its description." },
];

export default function SkillsPage() {
  const library = useSkills();
  const { skills, chatApply, loading, error, patch, setChatApply } = library;
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [category, setCategory] = useState<string | null>(null);
  const [aiMatch, setAiMatch] = useState<string[] | null>(null);
  const [aiReasons, setAiReasons] = useState<Record<string, string>>({});
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [open, setOpen] = useState<SkillDefinition | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const categories = useMemo(() => skillCategories(skills), [skills]);
  const enabledCount = skills.filter((s) => s.enabled).length;

  const filtered = useMemo(() => {
    let list = skills;
    if (aiMatch) {
      const order = new Map(aiMatch.map((id, i) => [id, i]));
      list = list.filter((s) => order.has(s.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    }
    if (kind === "skills") list = list.filter((s) => s.kind === "skill");
    if (kind === "plugins") list = list.filter((s) => s.kind === "plugin");
    if (kind === "enabled") list = list.filter((s) => s.enabled);
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
  }, [skills, query, kind, category, aiMatch]);

  async function handleAiSearch(q: string) {
    setAiBusy(true);
    setAiNote(null);
    setQuery("");
    try {
      const out = await aiRank({
        query: q,
        limit: 5,
        candidates: skills.map((s) => ({
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
      const scored = skills
        .map((skill) => {
          const haystack = `${skill.name} ${skill.summary} ${skill.detail} ${skill.tags.join(" ")}`.toLowerCase();
          return { id: skill.id, score: words.filter((w) => haystack.includes(w)).length };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      setAiMatch(scored.map((s) => s.id));
      setAiReasons({});
      setAiNote(`${err instanceof Error ? err.message : "No model available"} — showing a keyword match instead.`);
    } finally {
      setAiBusy(false);
    }
  }

  async function change(id: string, next: { enabled?: boolean; influence?: SkillInfluence }) {
    setBusyId(id);
    setActionError(null);
    try {
      await patch(id, next);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update the skill");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PageContainer
      title="Skills"
      description={
        loading && skills.length === 0
          ? "Loading the OptiAI library…"
          : `${skills.length} in the OptiAI library · ${enabledCount} enabled`
      }
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

      {(error || actionError) && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-err-500/25 bg-err-50 px-3.5 py-2.5 text-[12.5px] text-err-700 dark:bg-err-500/10 dark:text-err-500">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{actionError || error}</span>
        </div>
      )}

      <ChatApplyBanner chatApply={chatApply} enabledCount={enabledCount} onChange={(next) => void setChatApply(next)} />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Tabs
          tabs={[
            { id: "all", label: "All", count: skills.length },
            { id: "skills", label: "Skills" },
            { id: "plugins", label: "Plugins" },
            { id: "enabled", label: "Enabled", count: enabledCount },
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
        {categories.map((c) => (
          <CategoryChip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c}
          </CategoryChip>
        ))}
      </div>

      {loading && skills.length === 0 ? (
        <div className="grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonTile
              key={i}
              index={i}
              lines={2}
              badges={2}
              footer={
                <div className="flex items-center gap-2">
                  <Skeleton delay={stagger(i)} className="h-2.5 w-14" />
                  <Skeleton delay={stagger(i)} className="h-7 w-40 rounded-lg" />
                </div>
              }
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="h-5 w-5" />}
          title="Nothing matches"
          description="Try another term, or clear the category filter."
        />
      ) : (
        <div className="grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {filtered.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              busy={busyId === skill.id}
              reason={aiReasons[skill.id]}
              onToggle={(next) => void change(skill.id, { enabled: next })}
              onInfluence={(level) => void change(skill.id, { influence: level })}
              onOpen={() => setOpen(skill)}
            />
          ))}
        </div>
      )}

      <InstallPanel skills={skills} enabledCount={enabledCount} />

      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
        <p className="text-[12.5px] leading-relaxed text-[var(--text-muted)]">
          <strong className="font-semibold text-[var(--text)]">OptiAI controls this library.</strong> Every
          skill is a SKILL.md folder under <span className="font-mono text-[12px]">backend/skills</span>, either
          written by OptiAI or vendored from a reviewed repository at a pinned commit. There is no way to install
          an arbitrary Git repository; a repository becomes available only once it has been reviewed and added.
        </p>
      </div>

      <SkillModal skill={open} onClose={() => setOpen(null)} />
    </PageContainer>
  );
}

/* -- Pieces ---------------------------------------------------------------- */

function ChatApplyBanner({
  chatApply,
  enabledCount,
  onChange,
}: {
  chatApply: boolean;
  enabledCount: number;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[var(--text)]">Apply skills in OptiAI chat</p>
        <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
          The in-app chat has no disk, so enabled skills are sent with each turn as standing instructions,
          ordered by influence. Your coding CLI reads them from disk instead — see Install below. The composer
          has its own Skills switch for one-off turns.
          {chatApply && enabledCount > 0 && ` Right now ${enabledCount} would apply.`}
        </p>
      </div>
      <Toggle checked={chatApply} onChange={onChange} label="Apply skills in chat" />
    </div>
  );
}

function SkillCard({
  skill,
  busy,
  reason,
  onToggle,
  onInfluence,
  onOpen,
}: {
  skill: SkillDefinition;
  busy: boolean;
  reason?: string;
  onToggle: (next: boolean) => void;
  onInfluence: (level: SkillInfluence) => void;
  onOpen: () => void;
}) {
  const isOn = skill.enabled;
  return (
    <Card className={cx("flex flex-col", isOn && "border-[var(--brand-soft-border)]", busy && "opacity-70")}>
      <div className="flex items-start gap-2.5">
        <span
          className={cx(
            "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
            isOn ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "bg-[var(--surface-sunken)] text-[var(--text-subtle)]"
          )}
        >
          {skill.kind === "plugin" ? <Puzzle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </span>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left" title="Open the skill">
          <p className="truncate font-display text-[13.5px] font-semibold text-[var(--text)] hover:text-[var(--brand)]">
            {skill.name}
          </p>
          <p className="truncate text-[11px] text-[var(--text-subtle)]">
            {skill.author} · {skill.source.type === "vendored" ? `@${skill.version}` : `v${skill.version}`} ·{" "}
            <span className="font-mono">/{skill.id}</span>
          </p>
        </button>
        <Toggle size="sm" checked={isOn} onChange={onToggle} label={`Enable ${skill.name}`} />
      </div>

      <p className="mt-2.5 flex-1 text-[12.5px] leading-relaxed text-[var(--text-muted)]">{skill.summary}</p>
      {reason && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-[var(--brand-soft)] px-2.5 py-1.5 text-[12px] leading-snug text-[var(--text-muted)]">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[var(--brand)]" />
          {reason}
        </p>
      )}
      {skill.requires && (
        <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-snug text-[var(--text-subtle)]">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warn-500" />
          Needs {skill.requires}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge tone={skill.kind === "plugin" ? "accent" : "brand"}>{skill.kind}</Badge>
        <Badge>{skill.category}</Badge>
        {skill.tokenImpact && <Badge tone={skill.tokenImpact.startsWith("-") ? "ok" : "neutral"}>{skill.tokenImpact}</Badge>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {skill.tags.map((t) => (
          <span key={t} className="rounded-md bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[10.5px] text-[var(--text-subtle)]">
            {t}
          </span>
        ))}
      </div>

      <InfluencePicker value={skill.influence} disabled={busy} onChange={onInfluence} />
    </Card>
  );
}

function InfluencePicker({
  value,
  disabled,
  onChange,
  compact,
}: {
  value: SkillInfluence;
  disabled?: boolean;
  onChange: (level: SkillInfluence) => void;
  compact?: boolean;
}) {
  const current = INFLUENCE.find((l) => l.id === value) ?? INFLUENCE[1];
  return (
    <div className={cx("mt-3 flex items-center gap-2", compact && "mt-0")}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-subtle)]">Influence</span>
      <div className="flex overflow-hidden rounded-lg border border-[var(--border)]" role="radiogroup" aria-label="Influence">
        {INFLUENCE.map((level) => {
          const active = level.id === value;
          return (
            <button
              key={level.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              title={level.hint}
              onClick={() => onChange(level.id)}
              className={cx(
                "flex items-center gap-1.5 px-2 py-1 text-[11.5px] font-medium transition-colors",
                active ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "text-[var(--text-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              )}
            >
              <span className="flex items-end gap-px" aria-hidden>
                {[1, 2, 3].map((b) => (
                  <span
                    key={b}
                    className={cx(
                      "w-1 rounded-sm",
                      b === 1 ? "h-1.5" : b === 2 ? "h-2.5" : "h-3.5",
                      b <= level.bars ? (active ? "bg-[var(--brand)]" : "bg-[var(--text-subtle)]") : "bg-[var(--border)]"
                    )}
                  />
                ))}
              </span>
              {level.label}
            </button>
          );
        })}
      </div>
      {!compact && <span className="sr-only">{current.hint}</span>}
    </div>
  );
}

function SkillModal({ skill, onClose }: { skill: SkillDefinition | null; onClose: () => void }) {
  const [detail, setDetail] = useState<SkillDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDetail(null);
    setError(null);
    if (!skill) return;
    let alive = true;
    getSkill(skill.id)
      .then((d) => alive && setDetail(d))
      .catch((err) => alive && setError(err instanceof Error ? err.message : "Could not load the skill"));
    return () => {
      alive = false;
    };
  }, [skill]);

  if (!skill) return null;
  return (
    <Modal open onClose={onClose} title={skill.name} width="lg">
      <div className="space-y-4">
        <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">{skill.detail}</p>
        <dl className="grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
          <Row label="Invoke as">
            <span className="font-mono">/{skill.id}</span>
          </Row>
          <Row label="Size">
            {Math.round(skill.bytes / 1024)} KB · ~{skill.approxTokens.toLocaleString()} tokens when applied in chat
          </Row>
          <Row label="Author">{skill.author}</Row>
          <Row label="Source">
            {skill.source.type === "vendored" && skill.source.url ? (
              <a
                href={skill.source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[var(--brand)] hover:underline"
              >
                {skill.source.url.replace("https://github.com/", "")}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              "Written by OptiAI"
            )}
            {skill.source.commit && <span className="text-[var(--text-subtle)]"> · pinned at {skill.source.commit}</span>}
            {skill.source.license && <span className="text-[var(--text-subtle)]"> · {skill.source.license}</span>}
          </Row>
          {skill.requires && <Row label="Requires">{skill.requires}</Row>}
        </dl>
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-subtle)]">
            What the model reads (description)
          </p>
          <p className="rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
            {skill.description}
          </p>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-subtle)]">SKILL.md</p>
          {error ? (
            <p className="text-[12.5px] text-err-700 dark:text-err-500">{error}</p>
          ) : (
            <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-3 font-mono text-[11.5px] leading-relaxed text-[var(--text)]">
              {detail ? detail.content : "Loading…"}
            </pre>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-subtle)]">{label}</dt>
      <dd className="mt-0.5 text-[var(--text)]">{children}</dd>
    </div>
  );
}

/* -- Install to CLI -------------------------------------------------------- */

const STATUS_TONE: Record<string, "ok" | "warn" | "err" | "neutral"> = {
  managed: "ok",
  stale: "warn",
  foreign: "err",
  absent: "neutral",
};

function InstallPanel({ skills, enabledCount }: { skills: SkillDefinition[]; enabledCount: number }) {
  const [projectDir, setProjectDir] = useLocalStorage("optiai.skills.projectDir", "");
  const [dirInput, setDirInput] = useState("");
  const [targets, setTargets] = useState<SkillTarget[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setDirInput(projectDir), [projectDir]);

  async function refresh(dir = projectDir) {
    setLoading(true);
    setError(null);
    try {
      const out = await skillTargets(dir || undefined);
      setTargets(out.targets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read install status");
    } finally {
      setLoading(false);
    }
  }

  // Re-read whenever the enabled set changes, so "pending" counts stay honest.
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectDir, enabledCount, skills.map((s) => `${s.id}:${s.influence}`).join("|")]);

  async function act(kind: "sync" | "uninstall", t: SkillTarget) {
    const key = `${kind}:${t.tool}:${t.scope}`;
    setBusy(key);
    setNotice(null);
    setError(null);
    try {
      if (kind === "sync") {
        const out = await syncSkills({ tool: t.tool, scope: t.scope, projectDir: t.scope === "project" ? projectDir : undefined });
        const parts = [
          `${out.written.length} written`,
          out.removed.length ? `${out.removed.length} removed` : null,
          out.skipped.length ? `${out.skipped.length} skipped (not created by OptiAI)` : null,
        ].filter(Boolean);
        setNotice(`${t.name} (${t.scope}): ${parts.join(", ")} in ${out.root}.${out.note ? ` ${out.note}` : ""}`);
      } else {
        const out = await uninstallSkills({ tool: t.tool, scope: t.scope, projectDir: t.scope === "project" ? projectDir : undefined });
        setNotice(`${t.name} (${t.scope}): removed ${out.removed.length} OptiAI-managed folder${out.removed.length === 1 ? "" : "s"} from ${out.root}.`);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The operation failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-[var(--text)]">Install to your CLI</h2>
          <p className="mt-0.5 max-w-2xl text-[12.5px] leading-relaxed text-[var(--text-muted)]">
            Writes every enabled skill as a SKILL.md folder where your coding tool reads skills, so it
            auto-invokes them from their description — no slash command needed. Each folder carries an
            OptiAI marker; folders you made yourself are never touched. Sync again after changing what is
            enabled or an influence level.
          </p>
        </div>
        <Button size="sm" variant="secondary" icon={<RefreshCw className={cx("h-3.5 w-3.5", loading && "animate-spin")} />} onClick={() => void refresh()}>
          Refresh status
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <FolderOpen className="h-4 w-4 shrink-0 text-[var(--text-subtle)]" />
        <span className="text-[12.5px] text-[var(--text-muted)]">Project folder for project-scope installs</span>
        <div className="flex min-w-[260px] flex-1 items-center gap-2">
          <Input
            value={dirInput}
            onChange={(e) => setDirInput(e.target.value)}
            placeholder="D:\\path\\to\\your\\repo"
            className="font-mono text-[12px]"
          />
          <Button size="sm" variant="secondary" onClick={() => setProjectDir(dirInput.trim())} disabled={dirInput.trim() === projectDir}>
            Use
          </Button>
        </div>
      </div>

      {error && (
        <p className="mb-3 flex items-start gap-2 rounded-lg border border-err-500/25 bg-err-50 px-3.5 py-2.5 text-[12.5px] text-err-700 dark:bg-err-500/10 dark:text-err-500">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {notice && (
        <p className="mb-3 flex items-start gap-2 rounded-lg border border-[var(--brand-soft-border)] bg-[var(--brand-soft)] px-3.5 py-2.5 text-[12.5px] text-[var(--text-muted)]">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
          {notice}
        </p>
      )}

      {!targets ? (
        loading ? (
          <div className="grid gap-3 @3xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonTile key={i} index={i} lines={1} badges={4} footer={<Skeleton delay={stagger(i)} className="h-8 w-24 rounded-lg" />} />
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-[var(--text-subtle)]">No status yet.</p>
        )
      ) : (
        <div className="grid gap-3 @3xl:grid-cols-2">
          {targets.map((t) => {
            const key = `${t.tool}:${t.scope}`;
            const upToDate = t.pending === 0 && t.stale === 0;
            return (
              <Card key={key} className="flex flex-col gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--surface-sunken)] text-[var(--text-subtle)]">
                    <HardDriveDownload className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[13.5px] font-semibold text-[var(--text)]">
                      {t.name} <span className="font-normal text-[var(--text-subtle)]">· {t.scope === "user" ? "this machine" : "this project"}</span>
                    </p>
                    <p className="truncate font-mono text-[11px] text-[var(--text-subtle)]" title={t.root}>
                      {t.root}
                    </p>
                  </div>
                  <Badge tone={upToDate && t.managed > 0 ? "ok" : t.pending || t.stale ? "warn" : "neutral"}>
                    {t.managed > 0 && upToDate
                      ? `${t.managed} installed`
                      : t.pending || t.stale
                        ? `${t.pending + t.stale} to sync`
                        : "not installed"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1">
                  {t.skills
                    .filter((s) => s.enabled || s.status !== "absent")
                    .map((s) => (
                      <span
                        key={s.id}
                        title={`${s.id}: ${s.status}${s.enabled ? "" : " (disabled — will be removed on sync)"}`}
                        className={cx(
                          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10.5px]",
                          s.status === "managed" && s.enabled && "bg-ok-50 text-ok-700 dark:bg-ok-500/10 dark:text-ok-500",
                          s.status === "stale" && "bg-warn-50 text-warn-700 dark:bg-warn-500/10 dark:text-warn-500",
                          s.status === "foreign" && "bg-err-50 text-err-700 dark:bg-err-500/10 dark:text-err-500",
                          s.status === "absent" && "bg-[var(--surface-sunken)] text-[var(--text-subtle)]",
                          s.status === "managed" && !s.enabled && "bg-[var(--surface-sunken)] text-[var(--text-subtle)] line-through"
                        )}
                      >
                        {s.id}
                      </span>
                    ))}
                  {t.skills.every((s) => !s.enabled && s.status === "absent") && (
                    <span className="text-[12px] text-[var(--text-subtle)]">Enable a skill above to install it here.</span>
                  )}
                </div>

                {t.foreign > 0 && (
                  <p className="text-[11.5px] leading-snug text-[var(--text-subtle)]">
                    {t.foreign} folder{t.foreign === 1 ? "" : "s"} with a matching name already exist and were not created by
                    OptiAI. They are left untouched and skipped on sync.
                  </p>
                )}
                {t.note && <p className="text-[11.5px] leading-snug text-[var(--text-subtle)]">{t.note}</p>}

                <div className="mt-auto flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    loading={busy === `sync:${key}`}
                    disabled={busy !== null || (enabledCount === 0 && t.managed === 0 && t.stale === 0)}
                    onClick={() => void act("sync", t)}
                  >
                    {t.managed > 0 || t.stale > 0 ? "Sync" : "Install"}
                  </Button>
                  {t.managed + t.stale > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      loading={busy === `uninstall:${key}`}
                      disabled={busy !== null}
                      onClick={() => void act("uninstall", t)}
                    >
                      Remove OptiAI skills
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--text-subtle)]">
        Legend: green installed and current · amber needs a sync · red exists but not managed by OptiAI · grey not
        installed. Status meanings: {Object.keys(STATUS_TONE).join(", ")}.
      </p>
    </section>
  );
}

function CategoryChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
