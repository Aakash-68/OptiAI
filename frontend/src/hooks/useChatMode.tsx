"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ChatMode } from "@/lib/types";

/**
 * Chat/Ask lives above both the Topbar (which renders the switch) and the chat
 * page (which acts on it), so it needs its own small context rather than local
 * state in either one.
 */
const ChatModeContext = createContext<{ mode: ChatMode; setMode: (m: ChatMode) => void }>({
  mode: "chat",
  setMode: () => {},
});

export function ChatModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ChatMode>("chat");
  const value = useMemo(() => ({ mode, setMode }), [mode]);
  return <ChatModeContext.Provider value={value}>{children}</ChatModeContext.Provider>;
}

export const useChatMode = () => useContext(ChatModeContext);
