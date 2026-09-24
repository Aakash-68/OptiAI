"use client";

import type { CSSProperties } from "react";
import { cx } from "@/lib/format";

/**
 * Text with a highlight sweeping across it — React Bits' ShinyText, same
 * props and the same gradient, but driven by a CSS animation rather than
 * the `motion` package. The effect is a background-position tween on a
 * text-clipped gradient, which CSS does natively: no per-frame JS, pauses on
 * hover with `animation-play-state`, and the app's reduced-motion rule turns
 * it off with everything else. `yoyo` maps to `animation-direction:
 * alternate`, which reverses the whole cycle including the hold.
 */
export function ShinyText({
  text,
  disabled = false,
  speed = 2,
  delay = 0,
  className,
  color = "#b5b5b5",
  shineColor = "#ffffff",
  spread = 120,
  yoyo = false,
  pauseOnHover = false,
  direction = "left",
}: {
  text: string;
  disabled?: boolean;
  /** Seconds for one sweep. */
  speed?: number;
  /** Seconds of rest between sweeps. */
  delay?: number;
  className?: string;
  color?: string;
  shineColor?: string;
  /** Gradient angle in degrees. */
  spread?: number;
  yoyo?: boolean;
  pauseOnHover?: boolean;
  direction?: "left" | "right";
}) {
  /*
   * The highlight crosses the text between background positions 150% and
   * -50%. The animation runs for speed + delay, so the end position is
   * pushed past -50% by the same ratio: the crossing still takes `speed`
   * seconds and the remainder of the cycle is spent off the text.
   */
  const cycle = speed + delay;
  const stretch = speed > 0 ? cycle / speed : 1;
  const sign = direction === "left" ? 1 : -1;
  const from = 50 + sign * 100;
  const to = from - sign * 200 * stretch;

  const style = {
    backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
    "--shine-from": `${from}% center`,
    "--shine-to": `${to}% center`,
    animationDuration: `${cycle}s`,
    animationDirection: yoyo ? "alternate" : "normal",
    animationPlayState: disabled ? "paused" : undefined,
  } as CSSProperties;

  return (
    <span
      className={cx("shiny-text", pauseOnHover && "shiny-text-hover-pause", disabled && "shiny-text-off", className)}
      style={style}
    >
      {text}
    </span>
  );
}
