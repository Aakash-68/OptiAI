"use client";

import { useMemo, useState } from "react";
import { Blocks, Layers, LayoutGrid, Pencil, Plus, Trash2 } from "lucide-react";
import { AiSearchBar } from "@/components/ui/AiSearchBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, StatusDot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ProviderLogo } from "@/components/ui/ProviderLogo";
import { LogoMark } from "@/components/ui/Logo";
import { aiRank } from "@/lib/api";
import { shortModelName } from "@/lib/format";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState, ErrorNote } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import {
  AddModelDialog,
  CreateComboDialog,
  EditComboDialog,
} from "@/components/models/ComboDialogs";
import { useModelCatalog } from "@/hooks/useModelCatalog";
import { useCombos, type UiCombo } from "@/hooks/useCombos";
import { ModelTable } from "@/components/models/ModelTable";
import { factsFor, MODEL_TAGS } from "@/lib/catalog/modelFacts";
import { cx } from "@/lib/format";

const AI_SUGGESTIONS = [
  "A cheap model for coding a React app",
  "Best reasoning model I can actually reach",
  "Something fast for bulk summarization",
];

export default function ModelsPage() {
  const { providers, models, loading, error, loadProvider } = useModelCatalog();
  const combos = useCombos();

  const [tab, setTab] = useState("discover");
  const [query, setQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [capability, setCapability] = useState("all");
  const [connectedOnly, setConnectedOnly] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiPicks, setAiPicks] = useState<{ id: string; reason: string }[] | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // Derived, never captured: the dialog always renders the stored combo,
  // so models added from the picker show up immediately.
  const editing = combos.combos.find((c) => c.id === editingId) ?? null;
  const [draftModels, setDraftModels] = useState<string[]>([]);
  // Models chosen while the combo is still a draft, before it exists.
  const [createModels, setCreateModels] = useState<string[]>([]);
  // Which dialog opened the picker, so closing it writes to the right place.
  const [addTarget, setAddTarget] = useState<"create" | "edit">("edit");

  const filtered = useMemo(() => {
    let list = models;

    // An AI answer narrows the table to its picks, in the order it gave them.
    if (aiPicks) {
      const order = new Map(aiPicks.map((p, i) => [p.id, i]));
      list = list.filter((m) => order.has(m.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          (m.name || "").toLowerCase().includes(q) ||
          m.providerName.toLowerCase().includes(q)
      );
    }
    if (providerFilter !== "all") list = list.filter((m) => m.providerId === providerFilter);
    if (capability !== "all")
      list = list.filter((m) => factsFor(m.id, m.name).tags.includes(capability));
    if (connectedOnly) list = list.filter((m) => m.connected);

    return list.slice(0, 300);
  }, [models, query, providerFilter, capability, connectedOnly, aiPicks]);

  /**
   * OptiAI search: the catalog — every model's id, name, provider, tags and
   * price band — goes to the fastest tested model, which returns its top five
   * with a reason each. The table narrows to those, in that order.
   */
  async function handleAiSearch(q: string) {
    setAiBusy(true);
    setAiAnswer(null);
    setAiPicks(null);
    try {
      const candidates = models.map((m) => {
        const facts = factsFor(m.id, m.name);
        const price =
          m.inputPrice != null && m.outputPrice != null
            ? `$${m.inputPrice}/$${m.outputPrice} per 1M`
            : "price unknown";
        return {
          id: m.id,
          name: `${m.name || m.id} (${m.providerName}${m.connected ? ", connected" : ""})`,
          description: `${facts.tags.join(", ")}; ${price}`,
        };
      });
      const out = await aiRank({
        query: q,
        candidates,
        limit: 5,
        context: "Prefer models marked connected when they fit, since only those can be used right away.",
      });
      if (out.results.length === 0) {
        setAiAnswer(`${shortModelName(out.model)} could not pick anything for “${q}”. Try describing the task and the budget.`);
      } else {
        setAiPicks(out.results);
        setAiAnswer(`Top ${out.results.length} for “${q}”, chosen by ${shortModelName(out.model)}.`);
      }
    } catch (err) {
      setAiAnswer(err instanceof Error ? err.message : "OptiAI search failed");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)]">
            <LayoutGrid className="h-5 w-5 text-[var(--brand)]" />
          </span>
          <div>
            <h1 className="font-display text-[26px] font-bold tracking-tight text-[var(--text)]">
              Models
            </h1>
            <p className="mt-0.5 text-[13.5px] text-[var(--text-subtle)]">
              Discover and choose from the best AI models for your use case and budget.
            </p>
          </div>
        </div>

        {tab === "combos" && (
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Create Combo
          </Button>
        )}
      </div>

      <div className="mb-5">
        <AiSearchBar
          aiPlaceholder="Describe what you need — “a cheap model for coding a React app”"
          searchPlaceholder="Search models by name, use case or tags…"
          onAiSubmit={(q) => void handleAiSearch(q)}
          onQueryChange={(q) => {
            setQuery(q);
            if (aiPicks) {
              setAiPicks(null);
              setAiAnswer(null);
            }
          }}
          suggestions={AI_SUGGESTIONS}
          busy={aiBusy}
        />
        {(aiAnswer || aiBusy) && (
          <div className="mt-3 rounded-xl border border-[var(--brand-soft-border)] bg-[var(--brand-soft)] px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <LogoMark size={12} className={aiBusy ? "think-pulse" : undefined} />
              <p className="flex-1 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                {aiBusy ? "OptiAI is reading the catalog…" : aiAnswer}
              </p>
              {aiPicks && (
                <button
                  onClick={() => {
                    setAiPicks(null);
                    setAiAnswer(null);
                  }}
                  className="text-[12px] font-semibold text-[var(--brand)] hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            {aiPicks && (
              <ol className="mt-2.5 space-y-1.5">
                {aiPicks.map((p, i) => {
                  const m = models.find((x) => x.id === p.id);
                  return (
                    <li key={p.id} className="flex items-start gap-2.5 rounded-lg bg-[var(--surface)] px-2.5 py-2">
                      <span className="w-4 shrink-0 text-center text-[11px] font-semibold tabular-nums text-[var(--brand)]">
                        {i + 1}
                      </span>
                      {m && <ProviderLogo id={m.providerId} name={m.providerName} size="sm" className="!h-5 !w-5 !rounded-md" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-[var(--text)]">
                          {m?.name || p.id}
                          {m && !m.connected && (
                            <span className="ml-1.5 text-[10.5px] font-normal text-[var(--text-subtle)]">not connected</span>
                          )}
                        </span>
                        <span className="block text-[12px] leading-snug text-[var(--text-muted)]">{p.reason}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </div>

      <div className="mb-4">
        <Tabs
          tabs={[
            { id: "discover", label: "Discover", count: models.length },
            { id: "combos", label: "Combos", count: combos.combos.length },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {error && <ErrorNote message={error} className="mb-4" />}

      {tab === "discover" ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <Select
              value={providerFilter}
              onChange={(v) => {
                setProviderFilter(v);
                if (v !== "all") void loadProvider(v);
              }}
              className="w-auto min-w-[190px]"
              aria-label="Provider"
              options={[
                { value: "all", label: "All providers" },
                ...providers.map((p) => ({
                  value: p.id,
                  label: p.name,
                  hint: String(p.modelCount),
                  icon: <ProviderLogo id={p.id} name={p.name} size="sm" className="!h-5 !w-5 !rounded-md" />,
                })),
              ]}
            />
            <Select
              value={capability}
              onChange={setCapability}
              className="w-auto min-w-[170px]"
              aria-label="Capability"
              options={[{ value: "all", label: "Any capability" }, ...MODEL_TAGS.map((c) => ({ value: c, label: c }))]}
            />
            <button
              onClick={() => setConnectedOnly((v) => !v)}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors",
                connectedOnly
                  ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
              )}
            >
              <StatusDot tone={connectedOnly ? "ok" : "neutral"} />
              Connected only
            </button>

            <span className="ml-auto text-[12.5px] text-[var(--text-subtle)]">
              {filtered.length === models.length
                ? `${models.length} models`
                : `${filtered.length} of ${models.length} models`}
            </span>
          </div>

          {loading ? (
            <SkeletonRows count={8} leading="circle" trailing={3} height="h-[58px]" className="space-y-px" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Blocks className="h-5 w-5" />}
              title="No models match those filters"
              description="Try a different provider, or clear the capability filter."
            />
          ) : (
            <ModelTable models={filtered} />
          )}

          {filtered.length === 300 && (
            <p className="mt-4 text-center text-[12px] text-[var(--text-subtle)]">
              Showing the first 300 matches — narrow the filters to see the rest.
            </p>
          )}
        </>
      ) : (
        <>
          <Card className="mb-4">
            <CardHeader
              title="What a combo does"
              description="A combo is an ordered list of models. OptiAI tries them in order and falls through on rate limits, errors or quota exhaustion — so one name keeps working when a provider does not."
            />
          </Card>

          {combos.combos.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-5 w-5" />}
              title="No combos yet"
              description="Create one to give a fallback chain a single name you can select in chat."
              action={
                <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                  Create Combo
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {combos.combos.map((combo) => (
                <Card key={combo.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Layers className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                      <p className="truncate font-display text-[14px] font-semibold text-[var(--text)]">
                        {combo.name}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Edit combo"
                        icon={<Pencil className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setEditingId(combo.id);
                          setDraftModels(combo.models);
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete combo"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={() => void combos.deleteCombo(combo.id)}
                      />
                    </div>
                  </div>

                  <ol className="mt-3 space-y-1">
                    {combo.models.length === 0 ? (
                      <li className="text-[12.5px] text-[var(--text-subtle)]">No models yet</li>
                    ) : (
                      combo.models.map((model, i) => (
                        <li
                          key={`${model}-${i}`}
                          className="flex items-center gap-2 rounded-md bg-[var(--surface-sunken)] px-2 py-1.5"
                        >
                          <span className="w-4 text-center text-[11px] tabular-nums text-[var(--text-subtle)]">
                            {i + 1}
                          </span>
                          <span className="truncate font-mono text-[11.5px] text-[var(--text-muted)]">
                            {model}
                          </span>
                        </li>
                      ))
                    )}
                  </ol>
                </Card>
              ))}
            </div>
          )}

          <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-subtle)]">
            Combos marked <strong>local only</strong> are stored in this browser. The backend
            exposes full CRUD on <code className="font-mono">/api/models/combos</code>, so a
            combo is stored server-side and any CLI pointed at OptiAI can use its name as a
            model.
          </p>
        </>
      )}

      <CreateComboDialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateModels([]);
        }}
        onCreate={(name, chosen) => void combos.createCombo(name, chosen)}
        isValidName={combos.isValidName}
        nameTaken={(n) => combos.nameTaken(n)}
        models={createModels}
        onRemoveModel={(id) => setCreateModels((prev) => prev.filter((m) => m !== id))}
        onAddModels={() => {
          setAddTarget("create");
          setDraftModels(createModels);
          setAddOpen(true);
        }}
      />

      <EditComboDialog
        combo={editing}
        open={!!editing}
        onClose={() => setEditingId(null)}
        onSave={(id, patch) => void combos.updateCombo(id, patch)}
        onAddModels={() => {
          setAddTarget("edit");
          setDraftModels(editing?.models || []);
          setAddOpen(true);
        }}
      />

      <AddModelDialog
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          if (addTarget === "create") setCreateModels(draftModels);
          else if (editing) void combos.updateCombo(editing.id, { models: draftModels });
        }}
        models={models}
        combos={combos.combos.filter((c) => c.id !== editing?.id)}
        selected={draftModels}
        onToggle={(id) =>
          setDraftModels((prev) =>
            prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
          )
        }
        onToggleCombo={(name) =>
          setDraftModels((prev) =>
            prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
          )
        }
      />
    </div>
  );
}
