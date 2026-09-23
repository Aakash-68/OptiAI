"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { AlertTriangle, ArrowUp, FileText, ImageIcon, Paperclip, Square, Wand2, X } from "lucide-react";
import { BorderBeam } from "border-beam";
import { ModelPicker, type ModelChoice } from "./ModelPicker";
import { LogoMark } from "@/components/ui/Logo";
import { useTheme } from "@/hooks/useTheme";
import { useChatMode } from "@/hooks/useChatMode";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { supports } from "@/lib/catalog/modelFacts";
import {
  AttachmentError,
  PASTE_THRESHOLD,
  fileToAttachment,
  formatBytes,
  pastedTextAttachment,
  type Attachment,
} from "@/lib/attachments";
import { cx } from "@/lib/format";
import type { ChatMode } from "@/lib/types";

/**
 * The message composer.
 *
 * In Ask mode the placeholder and send affordance change to make it obvious the
 * text will be *worked on* rather than answered — the same box doing two jobs
 * needs to say which job it is doing.
 *
 * The bar is wrapped in a BorderBeam that lights only in Ask mode, so the
 * animated edge means "OptiAI is about to work on this" rather than being
 * permanent chrome. That edge is also why the controls inside drop the
 * brand-coloured focus outline (see the `[data-chat-bar]` rule in
 * globals.css) — two purple rings on one box read as a glitch, not as focus.
 */
