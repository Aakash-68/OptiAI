"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Lightbulb, Plug, ScanSearch } from "lucide-react";
import { Composer } from "@/components/chat/Composer";
import type { ModelChoice } from "@/components/chat/ModelPicker";
import type { ChatMessage, ChatMode } from "@/lib/types";
import { MessageList } from "@/components/chat/MessageList";
import { useChatStore } from "@/hooks/useChatStore";
import { useChatMode } from "@/hooks/useChatMode";
import { useStreams } from "@/hooks/useStreams";
import { useProjects } from "@/hooks/useProjects";
import { useLocalStorage } from "@/hooks/useApi";
import { useSkills } from "@/hooks/useSkills";
import { usePane } from "@/hooks/useSplitView";
import { takePendingPrompt } from "@/lib/pendingPrompt";

/** Characters of each project source file sent per turn. */
const PROJECT_FILE_CHARS = 24_000;
import {
  buildContent,
  buildTranscriptText,
  type Attachment,
  type ContentPart,
} from "@/lib/attachments";
import { ApiError, ChatError, streamChat } from "@/lib/api";
import { newId } from "@/hooks/useChatStore";
import { Wordmark } from "@/components/ui/Logo";
import Link from "next/link";

/**
 * In Ask mode OptiAI works on the prompt instead of answering it. The rewrite
 * instruction is applied here, at send time, so the transcript still shows what
 * the user actually typed.
 */
const ASK_INSTRUCTION = `You are OptiAI's prompt engineer. Do NOT answer the request below.
Instead:
1. Rewrite it as a sharper prompt, ready to paste.
2. List what context is missing that would materially change the answer.
3. Name the kind of model this needs (cheap/fast vs frontier reasoning) and why.

The request:
`;

/**
 * Ask with Prompt mode *off*.
 *
 * Deliberately narrower than ASK_INSTRUCTION: it asks for the rewritten
 * prompt and nothing else, so the whole reply can be used verbatim as the
 * next turn. The alternative - letting the model explain itself and then
 * digging the prompt back out of the prose - breaks as soon as one model
 * formats its answer differently from another.
 */
const REFINE_ONLY_INSTRUCTION = `Rewrite the request below as a single, sharper prompt that is ready to send to an AI model.
Keep the user's intent exactly. Add the constraints, format and context that a good answer needs.
Output ONLY the rewritten prompt. No preamble, no explanation, no surrounding quotes or code fences.

The request:
`;

/**
 * Sent as a system turn on every request: keep answers in Markdown, which the
 * transcript renders. Deliberately short — it rides on every prompt.
 */
const FORMAT_INSTRUCTION = `Format answers in Markdown: headings, lists, tables and fenced code blocks with a language tag where useful. Answer directly in the chat.`;

/**
 * Added only when the user actually asked for a file. Sending it on every
 * turn taught models to wrap ordinary answers in a file block — and a model
 * that half-follows the convention produces an empty card instead of the
 * answer. The fence is four backticks so a plan that itself contains code
 * blocks cannot close the file early.
 */
const FILE_INSTRUCTION = `
The user wants a downloadable file. Put its COMPLETE content in ONE fenced block opened with four backticks and the info string "file <filename.ext>", for example:
\`\`\`\`file weekly-report.pdf
# Weekly report
...
\`\`\`\`
Write the file body in Markdown. Supported extensions: pdf, md, txt, csv, json, html. Never leave the block empty. Say briefly what the file contains outside the block.`;

/** Does the message ask for something to download, save or export? */
function wantsFile(text: string): boolean {
  return /\b(download(able)?|export|save (it |this )?(as|to)|as an? (pdf|file|document|markdown|csv|json|html)|\.(pdf|md|csv|json|txt|html)\b|pdf\b|markdown file|text file|csv file)/i.test(
    text
  );
}

/** The user's own words from a turn, whether it went out as text or content parts. */
function turnText(outgoing: string | ContentPart[]): string {
  if (typeof outgoing === "string") return outgoing;
  return outgoing
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("\n");
}

const STARTERS = [
  {
    icon: ScanSearch,
    title: "Analyze usage",
    prompt: "Summarize where my AI spending went this month and what I should change.",
  },
  {
    icon: Lightbulb,
    title: "Compare models",
    prompt: "Which model should I use for bulk code review on a tight budget, and why?",
  },
  {
    icon: BarChart3,
    title: "Explain a cost",
    prompt: "My input:output token ratio is 40:1. Explain what that implies and how to fix it.",
  },
];

/**
 * Models are told not to fence the rewritten prompt, and mostly comply. When
 * one does anyway, unwrap it rather than sending the backticks along as if
 * they were part of the request.
 */
