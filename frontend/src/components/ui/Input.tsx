"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cx } from "@/lib/format";

const FIELD =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] " +
  "placeholder:text-[var(--text-subtle)] transition-colors " +
  // Focus deepens the existing border rather than turning it brand purple —
  // a coloured box around every field was reading as an error state.
  "hover:border-[var(--border-strong)] focus:border-[var(--border-strong)] focus:outline-none " +
  "disabled:cursor-not-allowed disabled:opacity-60";

/** `leading`, not `prefix` — the latter is a real HTML attribute typed as string. */
interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leading?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, FieldProps>(function Input(
  { label, hint, error, leading, className, id, ...props },
  ref
) {
  const inputId = id || props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
          {label}
        </label>
      )}
      <div className="relative">
        {leading && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]">
            {leading}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cx(FIELD, "h-9.5", !!leading && "pl-9", !!error && "border-err-500", className)}
          {...props}
        />
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-[var(--text-subtle)]">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-err-600">{error}</p>}
    </div>
  );
});

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cx("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(FIELD, "h-9.5 pl-9")}
      />
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, className, children, id, ...props }: SelectProps) {
  const selectId = id || props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
          {label}
        </label>
      )}
      <select id={selectId} className={cx(FIELD, "h-9.5 cursor-pointer pr-8", className)} {...props}>
        {children}
      </select>
    </div>
  );
}

export function Textarea({
  className,
  ...props
}: InputHTMLAttributes<HTMLTextAreaElement> & { rows?: number }) {
  return (
    <textarea
      className={cx(FIELD, "resize-none py-2.5 leading-relaxed", className)}
      {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
    />
  );
}
