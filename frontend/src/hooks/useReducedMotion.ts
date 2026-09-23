"use client";

import { useEffect, useState } from "react";

/**
 * Honours the OS "reduce motion" setting.
 *
 * Everything that animates continuously — the composer beam, the beam on the
 * AI search bars — pauses on this rather than running forever in the corner
 * of someone's eye.
 *
 * Starts `false` so server and first client render agree; the real value
 * lands in the effect.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