export function Composer({
  onSend,
  onStop,
  streaming,
  mode,
  model,
  onModelChange,
  allowedModels,
  promptMode,
  onPromptModeChange,
  autoFocus,
}: {
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop?: () => void;
  streaming?: boolean;
  mode: ChatMode;
  model: ModelChoice | null;
  onModelChange: (choice: ModelChoice) => void;
  /** Set by a project to limit which models this thread may pick. */
  allowedModels?: string[];
  promptMode: boolean;
  onPromptModeChange: (next: boolean) => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const { theme } = useTheme();
  const { setMode } = useChatMode();
  const reducedMotion = useReducedMotion();

  // Grow with content up to a ceiling, then scroll internally.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 208)}px`;
  }, [text]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const isAsk = mode === "ask";
  const images = attachments.filter((a) => a.kind === "image");

  /**
   * The gate. A model without vision cannot be sent an image, so say which
   * model and what to do instead — and block the send rather than letting the
   * provider reject it with something unreadable.
   */
  const blockedByVision =
    images.length > 0 && model !== null && !supports(model.value, model.label, "vision");

  async function addFiles(files: FileList | File[]) {
    const incoming: Attachment[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        incoming.push(await fileToAttachment(file));
      } catch (err) {
        errors.push(err instanceof AttachmentError ? err.message : `Could not attach ${file.name}.`);
      }
    }
    if (incoming.length) setAttachments((prev) => [...prev, ...incoming]);
    if (errors.length) setNotice(errors[0]);
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData?.files || []);
    if (files.length) {
      e.preventDefault();
      void addFiles(files);
      return;
    }

    // A wall of pasted text belongs in a file, not in a one-line box you then
    // cannot see past. Same move Claude makes, and for the same reason.
    const pasted = e.clipboardData?.getData("text") || "";
    if (pasted.length > PASTE_THRESHOLD) {
      e.preventDefault();
      setAttachments((prev) => [...prev, pastedTextAttachment(pasted, prev.length)]);
      setNotice(`Pasted ${pasted.length.toLocaleString()} characters as a file.`);
    }
  }

  // Counted, because dragging over a child fires dragleave on the parent.
  function onDragEnter(e: DragEvent) {
    if (!e.dataTransfer?.types.includes("Files")) return;
    dragDepth.current += 1;
    setDragging(true);
  }
  function onDragLeave() {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (e.dataTransfer?.files?.length) void addFiles(e.dataTransfer.files);
  }

  function submit() {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || streaming || blockedByVision) return;
    onSend(trimmed, attachments);
    setText("");
    setAttachments([]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const canSend = (text.trim() || attachments.length > 0) && !blockedByVision;

  return (
    <BorderBeam
      size="md"
      // Blue→purple, which is the OptiAI gradient; "colorful" is a full rainbow.
      colorVariant="ocean"
      // Follow the in-app toggle rather than the beam's own "auto" (which reads
      // prefers-color-scheme and would ignore the theme switch).
      theme={theme}
      strength={theme === "light" ? 1 : 0.7}
      // The library's light preset is tuned for a tinted card; against a white
      // bar it reads as almost nothing, so light mode gets more of everything.
      brightness={theme === "light" ? 1.7 : 1.3}
      saturation={theme === "light" ? 1.6 : 1.2}
      glowSize={theme === "light" ? 1.2 : 1}
      borderRadius={16}
      // Ask is the mode where OptiAI is working on your prompt rather than
      // relaying it, so the beam marks that state instead of running always.
      active={isAsk && !reducedMotion}
      className="block"
    >
      <div
        data-chat-bar
        onDragEnter={onDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cx(
          "relative rounded-2xl border bg-[var(--surface)] shadow-[var(--shadow-md)] transition-colors",
          dragging
            ? "border-[var(--brand)] ring-2 ring-[var(--brand-soft-border)]"
            : isAsk
              ? "border-[var(--brand-soft-border)]"
              : "border-[var(--border)]"
        )}
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl bg-[var(--brand-soft)]/80">
            <p className="text-[13px] font-medium text-[var(--brand)]">Drop to attach</p>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3">
            {attachments.map((a) => (
              <span
                key={a.id}
                className="inline-flex max-w-[220px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] py-1 pl-2 pr-1 text-[12px]"
              >
                {a.kind === "image" ? (
                  <ImageIcon className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
                ) : (
                  <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--text-subtle)]" />
                )}
                <span className="truncate text-[var(--text)]" title={a.name}>
                  {a.name}
                </span>
                <span className="shrink-0 text-[var(--text-subtle)]">{formatBytes(a.size)}</span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                  aria-label={`Remove ${a.name}`}
                  className="grid h-4 w-4 shrink-0 place-items-center rounded text-[var(--text-subtle)] transition-colors hover:text-err-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={
            isAsk
              ? "Describe what you want to achieve — OptiAI will shape the prompt for you…"
              : "Ask me anything…"
          }
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[14.5px] leading-relaxed text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none"
        />

        {(blockedByVision || notice) && (
          <p
            className={cx(
              "mx-3 mb-1 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] leading-snug",
              blockedByVision
                ? "bg-warn-500/12 text-warn-700 dark:text-warn-500"
                : "bg-[var(--surface-sunken)] text-[var(--text-subtle)]"
            )}
          >
            {blockedByVision && <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />}
            {blockedByVision
              ? `${model?.label} cannot read images. Pick a model with the image badge, or remove the ${images.length === 1 ? "image" : "images"} and describe it instead.`
              : notice}
          </p>
        )}

        <div className="flex items-center gap-2 px-3 pb-3 pt-1">
          <ModelPicker value={model} onChange={onModelChange} allowedModels={allowedModels} />

          {isAsk && (
            <button
              type="button"
              onClick={() => onPromptModeChange(!promptMode)}
              aria-pressed={promptMode}
              title={
                promptMode
                  ? "Prompt mode on — OptiAI hands back a prompt for you to use"
                  : "Prompt mode off — OptiAI refines your prompt, then answers it for you"
              }
              className={cx(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium",
                "transition-all duration-150 ease-out active:scale-[0.96]",
                promptMode
                  ? "bg-[var(--brand-soft)] text-[var(--brand)] ring-1 ring-[var(--brand-soft-border)]"
                  : "text-[var(--text-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              )}
            >
              <Wand2 className="h-3.5 w-3.5" />
              Prompt mode
            </button>
          )}

          <div className="flex-1" />

          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            title="Attach a file"
            aria-label="Attach a file"
            onClick={() => fileRef.current?.click()}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/*
           * Ask, as a switch rather than a trip to the topbar. Lit means the
           * next message gets worked on instead of answered. It writes to the
           * same `useChatMode` context the topbar switch reads, so the two
           * always agree.
           */}
          <button
            type="button"
            onClick={() => setMode(isAsk ? "chat" : "ask")}
            aria-pressed={isAsk}
            title={
              isAsk
                ? "Ask is on — OptiAI will work on your prompt instead of answering it"
                : "Turn on Ask — OptiAI improves the prompt instead of answering it"
            }
            aria-label="Toggle Ask mode"
            className={cx(
              "grid h-8 w-8 place-items-center rounded-lg transition-all duration-150 ease-out active:scale-[0.94]",
              isAsk
                ? "bg-[var(--brand-soft)] shadow-[0_0_12px_-3px_var(--brand)] ring-1 ring-[var(--brand-soft-border)]"
                : "hover:bg-[var(--surface-hover)]"
            )}
          >
            <LogoMark
              size={13}
              className={cx(
                "transition-[opacity,filter] duration-150 ease-out",
                isAsk ? "opacity-100" : "opacity-45 grayscale"
              )}
            />
          </button>

          {streaming ? (
            <button
              onClick={onStop}
              aria-label="Stop generating"
              className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
              className={cx(
                "grid h-8 w-8 place-items-center rounded-lg transition-all",
                canSend
                  ? "grad-brand text-white hover:brightness-110"
                  : "bg-[var(--surface-hover)] text-[var(--text-subtle)]"
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </BorderBeam>
  );
}
