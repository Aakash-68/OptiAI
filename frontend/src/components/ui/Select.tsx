"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cx } from "@/lib/format";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
}

/**
 * The one dropdown.
 *
 * Replaces the native <select>, which paints its own menu and ignores every
 * token in the app. The trigger is a field; the menu is a portalled, fixed
 * card under it (so no clipping ancestor can crop it), with rounded rows, a
 * soft brand tint on the current value and a brand scrollbar thumb.
 * Keyboard: arrows move, Enter picks, Escape closes, type-ahead jumps.
 */
export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = "Choose…",
  className,
  menuClassName,
  disabled,
  size = "md",
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  "aria-label"?: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const typed = useRef({ text: "", at: 0 });

  const current = options.find((o) => o.value === value) || null;

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const GAP = 6;
      const EDGE = 8;
      const below = window.innerHeight - r.bottom - GAP - EDGE;
      const above = r.top - GAP - EDGE;
      // Open downwards unless the space below is cramped and above is better.
      const down = below >= 180 || below >= above;
      const maxHeight = Math.min(320, Math.max(140, down ? below : above));
      setPos({
        left: Math.min(Math.max(EDGE, r.left), Math.max(EDGE, window.innerWidth - r.width - EDGE)),
        top: down ? r.bottom + GAP : r.top - GAP - maxHeight,
        width: Math.max(r.width, 180),
        maxHeight,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // Click outside — the menu is portalled, so it is not a DOM descendant.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      const i = Math.max(0, options.findIndex((o) => o.value === value));
      setActive(i);
      requestAnimationFrame(() => {
        menuRef.current?.querySelector<HTMLElement>(`[data-index="${i}"]`)?.scrollIntoView({ block: "nearest" });
      });
    }
  }, [open, options, value]);

  function pick(i: number) {
    const o = options[i];
    if (!o) return;
    onChange(o.value);
    setOpen(false);
    rootRef.current?.focus();
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = e.key === "ArrowDown" ? Math.min(options.length - 1, active + 1) : Math.max(0, active - 1);
      setActive(next);
      menuRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      pick(active);
      return;
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      const now = Date.now();
      typed.current = { text: now - typed.current.at < 700 ? typed.current.text + e.key : e.key, at: now };
      const q = typed.current.text.toLowerCase();
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(q));
      if (i >= 0) setActive(i);
    }
  }

  return (
    <div className={cx("w-full", className)}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
          {label}
        </label>
      )}
      <button
        ref={rootRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKey}
        className={cx(
          "flex w-full items-center gap-2 rounded-lg border bg-[var(--surface)] text-left text-[var(--text)] transition-colors",
          "hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-60",
          open ? "border-[var(--brand-soft-border)] ring-2 ring-[var(--ring)]" : "border-[var(--border)]",
          size === "sm" ? "h-8 px-2.5 text-[12.5px]" : "h-9.5 px-3 text-sm"
        )}
      >
        {current?.icon}
        <span className={cx("min-w-0 flex-1 truncate", !current && "text-[var(--text-subtle)]")}>
          {current?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cx(
            "h-4 w-4 shrink-0 text-[var(--text-subtle)] transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-labelledby={id}
            style={{ position: "fixed", left: pos.left, top: pos.top, width: pos.width, maxHeight: pos.maxHeight, zIndex: 70 }}
            className={cx(
              "animate-in select-menu overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1.5 shadow-[var(--shadow-lg)]",
              menuClassName
            )}
          >
            {options.length === 0 && (
              <p className="px-2.5 py-2 text-[12.5px] text-[var(--text-subtle)]">No options</p>
            )}
            {options.map((o, i) => {
              const isCurrent = o.value === value;
              const isActive = i === active;
              return (
                <div
                  key={o.value}
                  role="option"
                  aria-selected={isCurrent}
                  data-index={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(i)}
                  className={cx(
                    "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                    isActive ? "bg-[var(--brand-soft)] text-[var(--text)]" : "text-[var(--text-muted)]",
                    isCurrent && "font-medium text-[var(--text)]"
                  )}
                >
                  {o.icon}
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="shrink-0 text-[11px] text-[var(--text-subtle)]">{o.hint}</span>}
                  {isCurrent && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
