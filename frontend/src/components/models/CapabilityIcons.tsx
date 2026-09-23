"use client";

import { FileText, Image as ImageIcon, AudioLines, Wand2 } from "lucide-react";
import { CAPABILITY_LABEL, factsFor, type Capability } from "@/lib/catalog/modelFacts";
import { cx } from "@/lib/format";

const ORDER: Capability[] = ["docs", "vision", "audio", "imagegen"];

const GLYPH: Record<Capability, typeof FileText> = {
  docs: FileText,
  vision: ImageIcon,
  audio: AudioLines,
  imagegen: Wand2,
};

const SHORT: Record<Capability, string> = {
  docs: "Documents",
  vision: "Image input",
  audio: "Audio",
  imagegen: "Image output",
};

/**
 * What a model can take in and hand back, as four squares.
 *
 * Every model shows all four, always in the same order, so the row reads as a
 * fixed set of answers rather than a variable-length list — you can compare
 * two models by looking at the same position twice. Supported lights in the
 * brand gradient; unsupported stays a flat grey outline rather than
 * disappearing, because "this model cannot do that" is information.
 *
 * Capabilities are derived from the model id in `modelFacts`, not reported by
 * the provider — the catalog carries no capability field at all. The tooltip
 * says which model it is talking about so a wrong guess is reportable.
 */
export function CapabilityIcons({
  id,
  name,
  size = "md",
  className,
}: {
  id: string;
  name?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const caps = factsFor(id, name).caps;
  const box = size === "sm" ? "h-5 w-5 rounded-[5px]" : "h-6 w-6 rounded-md";
  const glyph = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <div className={cx("flex items-center gap-1", className)}>
      {ORDER.map((cap) => {
        const on = caps.includes(cap);
        const Glyph = GLYPH[cap];
        return (
          <span
            key={cap}
            title={`${SHORT[cap]} — ${on ? CAPABILITY_LABEL[cap].on : CAPABILITY_LABEL[cap].off}`}
            aria-label={`${SHORT[cap]}: ${on ? "supported" : "not supported"}`}
            className={cx(
              "grid shrink-0 place-items-center transition-opacity",
              box,
              on
                ? "grad-logo text-white"
                : "border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--text-subtle)] opacity-60"
            )}
          >
            <Glyph className={glyph} />
          </span>
        );
      })}
    </div>
  );
}

/**
 * The union of what a provider's models can do.
 *
 * A provider is "capable" of something if any of its models is — the icon
 * answers "is there anything here that reads images", which is the question
 * you have on a provider list.
 */
export function ProviderCapabilityIcons({
  models,
  className,
}: {
  models: { id: string; name?: string }[];
  className?: string;
}) {
  const union = new Set<Capability>();
  for (const m of models) for (const c of factsFor(m.id, m.name).caps) union.add(c);

  return (
    <div className={cx("flex items-center gap-1", className)}>
      {ORDER.map((cap) => {
        const on = union.has(cap);
        const Glyph = GLYPH[cap];
        return (
          <span
            key={cap}
            title={
              on
                ? `${SHORT[cap]} — at least one model here supports it`
                : `${SHORT[cap]} — no model here supports it`
            }
            aria-label={`${SHORT[cap]}: ${on ? "available" : "unavailable"}`}
            className={cx(
              "grid h-5 w-5 shrink-0 place-items-center rounded-[5px]",
              on
                ? "grad-logo text-white"
                : "border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--text-subtle)] opacity-60"
            )}
          >
            <Glyph className="h-2.5 w-2.5" />
          </span>
        );
      })}
    </div>
  );
}
