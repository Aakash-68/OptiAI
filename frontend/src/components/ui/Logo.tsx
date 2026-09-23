"use client";

import Image from "next/image";
import { cx } from "@/lib/format";

/**
 * Aspect ratios of the artwork, so callers can size by height and get a box
 * that is all logo. Both files are cropped to their ink — the PNGs they
 * replaced carried a baked-in background and a wide margin, which is why the
 * mark used to sit in a visible pale box and read smaller than its container.
 */
const LOCKUP_RATIO = 925 / 192;
const MARK_RATIO = 330.5 / 191;

/**
 * The full lockup — mark plus wordmark.
 *
 * It ships as two SVGs that differ only in the wordmark colour (navy on light,
 * white on dark); the mark keeps its gradient in both. Rendering both and
 * letting CSS pick one avoids the flash that swapping `src` on a theme value
 * causes before hydration.
 *
 * `height` is a prop rather than a Tailwind class because a default class plus
 * a caller's override lands two `h-*` utilities on the same element, and the
 * winner is decided by stylesheet order, not attribute order — so the caller
 * silently loses. Driving it from the ratio also keeps the aspect exact.
 */
export function Wordmark({ height = 24, className }: { height?: number; className?: string }) {
  const width = Math.round(height * LOCKUP_RATIO);
  return (
    <span className={cx("relative block shrink-0", className)} style={{ width, height }}>
      <Image
        src="/logo-wordmark-light.svg"
        alt="OptiAI"
        fill
        priority
        unoptimized
        sizes="200px"
        className="object-contain object-left dark:hidden"
      />
      <Image
        src="/logo-wordmark-dark.svg"
        alt=""
        aria-hidden
        fill
        priority
        unoptimized
        sizes="200px"
        className="hidden object-contain object-left dark:block"
      />
    </span>
  );
}

/**
 * The standalone gradient mark, for collapsed rails.
 *
 * `size` is the height; the mark is wider than it is tall, so the width
 * follows from its aspect rather than being forced square.
 */
export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  const width = Math.round(size * MARK_RATIO);
  return (
    <Image
      src="/logo-mark.svg"
      alt="OptiAI"
      width={width}
      height={size}
      priority
      unoptimized
      className={cx("shrink-0 object-contain", className)}
      style={{ width, height: size }}
    />
  );
}
