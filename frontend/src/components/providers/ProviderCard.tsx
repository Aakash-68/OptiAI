"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, TriangleAlert } from "lucide-react";
import { ProviderLogo } from "@/components/ui/ProviderLogo";
import { Button } from "@/components/ui/Button";
import { ProviderCapabilityIcons } from "@/components/models/CapabilityIcons";
import type { Provider } from "@/lib/types";

/**
 * Provider card.
 *
 * Deliberately spare: mark, name, one line of description, and two actions.
 * No badge row, no stat chips — the detail page carries all of that, and a grid
 * of 15 cards reads far faster without them.
 */
export function ProviderCard({
  provider,
  models = [],
  onConnect,
}: {
  provider: Provider;
  /** This provider's models, for the capability row. */
  models?: { id: string; name?: string }[];
  onConnect: (provider: Provider) => void;
}) {
  const router = useRouter();
  const connected = provider.connections > 0;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all duration-200 hover:border-[var(--brand-soft-border)] hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-3">
        <ProviderLogo id={provider.id} name={provider.name} size="md" />

        <div className="flex items-center gap-1.5">
          {/* Subscription-session providers get a marker before you click in. */}
          {provider.riskNotice && (
            <span
              title={provider.riskNotice}
              className="inline-flex items-center gap-1 rounded-full bg-warn-50 px-2 py-1 text-[11px] font-semibold text-warn-700 dark:bg-warn-500/12 dark:text-warn-500"
            >
              <TriangleAlert className="h-3 w-3" />
              At your own risk
            </span>
          )}
          {provider.noAuth ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-ok-50 px-2 py-1 text-[11px] font-semibold text-ok-700 dark:bg-ok-500/12 dark:text-ok-500">
              <Check className="h-3 w-3" />
              No setup needed
            </span>
          ) : (
            connected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ok-50 px-2 py-1 text-[11px] font-semibold text-ok-700 dark:bg-ok-500/12 dark:text-ok-500">
                <Check className="h-3 w-3" />
                {provider.connections} connected
              </span>
            )
          )}
        </div>
      </div>

      <h3 className="font-display mt-4 text-[16px] font-bold tracking-tight text-[var(--text)]">
        {provider.name}
      </h3>

      <p className="mt-1.5 line-clamp-2 flex-1 text-[13px] leading-relaxed text-[var(--text-subtle)]">
        {provider.tagline}
      </p>

      {/* What you can send anything here at all, before you click in. */}
      {models.length > 0 && <ProviderCapabilityIcons models={models} className="mt-3" />}

      <div className="mt-5 flex items-center gap-2">
        {provider.noAuth ? (
          // Nothing to connect — the only useful action is opening the model list.
          <Link href={`/providers/${provider.id}`} className="flex-1">
            <Button variant="primary" className="w-full justify-center">
              Browse models
            </Button>
          </Link>
        ) : (
          <>
            <Link href={`/providers/${provider.id}`} className="flex-1">
              <Button variant="secondary" className="w-full justify-center">
                Open
              </Button>
            </Link>
            <Button
              variant="primary"
              className="flex-1 justify-center"
              onClick={() => {
                if (connected) router.push(`/providers/${provider.id}`);
                else onConnect(provider);
              }}
            >
              {connected ? "Manage" : "Connect"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
