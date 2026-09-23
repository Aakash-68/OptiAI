"use client";

import { cx } from "@/lib/format";

/**
 * Provider / CLI-tool icon.
 *
 * We deliberately do not bundle third-party brand logos. Instead each provider
 * gets a stable monogram tile whose hue is derived from its id, so the same
 * provider is always the same colour everywhere in the app. A small curated map
 * pins the hues of the providers users see most, so those never drift.
 */
const PINNED_HUES: Record<string, number> = {
  claude: 18,
  "claude-code": 18,
  anthropic: 18,
  codex: 210,
  openai: 162,
  gemini: 222,
  "gemini-cli": 222,
  google: 222,
  cursor: 0,
  github: 260,
  copilot: 260,
  kiro: 276,
  antigravity: 205,
  openrouter: 250,
  opencode: 230,
  cline: 268,
  xai: 240,
  grok: 240,
  "grok-cli": 240,
  kimi: 288,
  deepseek: 232,
  qwen: 296,
  mistral: 28,
  groq: 8,
  nvidia: 96,
  zed: 200,
  windsurf: 172,
  trae: 340,
  iflow: 190,
  kilocode: 140,
  qoder: 320,
};

function hueFor(id: string): number {
  const pinned = PINNED_HUES[id.toLowerCase()];
  if (pinned !== undefined) return pinned;
  // Stable hash -> hue. Same id always lands on the same colour.
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 360;
  return hash;
}

function monogram(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase() || "?";
}

const SIZES = {
  sm: "h-7 w-7 text-[10px] rounded-lg",
  md: "h-9 w-9 text-[11px] rounded-[10px]",
  lg: "h-12 w-12 text-sm rounded-xl",
};

export function ProviderAvatar({
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
  const hue = hueFor(id);
  return (
    <span
      className={cx(
        "grid shrink-0 place-items-center font-bold tracking-tight",
        SIZES[size],
        className
      )}
      style={{
        background: `linear-gradient(140deg, hsl(${hue} 88% 62%), hsl(${(hue + 32) % 360} 82% 52%))`,
        color: "#fff",
      }}
      aria-hidden
    >
      {monogram(name || id)}
    </span>
  );
}
