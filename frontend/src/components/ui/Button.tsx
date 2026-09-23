"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cx } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gradient";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] shadow-[var(--shadow-sm)] disabled:hover:bg-[var(--brand)]",
  secondary:
    "bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]",
  ghost: "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
  danger:
    "bg-err-50 text-err-700 border border-err-500/25 hover:bg-err-500 hover:text-white hover:border-err-500",
  gradient: "grad-brand text-white shadow-[var(--shadow-md)] hover:brightness-110",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-9.5 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-xl",
  icon: "h-9 w-9 justify-center rounded-lg",
};

/** The one button in the app. Every affordance routes through these variants. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, className, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center font-medium whitespace-nowrap transition-all duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : icon}
      {children}
    </button>
  );
});
