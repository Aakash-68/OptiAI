"use client";

import Image from "next/image";
import { cx } from "@/lib/format";

/**
 * Brand mark for a CLI tool.
 *
 * Real logos where we have one we can stand behind: monochrome marks from
 * simple-icons (CC0-1.0), bundled in `public/cli/` and tinted with the tool's
 * own colour from the backend constants. Trademarks stay with their owners;
 * these identify an integration, which is what they are for.
 *
 * Everything else keeps a monogram tile — but coloured from the same declared
 * brand colour, so an unbundled tool still looks deliberate next to a bundled
 * one. Shipping a wrong logo is worse than shipping no logo: simple-icons has
 * a "Hermes" and an "AMP", and neither is the Hermes Agent or Amp CLI here.
 */
const LOGOS: Record<string, string> = {
  claude: "/cli/claude.svg",
  cowork: "/cli/claude.svg",
  codex: "/cli/openai.svg",
  copilot: "/cli/githubcopilot.svg",
  cursor: "/cli/cursor.svg",
  cline: "/cli/cline.svg",
  opencode: "/cli/opencode.svg",
  qwen: "/cli/qwen.svg",
};

const SIZES = {
  sm: { box: "h-8 w-8 rounded-lg", glyph: 16, text: "text-[11px]" },
  md: { box: "h-11 w-11 rounded-xl", glyph: 22, text: "text-[14px]" },
} as const;

export function CliToolLogo({
  id,
  name,
  color,
  size = "md",
  className,
}: {
  id: string;
  name: string;
  color?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const logo = LOGOS[id];
  const s = SIZES[size];
  const brand = color || "#6b5bfc";

  return (
    <span
      className={cx(
        "grid shrink-0 place-items-center border border-[var(--border)] bg-[var(--surface-sunken)]",
        s.box,
        className
      )}
      style={logo ? undefined : { backgroundColor: `${brand}1f`, borderColor: `${brand}33` }}
    >
      {logo ? (
        <Image
          src={logo}
          alt=""
          aria-hidden
          width={s.glyph}
          height={s.glyph}
          unoptimized
          style={{ width: s.glyph, height: s.glyph }}
        />
      ) : (
        <span className={cx("font-display font-bold", s.text)} style={{ color: brand }}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}

/** "Factory Droid" → "FD", "Roo" → "Ro". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] || "?").slice(0, 2).toUpperCase();
}
