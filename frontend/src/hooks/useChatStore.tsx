"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocalStorage } from "./useApi";
import type { ChatMessage, ChatThread } from "@/lib/types";

/**
 * Chat threads live in the browser for now.
 *
 * The backend records every *request* in usageHistory, but it has no concept of
 * a conversation — there is no threads table and no /api/chat/threads route. So
 * the transcript is client-side and the telemetry attached to each assistant
 * message is what the gateway reported for that call. Moving this to the server
 * later means swapping this provider's internals, not its interface.
 */
interface ChatStore {
  threads: ChatThread[];
  activeId: string | null;
  active: ChatThread | null;
  hydrated: boolean;
  createThread: (opts?: { projectId?: string; title?: string }) => string;
  selectThread: (id: string | null) => void;
  deleteThread: (id: string) => void;
  renameThread: (id: string, title: string) => void;
  appendMessage: (threadId: string, message: ChatMessage) => void;
  updateMessage: (threadId: string, messageId: string, patch: Partial<ChatMessage>) => void;
}

const ChatContext = createContext<ChatStore | null>(null);

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** First user message becomes the thread title, trimmed to something scannable. */
export function titleFromMessage(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean || "New chat";
}

export function ChatStoreProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads, hydrated] = useLocalStorage<ChatThread[]>("optiai.threads", []);
  const [activeId, setActiveId] = useState<string | null>(null);

  const createThread = useCallback(
    (opts: { projectId?: string; title?: string } = {}) => {
      const now = new Date().toISOString();
      const thread: ChatThread = {
        id: uid(),
        title: opts.title || "New chat",
        projectId: opts.projectId ?? null,
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      setThreads((prev) => [thread, ...prev]);
      setActiveId(thread.id);
      return thread.id;
    },
    [setThreads]
  );

  const deleteThread = useCallback(
    (id: string) => {
      setThreads((prev) => prev.filter((t) => t.id !== id));
      setActiveId((current) => (current === id ? null : current));
    },
    [setThreads]
  );

  const renameThread = useCallback(
    (id: string, title: string) => {
      setThreads((prev) =>
        prev.map((t) => (t.id === id ? { ...t, title, updatedAt: new Date().toISOString() } : t))
      );
    },
    [setThreads]
  );

  const appendMessage = useCallback(
    (threadId: string, message: ChatMessage) => {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t;
          const isFirstUserMessage = t.messages.length === 0 && message.role === "user";
          return {
            ...t,
            title: isFirstUserMessage ? titleFromMessage(message.content) : t.title,
            messages: [...t.messages, message],
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    [setThreads]
  );

  const updateMessage = useCallback(
    (threadId: string, messageId: string, patch: Partial<ChatMessage>) => {
      setThreads((prev) =>
        prev.map((t) =>
          t.id !== threadId
            ? t
            : {
                ...t,
                messages: t.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
                updatedAt: new Date().toISOString(),
              }
        )
      );
    },
    [setThreads]
  );

  const value = useMemo<ChatStore>(
    () => ({
      threads,
      activeId,
      active: threads.find((t) => t.id === activeId) ?? null,
      hydrated,
      createThread,
      selectThread: setActiveId,
      deleteThread,
      renameThread,
      appendMessage,
      updateMessage,
    }),
    [
      threads,
      activeId,
      hydrated,
      createThread,
      deleteThread,
      renameThread,
      appendMessage,
      updateMessage,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatStore(): ChatStore {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatStore must be used inside <ChatStoreProvider>");
  return ctx;
}

/** Groups threads into Today / Yesterday / Previous 7 days / Older. */
export { uid as newId };
