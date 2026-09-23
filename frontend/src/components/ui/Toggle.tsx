"use client";

import { cx } from "@/lib/format";

/** Switch used for model activation, round-robin, and settings rows. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  size = "md",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const dims =
    size === "sm"
      ? { track: "h-4.5 w-8", knob: "h-3.5 w-3.5", shift: "translate-x-3.5" }
      : { track: "h-5.5 w-10", knob: "h-4.5 w-4.5", shift: "translate-x-4.5" };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-200",
        dims.track,
        checked ? "grad-brand" : "bg-[var(--border-strong)]",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cx(
          "inline-block rounded-full bg-white shadow-sm transition-transform duration-200",
          dims.knob,
          checked ? dims.shift : "translate-x-0"
        )}
      />
    </button>
  );
}
