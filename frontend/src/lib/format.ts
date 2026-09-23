/** Shared formatters. Keep display logic here so tables and charts agree. */

export function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "0";
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

/** 1_250_000 -> "1.25M". Used in chart axes and stat tiles. */
export function compactNumber(n: number | undefined | null): string {
  if (!n) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

/**
 * Cost is shown with enough precision to stay honest at small volumes — a
 * $0.0004 request should not render as "$0.00".
 */
export function formatCost(n: number | undefined | null): string {
  if (!n) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

export function formatPricePerM(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—";
  if (n === 0) return "Free";
  return `$${n < 1 ? n.toFixed(2) : n.toFixed(2)}`;
}

export function formatContext(n: number | undefined | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

export function formatRelativeTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 90) return "1m ago";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(iso).toLocaleDateString();
}

export function formatLatency(ms: number | undefined | null): string {
  if (!ms && ms !== 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Splits "openrouter/google/gemma-4-26b" into a short label for dense tables. */
export function shortModelName(id: string | undefined | null): string {
  if (!id) return "—";
  const parts = id.split("/");
  return parts[parts.length - 1];
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
