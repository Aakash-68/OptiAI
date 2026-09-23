"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How close to the bottom still counts as "following along". */
const THRESHOLD = 64;

/**
 * Follow a growing transcript without taking the scrollbar off the user.
 *
 * A stream appends text many times a second. Scrolling to the bottom on every
 * chunk means that the moment someone scrolls up to re-read something, the
 * next token drags them back down — the page fights them for the scrollbar
 * and they lose.
 *
 * So the view only follows while the user is *already* at the bottom. Scroll
 * up and it detaches and stays put; come back within `THRESHOLD` and it
 * re-attaches on its own, no button press needed.
 *
 * The scroller is found by walking up from the returned ref, because the
 * element that actually scrolls is the app shell's `<main>`, not anything the
 * transcript owns.
 */
export function useStickToBottom<T extends HTMLElement>() {
  const rootRef = useRef<T>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const [stuck, setStuck] = useState(true);

  useEffect(() => {
    let node: HTMLElement | null = rootRef.current?.parentElement ?? null;
    while (node) {
      const overflowY = getComputedStyle(node).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") break;
      node = node.parentElement;
    }
    scrollerRef.current = node;
    if (!node) return;

    const el = node;
    const onScroll = () => {
      setStuck(el.scrollHeight - el.scrollTop - el.clientHeight <= THRESHOLD);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setStuck(true);
  }, []);

  return { rootRef, stuck, scrollToBottom };
}
