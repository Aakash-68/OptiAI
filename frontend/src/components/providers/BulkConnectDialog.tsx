"use client";

import { useRef, useState } from "react";
import { Check, FileUp, Plus, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Input";
import { createConnection } from "@/lib/api";
import { cx } from "@/lib/format";
import type { Provider } from "@/lib/types";

interface Row {
  name: string;
  apiKey: string;
  state?: "pending" | "ok" | "error";
  error?: string;
}

/**
 * Add several API keys to one provider at once.
 *
 * Two ways in: paste or upload CSV (`name,key` per line — a line with only a
 * key is fine and gets a numbered name), or type rows by hand, name and key
 * side by side. Keys are created one after another so a bad one is reported
 * on its own row rather than failing the batch.
 */
export function BulkConnectDialog({
  provider,
  open,
  onClose,
  onConnected,
}: {
  provider: Provider;
  open: boolean;
  onClose: () => void;
  onConnected: () => void | Promise<void>;
}) {
  const [mode, setMode] = useState("csv");
  const [csv, setCsv] = useState("");
  const [rows, setRows] = useState<Row[]>([{ name: "", apiKey: "" }]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<Row[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function parseCsv(text: string): Row[] {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !/^(name|label)\s*,\s*(api[_ ]?key|key)/i.test(line))
      .map((line) => {
        const parts = line.split(/[,;\t]/).map((p) => p.trim().replace(/^"|"$/g, ""));
        if (parts.length === 1) return { name: "", apiKey: parts[0] };
        // Either order: a key is the longer, secret-looking token.
        const [a, b] = parts;
        return a.length > b.length && /[A-Za-z0-9_-]{16,}/.test(a)
          ? { name: b, apiKey: a }
          : { name: a, apiKey: b };
      })
      .filter((r) => r.apiKey);
  }

  const pending = (mode === "csv" ? parseCsv(csv) : rows).filter((r) => r.apiKey.trim());

  async function run() {
    if (pending.length === 0) return;
    setRunning(true);
    const results: Row[] = pending.map((r) => ({ ...r, state: "pending" }));
    setDone([...results]);
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      try {
        await createConnection({
          provider: provider.id,
          apiKey: r.apiKey.trim(),
          name: r.name.trim() || `${provider.name} key ${i + 1}`,
        });
        results[i] = { ...r, state: "ok" };
      } catch (err) {
        results[i] = { ...r, state: "error", error: err instanceof Error ? err.message : "failed" };
      }
      setDone([...results]);
    }
    setRunning(false);
    await onConnected();
  }

  function reset() {
    setDone(null);
    setCsv("");
    setRows([{ name: "", apiKey: "" }]);
  }

  const okCount = done?.filter((r) => r.state === "ok").length ?? 0;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (running) return;
        reset();
        onClose();
      }}
      title={`Bulk add keys — ${provider.name}`}
      footer={
        done ? (
          <>
            <Button variant="ghost" onClick={reset} disabled={running}>
              Add more
            </Button>
            <Button
              variant="primary"
              disabled={running}
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Done
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" disabled={pending.length === 0} onClick={() => void run()}>
              Add {pending.length || ""} {pending.length === 1 ? "key" : "keys"}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div>
          <p className="mb-3 text-[13px] text-[var(--text-muted)]">
            {running ? `Adding ${done.length} keys…` : `${okCount} of ${done.length} added.`}
          </p>
          <ul className="space-y-1.5">
            {done.map((r, i) => (
              <li
                key={i}
                className={cx(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[12.5px]",
                  r.state === "ok"
                    ? "border-ok-500/30 bg-ok-50/50 dark:bg-ok-500/8"
                    : r.state === "error"
                      ? "border-err-500/30 bg-err-50/50 dark:bg-err-500/8"
                      : "border-[var(--border)] bg-[var(--surface-sunken)]"
                )}
              >
                <span className="grid h-4 w-4 shrink-0 place-items-center">
                  {r.state === "ok" ? (
                    <Check className="h-3.5 w-3.5 text-ok-600" />
                  ) : r.state === "error" ? (
                    <X className="h-3.5 w-3.5 text-err-600" />
                  ) : (
                    <span className="think-pulse h-2 w-2 rounded-full bg-[var(--brand)]" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-[var(--text)]">
                  {r.name || `${provider.name} key ${i + 1}`}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-[var(--text-subtle)]">
                  {mask(r.apiKey)}
                </span>
                {r.error && <span className="shrink-0 text-[11px] text-err-600">{r.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          <Tabs
            size="sm"
            active={mode}
            onChange={setMode}
            tabs={[
              { id: "csv", label: "Paste / CSV" },
              { id: "manual", label: "Type them in" },
            ]}
          />

          {mode === "csv" ? (
            <div className="mt-3">
              <Textarea
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                rows={7}
                placeholder={`name,api_key\nTeam A,${provider.keyFormat || "sk-…"}\nTeam B,${provider.keyFormat || "sk-…"}`}
                className="font-mono text-[12px]"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11.5px] text-[var(--text-subtle)]">
                  One key per line, <span className="font-mono">name,key</span>. A bare key gets a numbered name.
                  {pending.length > 0 && ` ${pending.length} found.`}
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setCsv((await file.text()).trim());
                    e.target.value = "";
                  }}
                />
                <Button size="sm" variant="secondary" icon={<FileUp className="h-3.5 w-3.5" />} onClick={() => fileRef.current?.click()}>
                  Upload .csv
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto] items-center gap-2">
                  <input
                    value={row.name}
                    onChange={(e) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))}
                    placeholder={`Name (key ${i + 1})`}
                    className="h-9 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-subtle)] hover:border-[var(--border-strong)] focus:border-[var(--border-strong)] focus:outline-none"
                  />
                  <input
                    value={row.apiKey}
                    onChange={(e) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, apiKey: e.target.value } : r)))}
                    placeholder={provider.keyFormat || "API key"}
                    type="password"
                    autoComplete="off"
                    className="h-9 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 font-mono text-[12.5px] text-[var(--text)] placeholder:text-[var(--text-subtle)] hover:border-[var(--border-strong)] focus:border-[var(--border-strong)] focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Remove row"
                    disabled={rows.length === 1}
                    onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                    className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-subtle)] hover:bg-[var(--surface-hover)] hover:text-err-500 disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setRows((prev) => [...prev, { name: "", apiKey: "" }])}
              >
                Add row
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function mask(key: string) {
  const k = key.trim();
  if (k.length <= 8) return "••••";
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}
