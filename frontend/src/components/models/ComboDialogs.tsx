"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Info, Layers, Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, SearchInput } from "@/components/ui/Input";
import { ProviderLogo } from "@/components/ui/ProviderLogo";
import { Badge } from "@/components/ui/Badge";
import { cx } from "@/lib/format";
import type { CatalogModel } from "@/hooks/useModelCatalog";
import type { UiCombo } from "@/hooks/useCombos";

/** Step 1 of creating a combo: name it, then add models. */
export function CreateComboDialog({
  open,
  onClose,
  onCreate,
  isValidName,
  nameTaken,
  onAddModels,
  models,
  onRemoveModel,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, models: string[]) => void;
  isValidName: (name: string) => boolean;
  nameTaken: (name: string) => boolean;
  /** Opens the model picker against the draft, before the combo exists. */
  onAddModels: () => void;
  models: string[];
  onRemoveModel: (id: string) => void;
}) {
  const [name, setName] = useState("");

  const error =
    name && !isValidName(name)
      ? "Only letters, numbers, -, _ and . are allowed"
      : name && nameTaken(name)
        ? "A combo with that name already exists"
        : undefined;

  function submit() {
    if (!name.trim() || error) return;
    onCreate(name.trim(), models);
    setName("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Combo"
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!name.trim() || !!error} onClick={submit}>
            Create
          </Button>
        </>
      }
    >
      <Input
        label="Combo name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="my-combo"
        hint="Only letters, numbers, -, _ and . allowed"
        error={error}
        autoFocus
      />

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[13px] font-medium text-[var(--text)]">
            Models{" "}
            <span className="font-normal text-[var(--text-subtle)]">
              ({models.length}) — tried in order
            </span>
          </p>
          <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onAddModels}>
            Add models
          </Button>
        </div>

        {models.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-6 text-center">
            <Layers className="mx-auto h-5 w-5 text-[var(--text-subtle)]" />
            <p className="mt-2 text-[13px] text-[var(--text-subtle)]">No models added yet</p>
            <p className="mt-1 text-[12px] text-[var(--text-subtle)]">
              A combo with no models cannot answer — add at least one.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {models.map((id, i) => (
              <li
                key={id}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5"
              >
                <span className="w-4 shrink-0 text-[11px] tabular-nums text-[var(--text-subtle)]">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-[var(--text-muted)]">
                  {id}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveModel(id)}
                  aria-label={`Remove ${id}`}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded text-[var(--text-subtle)] transition-colors hover:text-err-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/** Reorderable model list — order is the fallback order at request time. */
export function EditComboDialog({
  combo,
  open,
  onClose,
  onSave,
  onAddModels,
}: {
  combo: UiCombo | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, patch: { name: string; models: string[] }) => void;
  onAddModels: () => void;
}) {
  const [name, setName] = useState(combo?.name || "");
  const [models, setModels] = useState<string[]>(combo?.models || []);

  // Re-seed whenever the combo changes underneath — including when the model
  // picker writes to it while this dialog is open. This ran in a `useMemo`,
  // which React may skip or re-run at its discretion, so newly added models
  // only appeared once something else forced a render.
  useEffect(() => {
    setName(combo?.name || "");
    setModels(combo?.models || []);
  }, [combo?.id, combo?.name, combo?.models]);

  if (!combo) return null;

  function move(index: number, direction: -1 | 1) {
    const next = [...models];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setModels(next);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Combo"
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onSave(combo.id, { name, models });
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <Input
        label="Combo name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        hint="Only letters, numbers, -, _ and . allowed"
      />

      <p className="mt-5 mb-2 text-[13px] font-medium text-[var(--text)]">Models</p>
      <p className="mb-3 text-[12px] text-[var(--text-subtle)]">
        Order is the fallback order — position 1 is tried first.
      </p>

      <div className="space-y-1.5">
        {models.map((model, index) => (
          <div
            key={`${model}-${index}`}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-2"
          >
            <GripVertical className="h-4 w-4 shrink-0 text-[var(--text-subtle)]" />
            <span className="w-4 shrink-0 text-center text-[12px] tabular-nums text-[var(--text-subtle)]">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-[var(--text)]">
              {model}
            </span>
            <button
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label="Move up"
              className="grid h-6 w-6 place-items-center rounded text-[var(--text-subtle)] hover:bg-[var(--surface-hover)] disabled:opacity-30"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => move(index, 1)}
              disabled={index === models.length - 1}
              aria-label="Move down"
              className="grid h-6 w-6 place-items-center rounded text-[var(--text-subtle)] hover:bg-[var(--surface-hover)] disabled:opacity-30"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setModels(models.filter((_, i) => i !== index))}
              aria-label="Remove model"
              className="grid h-6 w-6 place-items-center rounded text-[var(--text-subtle)] hover:bg-[var(--surface-hover)] hover:text-err-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={onAddModels}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)] py-2.5 text-[13px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
      >
        <Plus className="h-4 w-4" />
        Add Model
      </button>
    </Modal>
  );
}

/** Picker used from inside Edit — click to add, click again to remove. */
export function AddModelDialog({
  open,
  onClose,
  models,
  selected,
  onToggle,
  combos,
  onToggleCombo,
}: {
  open: boolean;
  onClose: () => void;
  models: CatalogModel[];
  selected: string[];
  onToggle: (id: string) => void;
  combos: UiCombo[];
  onToggleCombo: (name: string) => void;
}) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? models.filter(
          (m) => m.id.toLowerCase().includes(q) || (m.name || "").toLowerCase().includes(q)
        )
      : models;

    const map = new Map<string, CatalogModel[]>();
    for (const model of filtered) {
      const key = model.providerName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(model);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [models, query]);

  return (
    <Modal open={open} onClose={onClose} title="Add Model to Combo" width="sm">
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-[var(--brand-soft-border)] bg-[var(--brand-soft)] px-3 py-2.5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
        <p className="text-[12.5px] leading-relaxed text-[var(--text-muted)]">
          Click to add, click again to remove. Changes apply when you save the combo.
        </p>
      </div>

      <SearchInput value={query} onChange={setQuery} placeholder="Search models…" />

      <div className="mt-3 max-h-[46vh] space-y-4 overflow-y-auto pr-1">
        {combos.length > 0 && !query && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--brand)]">
              <Layers className="h-3.5 w-3.5" />
              Combos <span className="text-[var(--text-subtle)]">({combos.length})</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {combos.map((combo) => (
                <Chip
                  key={combo.id}
                  active={selected.includes(combo.name)}
                  onClick={() => onToggleCombo(combo.name)}
                >
                  {combo.name}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {grouped.map(([providerName, list]) => (
          <div key={providerName}>
            <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text)]">
              <ProviderLogo
                id={list[0].providerId}
                name={providerName}
                size="sm"
                className="!h-5 !w-5 !rounded-md"
              />
              {providerName} <span className="text-[var(--text-subtle)]">({list.length})</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {list.map((model) => (
                <Chip
                  key={model.id}
                  active={selected.includes(model.id)}
                  onClick={() => onToggle(model.id)}
                >
                  {model.name || model.id}
                  {!model.connected && (
                    <Badge tone="warn" className="!px-1 !py-0 !text-[9px]">
                      off
                    </Badge>
                  )}
                </Chip>
              ))}
            </div>
          </div>
        ))}

        {grouped.length === 0 && (
          <p className="py-8 text-center text-[13px] text-[var(--text-subtle)]">
            No models match “{query}”.
          </p>
        )}
      </div>
    </Modal>
  );
}

function Chip({
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
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] transition-all",
        active
          ? "border-[var(--brand)] bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
      )}
    >
      {children}
    </button>
  );
}
