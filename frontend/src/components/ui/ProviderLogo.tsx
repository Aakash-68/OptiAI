"use client";

import { useState } from "react";
import Image from "next/image";
import { ProviderAvatar } from "./ProviderAvatar";
import { cx } from "@/lib/format";

/**
 * Provider brand mark.
 *
 * Logos are vendored from `@lobehub/icons-static-svg` into /public/providers at
 * setup time rather than hot-linked from a CDN — a local-first tool should not
 * tell a third party which model vendors you are looking at.
 *
 * Several marks (OpenAI, xAI, Groq, OpenRouter) are monochrome black, so the
 * tile is always light. That is also how these brands expect to be shown.
 * Anything without a vendored file falls back to the generated monogram.
 */
const SIZES = {
  sm: { box: "h-7 w-7 rounded-lg", px: 16 },
  md: { box: "h-10 w-10 rounded-xl", px: 22 },
  lg: { box: "h-14 w-14 rounded-2xl", px: 30 },
};

export function ProviderLogo({
  id,
  name,
  size = "md",
  className,
}: {
  id: string;
  name?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const dims = SIZES[size];

  if (failed) {
    return <ProviderAvatar id={id} name={name} size={size} className={className} />;
  }

  return (
    <span
      className={cx(
        "grid shrink-0 place-items-center border border-ink-200/70 bg-white",
        dims.box,
        className
      )}
    >
      <Image
        src={`/providers/${id}.svg`}
        alt={name || id}
        width={dims.px}
        height={dims.px}
        onError={() => setFailed(true)}
        className="object-contain"
        style={{ width: dims.px, height: dims.px }}
        unoptimized
      />
    </span>
  );
}