function stripFences(text: string): string {
  const fenced = /^```[\w-]*\n([\s\S]*?)\n```$/.exec(text.trim());
  return (fenced ? fenced[1] : text).trim();
}

export default function ChatPage() {
  const store = useChatStore();
  const { threads, createThread, selectThread, appendMessage, updateMessage } = store;
  /**
   * Inside a split pane the thread is the pane's, not the global selection —
   * that is what lets two conversations sit side by side. Everything below
   * reads `activeId`/`active`, so nothing else has to know where it renders.
   */
  const pane = usePane();
  const activeId = pane?.threadId ?? store.activeId;
  const active = pane?.threadId
    ? threads.find((t) => t.id === pane.threadId) ?? null
    : store.active;
  const { mode } = useChatMode();
  const { projects } = useProjects();

  /**
   * The project this thread belongs to, if any. It supplies the standing
   * instructions prepended to every turn and the models the thread may pick
   * from — which is what makes a project a workspace rather than a label.
   */
  const project = useMemo(
    () => (active?.projectId ? projects.find((p) => p.id === active.projectId) || null : null),
    [active?.projectId, projects]
  );
  const allowedModels = project?.models?.length ? project.models : undefined;
  /**
   * What a project contributes to every turn: its standing instructions and
   * the text of its source files. Files are capped per file so one large
   * source cannot crowd out the conversation; the cap is stated inline so the
   * model knows it is reading an excerpt.
   */
  const projectContext = useMemo(() => {
    if (!project) return null;
    const parts: string[] = [];
    if (project.instructions.trim()) parts.push(project.instructions.trim());
    for (const f of project.files || []) {
      if (!f.content) continue;
      const text = f.content.length > PROJECT_FILE_CHARS ? `${f.content.slice(0, PROJECT_FILE_CHARS)}\n[… truncated at ${PROJECT_FILE_CHARS} characters]` : f.content;
      parts.push(`<source name="${f.name}">\n${text}\n</source>`);
    }
    return parts.length ? `Project "${project.name}" context:\n${parts.join("\n\n")}` : null;
  }, [project]);
  const [model, setModel] = useLocalStorage<ModelChoice | null>("optiai.defaultModel", null);
  const { isStreaming, begin, end, stop } = useStreams();
  // Whether *this* conversation is busy. Another one generating in the
  // background must not disable the composer in front of you.
  const streaming = isStreaming(activeId);
  // On by default: Ask handing back a prompt is the behaviour people
  // expect from it. Off chains the refined prompt straight into an answer.
  const [promptMode, setPromptMode] = useLocalStorage("optiai.promptMode", true);
  // Whether this browser's chat turns carry the enabled OptiAI skills. A
  // thread inside a project uses that project's picks; otherwise the enabled set.
  const [skillsOn, setSkillsOn] = useLocalStorage("optiai.skillsInChat", true);
  const { enabled: enabledSkills, chatApply } = useSkills();
  const projectSkillIds = useMemo(
    () => (project ? [...(project.skills || []), ...(project.plugins || [])] : []),
    [project]
  );
  const skillsCount = !chatApply
    ? 0
    : projectSkillIds.length > 0
      ? projectSkillIds.length
      : enabledSkills.length;

  // Landing on /chat with no selection opens the most recent thread rather than
  // stranding the user on an empty screen with a populated sidebar.
  useEffect(() => {
    if (pane) return;
    if (!activeId && threads.length > 0) selectThread(threads[0].id);
  }, [pane, activeId, threads, selectThread]);

  /**
   * Stream one turn into an existing assistant message.
   *
   * Split out of `send` because Ask with Prompt mode off runs two turns back
   * to back - refine, then answer - and both need identical streaming, error
   * and telemetry handling. Returns the final text, or null if the turn
   * failed or was stopped, so the caller knows whether to continue the chain.
   */
  async function streamTurn(
    threadId: string,
    assistantId: string,
    outgoing: string | ContentPart[],
    chosen: ModelChoice,
    priorTurns: { role: ChatMessage["role"]; content: string }[],
    turnMode: ChatMode,
    controller: AbortController
  ): Promise<string | null> {
    const startedAt = performance.now();
    let content = "";
    let usage: Record<string, number> | undefined;
    let resolvedModel = chosen.value;
    // Minted by the backend before the request reaches any provider and returned
    // on the response headers, so it is available even if the stream then fails.
    let promptId: string | undefined;
    let appliedSkills: string[] = [];

    try {
      for await (const chunk of streamChat(
        {
          model: chosen.value,
          messages: [
            {
              role: "system",
              content: wantsFile(turnText(outgoing))
                ? `${FORMAT_INSTRUCTION}\n${FILE_INSTRUCTION}`
                : FORMAT_INSTRUCTION,
            },
            ...(projectContext
              ? [{ role: "system" as const, content: projectContext }]
              : []),
            ...priorTurns,
            { role: "user", content: outgoing },
          ],
          threadId,
          messageId: assistantId,
          mode: turnMode,
          skills: {
            apply: skillsOn,
            ids: projectSkillIds.length > 0 ? projectSkillIds : undefined,
          },
        },
        controller.signal
      )) {
        if (chunk.promptId) {
          promptId = chunk.promptId;
          appliedSkills = chunk.skills ?? [];
          // Written immediately: a turn that is still streaming is already
          // traceable, and a later crash cannot lose the id.
          updateMessage(threadId, assistantId, {
            meta: { model: resolvedModel, provider: chosen.provider, promptId, skills: appliedSkills },
          });
        }
        if (chunk.delta) {
          content += chunk.delta;
          updateMessage(threadId, assistantId, { content });
        }
        if (chunk.usage) usage = chunk.usage;
        if (chunk.model) resolvedModel = chunk.model;
      }

      updateMessage(threadId, assistantId, {
        content,
        meta: {
          model: resolvedModel,
          provider: chosen.provider,
          promptId,
          skills: appliedSkills,
          promptTokens: usage?.prompt_tokens ?? usage?.input_tokens,
          completionTokens: usage?.completion_tokens ?? usage?.output_tokens,
          latencyMs: performance.now() - startedAt,
        },
      });
      return content;
    } catch (err) {
      if (controller.signal.aborted) {
        updateMessage(threadId, assistantId, {
          content: content || "(stopped)",
          meta: { model: resolvedModel, provider: chosen.provider, promptId },
        });
      } else {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Request failed";
        updateMessage(threadId, assistantId, {
          content,
          meta: {
            model: resolvedModel,
            error: message,
            // A failed turn is traced too, so the id still points somewhere real.
            promptId: promptId ?? (err instanceof ChatError ? err.promptId : undefined),
          },
        });
      }
      return null;
    }
  }

  async function send(text: string, attachments: Attachment[] = []) {
    let threadId = activeId;
    if (!threadId) threadId = createThread();

    appendMessage(threadId, {
      id: newId(),
      role: "user",
      content: buildTranscriptText(text, attachments),
      createdAt: new Date().toISOString(),
    });

    if (!model) {
      appendMessage(threadId, {
        id: newId(),
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        meta: {
          error:
            "No model selected. Pick one from the selector in the composer - or connect a provider first under Providers.",
        },
      });
      return;
    }

    // The picker only offers models that passed a live test, so a selection that
    // is no longer usable means it was tested clean earlier and has since lost
    // its connection or started failing. Say that, rather than sending and
    // surfacing whatever the provider happens to return.
    if (model.ready === false) {
      appendMessage(threadId, {
        id: newId(),
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        meta: {
          model: model.value,
          error: `"${model.label}" is no longer reachable - its provider was disconnected, or the model stopped passing its test. Pick another model, or re-test it under Providers.`,
        },
      });
      return;
    }

    // Failed turns leave an assistant message with empty content; several
    // providers reject a message with no content outright, which would make
    // every later send in the thread fail too. They carry nothing for the
    // model anyway, so they are dropped from what is sent.
    const priorTurns = (active?.messages || [])
      .filter((m) => m.content.trim().length > 0 && !m.meta?.error)
      .map((m) => ({ role: m.role, content: m.content }));

    const body = buildContent(text, attachments);
    // Keyed by thread, so a second conversation can run at the same time.
    const controller = begin(threadId);

    try {
      // Ask + Prompt mode off: refine first, then answer the refined prompt.
      // The refining turn asks for the prompt and nothing else, so its whole
      // output is usable verbatim - parsing prose for "the prompt part" would
      // break the moment a model formatted its answer differently.
      if (mode === "ask" && !promptMode) {
        const refineId = newId();
        appendMessage(threadId, {
          id: refineId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          meta: { model: model.value },
        });

        const refined = await streamTurn(
          threadId,
          refineId,
          typeof body === "string"
            ? `${REFINE_ONLY_INSTRUCTION}${body}`
            : [
                { type: "text" as const, text: `${REFINE_ONLY_INSTRUCTION}${text}` },
                ...body.slice(1),
              ],
          model,
          priorTurns,
          "ask",
          controller
        );

        if (!refined?.trim()) return;

        // The refined prompt is what gets answered, so it reads as a turn the
        // user sent. `refined` keeps it honest about who actually wrote it.
        const improved = stripFences(refined.trim());
        updateMessage(threadId, refineId, {
          role: "user",
          content: improved,
          meta: { refined: true },
        });

        const answerId = newId();
        appendMessage(threadId, {
          id: answerId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          meta: { model: model.value },
        });

        await streamTurn(
          threadId,
          answerId,
          improved,
          model,
          [...priorTurns, { role: "user", content: improved }],
          "chat",
          controller
        );
        return;
      }

      const assistantId = newId();
      appendMessage(threadId, {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        meta: { model: model.value },
      });

      const outgoing =
        mode === "ask"
          ? typeof body === "string"
            ? `${ASK_INSTRUCTION}${body}`
            : [{ type: "text" as const, text: `${ASK_INSTRUCTION}${text}` }, ...body.slice(1)]
          : body;

      await streamTurn(threadId, assistantId, outgoing, model, priorTurns, mode, controller);
    } finally {
      end(threadId);
    }
  }

  const hasMessages = (active?.messages.length ?? 0) > 0;

  /**
   * A first message typed on a project page. It is sent once the thread is
   * selected and a model is available; the ref guards against the effect
   * re-firing while the turn streams. Without a model the text is put in
   * the transcript as an error-free hint by leaving the pending entry in
   * place, so choosing a model and pressing send is all that is needed.
   */
  const pendingSentFor = useRef<string | null>(null);
  useEffect(() => {
    if (!activeId || pane || !model || pendingSentFor.current === activeId) return;
    const text = takePendingPrompt(activeId);
    if (!text) return;
    pendingSentFor.current = activeId;
    void send(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, model, pane]);

  return (
    <div className="flex h-full flex-col">
      {hasMessages ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <MessageList messages={active!.messages} streaming={streaming} />
          </div>
          <div className="shrink-0 px-5 pb-5">
            <div className="mx-auto w-full max-w-3xl">
              <Composer
                onSend={send}
                onStop={() => activeId && stop(activeId)}
                streaming={streaming}
                mode={mode}
                model={model}
                onModelChange={setModel}
                allowedModels={allowedModels}
                promptMode={promptMode}
                onPromptModeChange={setPromptMode}
                skillsOn={skillsOn}
                skillsCount={skillsCount}
                onSkillsChange={setSkillsOn}
              />
              <p className="mt-2 text-center text-[11px] text-[var(--text-subtle)]">
                Responses are routed through OptiAI. Token counts and cost are recorded per request.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 py-10">
          <div className="w-full max-w-2xl">
            <div className="mb-8 flex flex-col items-center text-center">
              <Wordmark height={34} className="mb-5" />
              <h1 className="font-display text-[28px] font-bold tracking-tight text-[var(--text)]">
                {mode === "ask" ? "What are you trying to get out of it?" : "How can I help today?"}
              </h1>
              <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[var(--text-subtle)]">
                {mode === "ask"
                  ? "Describe the outcome you want. OptiAI will shape the prompt and tell you which model suits it."
                  : "Your message routes through the model or combo you select below."}
              </p>
            </div>

            <Composer
              onSend={send}
              streaming={streaming}
              mode={mode}
              model={model}
              onModelChange={setModel}
              allowedModels={allowedModels}
              promptMode={promptMode}
              onPromptModeChange={setPromptMode}
              skillsOn={skillsOn}
              skillsCount={skillsCount}
              onSkillsChange={setSkillsOn}
              autoFocus
            />

            <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
              {STARTERS.map((starter) => {
                const Icon = starter.icon;
                return (
                  <button
                    key={starter.title}
                    onClick={() => send(starter.prompt)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-left transition-all hover:border-[var(--brand-soft-border)] hover:shadow-[var(--shadow-md)]"
                  >
                    <Icon className="h-4 w-4 text-[var(--brand)]" />
                    <p className="mt-2 text-[13px] font-semibold text-[var(--text)]">
                      {starter.title}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-snug text-[var(--text-subtle)]">
                      {starter.prompt}
                    </p>
                  </button>
                );
              })}
            </div>

            {!model && (
              <div className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-warn-500/25 bg-warn-50 px-4 py-2.5 text-[13px] text-warn-700 dark:bg-warn-500/10 dark:text-warn-500">
                <Plug className="h-4 w-4 shrink-0" />
                <span>
                  No model selected yet.{" "}
                  <Link href="/providers" className="font-semibold underline underline-offset-2">
                    Connect a provider
                  </Link>{" "}
                  to get started.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
