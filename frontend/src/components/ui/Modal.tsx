"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cx } from "@/lib/format";

/**
 * Centred dialog. Follows the traffic-light header treatment from the reference
 * layouts — the three dots are decorative, only the right-hand X closes.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "animate-in relative w-full overflow-hidden rounded-2xl border border-[var(--border)]",
          "bg-[var(--surface-raised)] shadow-[var(--shadow-lg)]",
          widths[width]
        )}
      >
        <header className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-err-500" />
            <span className="h-3 w-3 rounded-full bg-[var(--border-strong)]" />
            <span className="h-3 w-3 rounded-full bg-[var(--border-strong)]" />
          </span>
          <h2 className="font-display flex-1 text-center text-sm font-semibold text-[var(--text)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface-sunken)] px-5 py-3.5">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
