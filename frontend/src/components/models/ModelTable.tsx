"use client";

import { ProviderLogo } from "@/components/ui/ProviderLogo";
import { CapabilityIcons } from "@/components/models/CapabilityIcons";
import { factsFor, formatRate } from "@/lib/catalog/modelFacts";
import { cx, formatContext } from "@/lib/format";
import type { CatalogModel } from "@/hooks/useModelCatalog";

/**
 * The model catalog as one table.
 *
 * Cards put every model in its own box, which made the thing you actually do
 * here — compare rates across models — impossible: prices never lined up in a
 * column. Rows share an axis, so the cheap ones are visible by scanning down.
 *
 * `connected` is the provider's live credential state, not a guess from the
 * id. Disconnected rows stay legible but sit back, because a model you cannot
 * reach is still worth comparing against.
 */
export function ModelTable({ models }: { models: CatalogModel[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <Th className="pl-1">Model</Th>
            <Th>Connection status</Th>
            <Th className="text-right">Input / 1M tokens</Th>
            <Th className="text-right">Output / 1M tokens</Th>
            <Th>Handles</Th>
            <Th>Tags</Th>
          </tr>
        </thead>
        <tbody>
          {models.map((model) => {
            const facts = factsFor(model.id, model.name);
            return (
              <tr
                key={`${model.providerId}-${model.id}`}
                className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--surface-hover)]"
              >
                <td className="py-2.5 pl-1 pr-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ProviderLogo id={model.providerId} name={model.providerName} size="sm" />
                    <div className="min-w-0">
                      <p
                        className="truncate text-[13.5px] font-medium text-[var(--text)]"
                        title={model.id}
                      >
                        {model.name || model.id}
                      </p>
                      <p className="truncate text-[11.5px] text-[var(--text-subtle)]">
                        {model.providerName}
                        {model.contextLength ? ` · ${formatContext(model.contextLength)}` : ""}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="py-2.5 pr-3">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-[var(--text-muted)]">
                    <span
                      aria-hidden
                      className={cx(
                        "h-[7px] w-[7px] shrink-0 rounded-full",
                        model.connected ? "bg-ok-500" : "bg-err-500"
                      )}
                    />
                    {model.connected ? "Connected" : "Disconnected"}
                  </span>
                </td>

                <td className="py-2.5 pr-3 text-right font-mono text-[12.5px] tabular-nums text-[var(--text-muted)]">
                  {formatRate(facts.input)}
                </td>
                <td className="py-2.5 pr-3 text-right font-mono text-[12.5px] tabular-nums text-[var(--text-muted)]">
                  {formatRate(facts.output)}
                </td>

                <td className="py-2.5 pr-3">
                  <CapabilityIcons id={model.id} name={model.name} size="sm" />
                </td>

                <td className="py-2.5 pr-1">
                  <div className="flex flex-wrap gap-1">
                    {facts.tags.map((tag) => (
                      <span
                        key={tag}
                        className="whitespace-nowrap rounded-md bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[11px] text-[var(--text-muted)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--text-subtle)]">
        Rates are published list prices per 1M tokens, shown for comparison. An em dash means
        OptiAI has no rate on file for that model. What you were actually charged is on Usage,
        recorded per request.
      </p>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cx(
        "pb-2 pr-3 text-[12px] font-medium text-[var(--text-subtle)]",
        className
      )}
    >
      {children}
    </th>
  );
}
