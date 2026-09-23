"use client";

import { cx } from "@/lib/format";
import type { ChatMode } from "@/lib/types";

/**
 * Chat | Ask — the only thing the topbar carries, and only on /chat.
 *
 *  Chat: your message goes to the selected model and it answers.
 *  Ask:  OptiAI works on the *prompt* instead of answering it — rewrite it,
 *        point out what is missing, or suggest a better-suited model.
 *
 * Styled as plain nav text rather than a segmented pill: no icons, no chips,
 * no fill. Only the selected side gains full ink and a soft text shadow to
 * lift it off the canvas — the same treatment the reference nav uses. Ask is
 * also reachable from the logo toggle in the composer; both drive the same
 * `useChatMode` context, so they cannot drift apart.
 */
export function ModeSwitch({
  mode,
  onChange,
}: {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
}) {
  const options: { id: ChatMode; label: string; hint: string }[] = [
    { id: "chat", label: "Chat", hint: "Send the prompt to the model" },
    { id: "ask", label: "Ask", hint: "Ask OptiAI to improve the prompt instead" },
  ];

  return (
    <nav className="flex items-center gap-1">
      {options.map((option) => {
        const active = mode === option.id;
        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            title={option.hint}
            aria-pressed={active}
            className={cx(
              "font-display rounded-lg px-3 py-1.5 text-[13.5px] font-medium tracking-tight",
              "transition-colors duration-150 ease-out",
              active
                ? "text-[var(--text)] [text-shadow:0_1px_2px_rgb(0_0_0/0.14)]"
                : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </nav>
  );
}
