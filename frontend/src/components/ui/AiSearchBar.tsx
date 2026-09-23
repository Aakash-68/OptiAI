"use client";

import { useState, type FormEvent } from "react";
import { ArrowUp, Search } from "lucide-react";
import { BorderBeam } from "border-beam";
import { LogoMark } from "@/components/ui/Logo";
import { useTheme } from "@/hooks/useTheme";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cx } from "@/lib/format";

/**
 * One search bar doing two jobs, switched by the OptiAI toggle.
 *
 *  off — an ordinary search box. Typing filters the list as you go, nothing
 *        is sent anywhere, and the bar is visually quiet.
 *  on  — OptiAI reads the sentence instead of matching substrings. Submit is
 *        explicit, and the beam lights to say a model is behind the field.
 *
 * Same toggle, same lit/greyscale treatment as the composer's Ask switch, so
 * "the mark is lit" means the same thing on every screen. The pages used to
 * carry a plain search input *and* an AI bar, which put the same job in two
 * places; this collapses them.
 */
export function AiSearchBar({
  aiPlaceholder,
  searchPlaceholder,
  onAiSubmit,
  onQueryChange,
  suggestions = [],
  busy,
  className,
}: {
  /** Shown when the toggle is on — phrase it as a sentence, not keywords. */
  aiPlaceholder: string;
  searchPlaceholder: string;
  onAiSubmit: (query: string) => void;
  /** Live filter, called on every keystroke while the toggle is off. */
  onQueryChange: (query: string) => void;
  suggestions?: string[];
  busy?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [ai, setAi] = useState(false);
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();

  function update(next: string) {
    setValue(next);
    // In plain mode the list tracks the field; in AI mode nothing happens
    // until submit, because a half-typed sentence is not a question.
    if (!ai) onQueryChange(next);
  }

  function toggleAi() {
    const next = !ai;
    setAi(next);
    // Leaving AI mode hands the text to the filter; entering it takes the
    // filter back off, so the list is never narrowed by a stale query.
    onQueryChange(next ? "" : value);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    if (ai) onAiSubmit(trimmed);
    else onQueryChange(trimmed);
  }

  return (
    <div className={cx("w-full", className)}>
      <BorderBeam
        size="md"
        colorVariant="ocean"
        theme={theme}
        strength={theme === "light" ? 1 : 0.75}
        brightness={theme === "light" ? 1.55 : 1.3}
        saturation={theme === "light" ? 1.5 : 1.2}
        borderRadius={12}
        active={ai && !reducedMotion}
        className="block"
      >
        <form onSubmit={submit} className={cx("relative rounded-xl", ai && "ai-glow")}>
          <div className="relative flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-4 pr-2.5">
            <Search
              className={cx(
                "h-4 w-4 shrink-0 transition-colors duration-150",
                ai ? "text-[var(--brand)]" : "text-[var(--text-subtle)]"
              )}
            />

            <input
              value={value}
              onChange={(e) => update(e.target.value)}
              placeholder={ai ? aiPlaceholder : searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none"
            />

            <button
              type="button"
              onClick={toggleAi}
              aria-pressed={ai}
              title={
                ai
                  ? "OptiAI search is on — it reads your sentence instead of matching text"
                  : "Turn on OptiAI search — describe what you need in plain words"
              }
              className={cx(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium",
                "transition-all duration-150 ease-out active:scale-[0.96]",
                ai
                  ? "bg-[var(--brand-soft)] text-[var(--brand)] shadow-[0_0_12px_-3px_var(--brand)] ring-1 ring-[var(--brand-soft-border)]"
                  : "text-[var(--text-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              )}
            >
              <LogoMark
                size={12}
                className={cx(
                  "transition-[opacity,filter] duration-150 ease-out",
                  ai ? "opacity-100" : "opacity-45 grayscale"
                )}
              />
              AI Search
            </button>

            {ai && (
              <button
                type="submit"
                disabled={!value.trim() || busy}
                aria-label="Search with OptiAI"
                className={cx(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-all active:scale-[0.94]",
                  value.trim() && !busy
                    ? "grad-logo text-white hover:brightness-110"
                    : "bg-[var(--surface-hover)] text-[var(--text-subtle)]"
                )}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      </BorderBeam>

      {/* Prompts only make sense when something can read them. */}
      {ai && suggestions.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => {
                setValue(s);
                onAiSubmit(s);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[12px] text-[var(--text-muted)] transition-colors hover:border-[var(--brand-soft-border)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
            >
              <LogoMark size={10} className="opacity-70" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
