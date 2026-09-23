"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowDown, Check, Copy, Wand2 } from "lucide-react";
import { Markdown } from "@/components/chat/Markdown";
import { MessageActions } from "@/components/chat/MessageActions";
import { useStickToBottom } from "@/hooks/useStickToBottom";
import { cx } from "@/lib/format";
import type { ChatMessage } from "@/lib/types";

/**
 * Transcript.
 *
 * Assistant turns run full width with no avatar — the alternating alignment
 * already says who is speaking. What each answer cost you is still recorded
 * per turn, but it lives in the ⋯ menu of the action row rather than as a
 * strip of numbers under every reply.
 */
export function MessageList({
  messages,
  streaming,
}: {
  messages: ChatMessage[];
  streaming?: boolean;
}) {
  const { rootRef, stuck, scrollToBottom } = useStickToBottom<HTMLDivElement>();

  const last = messages[messages.length - 1];
  const count = messages.length;
  const lastContent = last?.content;

  // A turn you just sent is one you want to see, so a new message always
  // scrolls — unlike streamed text, which only follows if you stayed put.
  useEffect(() => {
    scrollToBottom("smooth");
  }, [count, scrollToBottom]);

  // Streaming: instant, never smooth. Smooth-scrolling on every chunk queues
  // animations against each other and reads as a stutter.
  useEffect(() => {
    if (stuck) scrollToBottom("auto");
  }, [lastContent, streaming, stuck, scrollToBottom]);

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-3xl px-5 py-6">
      <div className="space-y-6">
        {messages.map((message, index) => (
          <MessageRow
            key={message.id}
            message={message}
            // Only the last assistant turn can still be receiving tokens.
            streaming={
              Boolean(streaming) && index === messages.length - 1 && message.role === "assistant"
            }
          />
        ))}

        {/* The gap before the assistant turn exists — mode switches, retries. */}
        {streaming && last?.role === "user" && <ThinkingLine />}
      </div>

      <div className="h-4" />

      {/*
       * Only offered once the view has detached. While it is following there
       * is nothing to jump to, and a permanent button would be one more thing
       * floating over the transcript for no reason.
       */}
      {!stuck && (
        // The wrapper does the sticking and the centring; the button just sits
        // in it. A sticky element cannot be centred with `left-1/2` — `left`
        // only constrains it during horizontal scroll, which never happens here.
        <div className="pointer-events-none sticky bottom-4 z-10 flex justify-center">
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            aria-label="Jump to latest"
            title="Jump to latest"
            className={cx(
              "animate-in pointer-events-auto grid h-9 w-9 place-items-center rounded-full",
              "border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)]",
              "shadow-[var(--shadow-md)] transition-[color,transform] duration-150 ease-out",
              "hover:text-[var(--text)] active:scale-[0.94]"
            )}
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Words shown while the first token is still in flight, in order. */
const THINKING_WORDS = ["Thinking", "Working on it", "Still thinking", "Almost there"];

/**
 * The gap between sending and the first token used to be blank.
 *
 * Breathing grey text is the convention across assistants, and it does more
 * than a spinner: the wording advances as the wait grows, so a slow model
 * reads as "still going" rather than "stuck". The dots are a separate element
 * so the word can change without them restarting their cycle.
 */
function ThinkingLine() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Hold the first word longer — most replies start before it ever changes.
    const timer = setInterval(() => {
      setStep((s) => Math.min(s + 1, THINKING_WORDS.length - 1));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 pt-1 text-[14px] text-[var(--text-subtle)]"
    >
      <span className="think-pulse">{THINKING_WORDS[step]}</span>
      <span aria-hidden className="flex items-center gap-1">
        <Dot delay="0ms" />
        <Dot delay="180ms" />
        <Dot delay="360ms" />
      </span>
    </p>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="think-pulse h-[5px] w-[5px] rounded-full bg-[var(--text-subtle)]"
      style={{ animationDelay: delay }}
    />
  );
}

function MessageRow({ message, streaming }: { message: ChatMessage; streaming?: boolean }) {
  if (message.role === "user") {
    // A refined prompt is a user turn OptiAI wrote. It is sent as one, so it
    // sits on the user's side — but it says who wrote it, because passing
    // OptiAI's words off as the person's would be a small lie told often.
    const refined = message.meta?.refined;
    return (
      <div className="flex flex-col items-end">
        {refined && (
          <span className="mb-1 mr-1 inline-flex items-center gap-1 text-[11px] text-[var(--brand)]">
            <Wand2 className="h-3 w-3" />
            Refined by OptiAI
          </span>
        )}
        <div
          className={cx(
            "max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-[14.5px] leading-relaxed text-[var(--text)]",
            refined
              ? "border border-[var(--brand-soft-border)] bg-[var(--brand-soft)]"
              : "bg-[var(--brand-soft)]"
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    );
  }

  const meta = message.meta;
  // The empty assistant turn is appended the instant you hit send, so this —
  // not "the last message is yours" — is what "waiting for the model" means.
  const awaiting = Boolean(streaming) && !message.content.trim() && !meta?.error;

  return (
    <div className="group/msg min-w-0">
      {meta?.error ? (
        <div className="rounded-xl border border-err-500/25 bg-err-50 px-4 py-3 dark:bg-err-500/10">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-err-700 dark:text-err-500">
            <AlertCircle className="h-4 w-4" />
            Request failed
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-err-700/90 dark:text-err-500/90">
            {meta.error}
          </p>
        </div>
      ) : awaiting ? (
        <ThinkingLine />
      ) : (
        <Markdown content={message.content} streaming={streaming} model={meta?.model} />
      )}

      {meta && !meta.error && !streaming && message.content.trim() && (
        <MessageActions content={message.content} meta={meta} />
      )}

      {/* A failed turn has no answer to act on, so its id is shown outright. */}
      {meta?.error && meta.promptId && (
        <div className="mt-2 text-[11.5px] text-[var(--text-subtle)]">
          <PromptIdTag promptId={meta.promptId} />
        </div>
      )}
    </div>
  );
}

/**
 * The backend's handle for a failed turn, click-to-copy.
 *
 * Shown truncated because the full id is only useful pasted somewhere — into
 * Usage → Prompts, or a support thread — not read off the screen.
 */
function PromptIdTag({ promptId }: { promptId: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      title={`Prompt ID ${promptId} — click to copy`}
      onClick={() => {
        navigator.clipboard
          ?.writeText(promptId)
          .then(() => setCopied(true))
          .catch(() => {
            /* clipboard is unavailable over plain http on some browsers */
          });
      }}
      className="inline-flex items-center gap-1 rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--text-subtle)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-muted)]"
    >
      {copied ? <Check className="h-3 w-3 text-ok-600" /> : <Copy className="h-3 w-3" />}
      {copied ? "copied" : promptId.slice(0, 14)}
    </button>
  );
}
