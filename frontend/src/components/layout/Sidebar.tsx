"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { NAV_ITEMS, TOOL_ITEMS, TOP_ITEMS, type NavItem } from "@/lib/nav";
import { cx } from "@/lib/format";
import { useChatStore } from "@/hooks/useChatStore";
import { useStreams } from "@/hooks/useStreams";
import { useSplitView } from "@/hooks/useSplitView";
import { LogoMark, Wordmark } from "@/components/ui/Logo";
import { ShinyText } from "@/components/ui/ShinyText";

const ROW =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] font-medium " +
  "transition-[background-color,color] duration-150 ease-out active:scale-[0.985]";

/**
 * Primary navigation.
 *
 * Chat and Projects sit at the top level; the four read-and-configure tabs
 * fold into "OptiAI tools" so the rail opens short. A rule separates all of
 * that from Recents — tools and conversations are different kinds of thing
 * and shouldn't read as one list.
 *
 * The selected row takes a soft brand tint and eases in from 2px left, which
 * is enough to confirm the click without the rail appearing to jump. Nav is
 * clicked a handful of times a session, so a little motion is affordable
 * here in a way it would not be on something pressed constantly.
 */
export function Sidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { threads, activeId, selectThread, createThread, deleteThread } = useChatStore();
  const { isStreaming } = useStreams();
  // Every row here can be picked up and dropped on the content area to open
  // it beside the current page — see AppShell for the landing side.
  const { dragHandlers } = useSplitView();

  const isTool = TOOL_ITEMS.some((i) => pathname.startsWith(i.href));
  const [toolsOpen, setToolsOpen] = useState(isTool);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Opening search should land the caret in the field without a second click.
  useEffect(() => {
    if (searching) searchRef.current?.focus();
  }, [searching]);

  // Landing on a tool page is reason enough to unfold the group.
  useEffect(() => {
    if (isTool) setToolsOpen(true);
  }, [isTool]);

  const recents = useMemo(() => {
    const sorted = [...threads].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const q = query.trim().toLowerCase();
    return q ? sorted.filter((t) => t.title.toLowerCase().includes(q)) : sorted;
  }, [threads, query]);

  function startThread() {
    const id = createThread();
    selectThread(id);
    router.push("/chat");
  }

  if (collapsed) {
    return (
      <nav className="flex h-full w-[60px] shrink-0 flex-col items-center gap-1 border-r border-[var(--border)] bg-[var(--surface)] py-3">
        <button
          onClick={onToggleCollapsed}
          aria-label="Expand sidebar"
          className="mb-1 grid h-9 w-9 place-items-center rounded-lg text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        >
          <PanelLeftOpen className="h-4.5 w-4.5" />
        </button>

        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              {...dragHandlers({ kind: "route", href: item.href, label: item.label })}
              className={cx(
                "grid h-9 w-9 place-items-center rounded-lg transition-colors active:scale-[0.96]",
                active
                  ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                  : "text-[var(--text-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              )}
            >
              <Icon className="h-4.5 w-4.5" />
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex h-full w-[248px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      {/* Brand strip: lockup left, search + collapse right. Matches topbar height. */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-3.5">
        <Link href="/chat" aria-label="OptiAI home" className="flex items-center">
          <Wordmark height={20} />
        </Link>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => {
              setSearching((v) => !v);
              setQuery("");
            }}
            aria-label={searching ? "Close search" : "Search chats"}
            aria-expanded={searching}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            {searching ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </button>
          <button
            onClick={onToggleCollapsed}
            aria-label="Collapse sidebar"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            <PanelLeftClose className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {searching && (
        <div className="px-2.5 pb-2">
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearching(false);
                setQuery("");
              }
            }}
            placeholder="Search chats…"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-2.5 py-1.5 text-[12.5px] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:border-[var(--border-strong)] focus:outline-none"
          />
        </div>
      )}

      <div className="shrink-0 px-2.5">
        <ul className="space-y-0.5">
          {TOP_ITEMS.slice(0, 2).map((item) => (
            <NavRow key={item.href} item={item} pathname={pathname} drag={dragHandlers} />
          ))}

          <li>
            <button
              onClick={() => setToolsOpen((v) => !v)}
              aria-expanded={toolsOpen}
              className={cx(
                ROW,
                "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              )}
            >
              {/* The mark, not a wrench: this group is OptiAI itself. */}
              <LogoMark size={13} className="shrink-0" />
              <span className="flex-1 text-left">
                <ShinyText
                  text="OptiAI tools"
                  speed={2.7}
                  delay={1.2}
                  color="var(--text-muted)"
                  shineColor="#9863f4"
                  spread={145}
                  pauseOnHover
                />
              </span>
              <ChevronRight
                className={cx(
                  "h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out",
                  toolsOpen && "rotate-90"
                )}
              />
            </button>
          </li>

          {toolsOpen &&
            TOOL_ITEMS.map((item) => (
              <NavRow key={item.href} item={item} pathname={pathname} indent drag={dragHandlers} />
            ))}

          {TOP_ITEMS.slice(2).map((item) => (
            <NavRow key={item.href} item={item} pathname={pathname} drag={dragHandlers} />
          ))}
        </ul>

        {/* Tools above, conversations below — different kinds of thing. */}
        <hr className="my-3 border-0 border-t border-[var(--border)]" />

        <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
          Recents
        </p>

        {/*
         * New chat sits above the thread list, not after it. Below the list it
         * was pushed off-screen as soon as the history got long — the one
         * control you always want was the first to become unreachable.
         */}
        <button
          onClick={startThread}
          className={cx(
            ROW,
            "mb-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          )}
        >
          <Plus className="h-4.5 w-4.5 shrink-0" />
          New chat
        </button>
      </div>

      {/* Only the history scrolls, so the rail above it never moves. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">
        {recents.length === 0 ? (
          <p className="px-2.5 py-1 text-[12.5px] leading-snug text-[var(--text-subtle)]">
            {query.trim() ? "No chats match that." : "No chats yet — start one above."}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {recents.map((thread) => (
              <li key={thread.id} className="group/thread relative">
                <button
                  onClick={() => {
                    selectThread(thread.id);
                    router.push("/chat");
                  }}
                  {...dragHandlers({ kind: "thread", threadId: thread.id, title: thread.title })}
                  className={cx(
                    "w-full truncate rounded-lg py-[7px] pl-2.5 pr-7 text-left text-[13px] transition-colors active:scale-[0.985]",
                    activeId === thread.id
                      ? "nav-select bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                  )}
                >
                  {thread.title}
                </button>
                {/*
                 * Several chats can generate at once now, so the rail has to
                 * say which ones are still working - otherwise you leave one
                 * running and forget it. Sits left of the delete control and
                 * yields to it on hover.
                 */}
                {isStreaming(thread.id) && (
                  <span
                    title="Still generating"
                    className="think-pulse pointer-events-none absolute right-2 top-1/2 h-[6px] w-[6px] -translate-y-1/2 rounded-full bg-[var(--brand)] group-hover/thread:opacity-0"
                  />
                )}
                <button
                  onClick={() => deleteThread(thread.id)}
                  aria-label={`Delete ${thread.title}`}
                  className="absolute right-1 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-[var(--text-subtle)] opacity-0 transition-opacity hover:text-err-500 group-hover/thread:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
}

function NavRow({
  item,
  pathname,
  indent,
  drag,
}: {
  item: NavItem;
  pathname: string;
  indent?: boolean;
  drag?: ReturnType<typeof useSplitView>["dragHandlers"];
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        {...(drag ? drag({ kind: "route", href: item.href, label: item.label }) : {})}
        className={cx(
          ROW,
          indent && "pl-7",
          active
            ? "nav-select bg-[var(--brand-soft)] text-[var(--brand)]"
            : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        )}
      >
        <Icon className="h-4.5 w-4.5 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    </li>
  );
}
