/**
 * A first message typed somewhere other than the chat page.
 *
 * The project view has its own "New chat in …" box. It creates the thread,
 * parks the text here, and navigates to /chat, which sends it once the page
 * has a model to send with. sessionStorage rather than a store: it must
 * survive the route change and nothing else, and a stale entry from a closed
 * tab should not fire a request weeks later.
 */
const KEY = "optiai.pendingPrompt";

export interface PendingPrompt {
  threadId: string;
  text: string;
}

export function stashPendingPrompt(p: PendingPrompt) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode: the thread still opens, the text is just not auto-sent */
  }
}

/** Reads and clears the pending prompt if it belongs to `threadId`. */
export function takePendingPrompt(threadId: string): string | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPrompt;
    if (parsed.threadId !== threadId) return null;
    window.sessionStorage.removeItem(KEY);
    return parsed.text;
  } catch {
    return null;
  }
}
