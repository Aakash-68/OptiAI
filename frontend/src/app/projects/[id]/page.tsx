"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  FileText,
  Folder,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pin,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonRows } from "@/components/ui/Skeleton";
import { ProjectSettingsModal } from "@/components/projects/ProjectSettingsModal";
import { useProjects, MAX_PROJECT_FILE_BYTES } from "@/hooks/useProjects";
import { useChatStore } from "@/hooks/useChatStore";
import { useSkills } from "@/hooks/useSkills";
import { isTextFile } from "@/lib/attachments";
import { stashPendingPrompt } from "@/lib/pendingPrompt";
import { cx } from "@/lib/format";
import type { ChatThread } from "@/lib/types";

/**
 * One project: its chats, its sources, and a box to start a new chat inside
 * it. The layout follows the project view people know from Claude — name up
 * top, composer under it, then Chats / Sources — because a workspace should
 * feel like a place you go to, not a row in a settings table.
 */
export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { projects, hydrated, updateProject, deleteProject, togglePinned, addFile, removeFile } = useProjects();
  const { threads, hydrated: threadsHydrated, createThread, selectThread, deleteThread } = useChatStore();
  const library = useSkills();

  const project = useMemo(() => projects.find((p) => p.id === params.id) || null, [projects, params.id]);
  const chats = useMemo(
    () =>
      threads
        .filter((t) => t.projectId === params.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [threads, params.id]
  );

  const [tab, setTab] = useState("chats");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  if (!hydrated || !threadsHydrated) {
    return (
      <div className="mx-auto w-full max-w-[880px] px-6 py-10">
        <Skeleton className="h-3 w-20" />
        <div className="mt-5 flex items-center gap-3">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-8 w-[40%]" />
        </div>
        <Skeleton delay={40} className="mt-6 h-14 w-full rounded-full" />
        <div className="mt-8 flex gap-2">
          <Skeleton delay={80} className="h-9 w-20 rounded-full" />
          <Skeleton delay={80} className="h-9 w-24 rounded-full" />
        </div>
        <SkeletonRows count={5} leading="none" trailing={1} height="h-[72px]" className="mt-4" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto w-full max-w-[880px] px-6 py-10">
        <BackLink />
        <EmptyState
          icon={<Folder className="h-5 w-5" />}
          title="This project no longer exists"
          description="It may have been deleted, or the link is from another browser. Projects live in this browser's storage."
          action={
            <Link href="/projects">
              <Button variant="primary">All projects</Button>
            </Link>
          }
        />
      </div>
    );
  }

  function openChat(id: string) {
    selectThread(id);
    router.push("/chat");
  }

  function startChat(text?: string) {
    if (!project) return;
    const id = createThread({ projectId: project.id, title: `${project.name} — new chat` });
    const clean = (text || "").trim();
    if (clean) stashPendingPrompt({ threadId: id, text: clean });
    setDraft("");
    openChat(id);
  }

  async function addFiles(list: FileList) {
    if (!project) return;
    setFileError(null);
    for (const file of Array.from(list)) {
      if (!isTextFile(file)) {
        setFileError(`${file.name}: only text, Markdown and code files can be project sources.`);
        continue;
      }
      if (file.size > MAX_PROJECT_FILE_BYTES) {
        setFileError(`${file.name} is over ${Math.round(MAX_PROJECT_FILE_BYTES / 1024)} KB. Trim it or attach it to one chat instead.`);
        continue;
      }
      addFile(project.id, { name: file.name, size: file.size, content: await file.text() });
    }
  }

  const skillNames = [...(project.skills || []), ...(project.plugins || [])]
    .map((id) => library.skills.find((s) => s.id === id)?.name || id);

  return (
    <div className="mx-auto w-full max-w-[880px] px-6 py-8">
      <BackLink />

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
            style={{ background: `${project.color}1f`, color: project.color }}
          >
            <Folder className="h-4.5 w-4.5" />
          </span>
          <h1 className="truncate font-display text-[26px] font-bold tracking-tight text-[var(--text)]">
            {project.name}
          </h1>
          {project.pinned && <Pin className="h-3.5 w-3.5 shrink-0 fill-current text-[var(--brand)]" />}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" icon={<Settings2 className="h-3.5 w-3.5" />} onClick={() => setSettingsOpen(true)}>
            Settings
          </Button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="More"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-8 w-8 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="animate-in absolute right-0 top-full z-30 mt-1 w-[200px] rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1 shadow-[var(--shadow-lg)]"
              >
                <MenuItem
                  icon={<Pin className={cx("h-3.5 w-3.5", project.pinned && "fill-current")} />}
                  onClick={() => {
                    togglePinned(project.id);
                    setMenuOpen(false);
                  }}
                >
                  {project.pinned ? "Unpin project" : "Pin project"}
                </MenuItem>
                <MenuItem
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  danger
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                >
                  Delete project
                </MenuItem>
              </div>
            )}
          </div>
        </div>
      </div>

      {project.description && (
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--text-muted)]">{project.description}</p>
      )}

      {/* New chat box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startChat(draft);
        }}
        className="mt-6 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-2 pl-3 pr-2 shadow-[var(--shadow-md)] transition-colors focus-within:border-[var(--border-strong)]"
      >
        <button
          type="button"
          title="Open an empty chat in this project"
          aria-label="Open an empty chat"
          onClick={() => startChat()}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        >
          <Plus className="h-4.5 w-4.5" />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`New chat in ${project.name}`}
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-[14.5px] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Start chat"
          title={draft.trim() ? "Start a chat with this message" : "Type a message, or use + for an empty chat"}
          className={cx(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all duration-150 ease-out active:scale-[0.94]",
            draft.trim()
              ? "bg-[var(--brand)] text-white hover:brightness-110"
              : "bg-[var(--surface-sunken)] text-[var(--text-subtle)]"
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>

      {/* Context summary */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[12px] text-[var(--text-subtle)]">
        <span>{project.models?.length ? `${project.models.length} allowed model${project.models.length === 1 ? "" : "s"}` : "Any connected model"}</span>
        {skillNames.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[var(--brand)]" />
            {skillNames.join(", ")}
          </span>
        )}
        {project.files?.length > 0 && <span>{project.files.length} source{project.files.length === 1 ? "" : "s"} in context</span>}
        {project.instructions.trim() && <span>Standing instructions on</span>}
      </div>

      {/* Tabs */}
      <div className="mt-7">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "chats", label: "Chats", count: chats.length },
            { id: "sources", label: "Sources", count: (project.files?.length || 0) + (project.instructions.trim() ? 1 : 0) },
          ]}
        />
      </div>

      {tab === "chats" ? (
        chats.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<MessageSquare className="h-5 w-5" />}
              title="No chats in this project yet"
              description="Type a message above to start one. Every chat here inherits the project's instructions, sources, models and skills."
            />
          </div>
        ) : (
          <ul className="mt-3">
            {chats.map((thread) => (
              <ChatRow key={thread.id} thread={thread} onOpen={() => openChat(thread.id)} onDelete={() => deleteThread(thread.id)} />
            ))}
          </ul>
        )
      ) : (
        <div className="mt-5 space-y-5">
          {/* Instructions */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-[14px] font-semibold text-[var(--text)]">Standing instructions</p>
                <p className="mt-0.5 text-[12px] text-[var(--text-subtle)]">Sent as system context with every chat in this project.</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setSettingsOpen(true)}>
                Edit
              </Button>
            </div>
            {project.instructions.trim() ? (
              <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--text-muted)]">{project.instructions}</p>
            ) : (
              <p className="mt-3 text-[13px] italic text-[var(--text-subtle)]">None yet.</p>
            )}
          </section>

          {/* Files */}
          <section
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-[14px] font-semibold text-[var(--text)]">Files</p>
                <p className="mt-0.5 text-[12px] text-[var(--text-subtle)]">
                  Text, Markdown and code up to {Math.round(MAX_PROJECT_FILE_BYTES / 1024)} KB each. Their contents ride along with every chat here. Drop files or
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files?.length) void addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button size="sm" variant="secondary" icon={<Paperclip className="h-3.5 w-3.5" />} onClick={() => fileRef.current?.click()}>
                Add files
              </Button>
            </div>
            {fileError && <p className="mt-3 text-[12.5px] text-err-700 dark:text-err-500">{fileError}</p>}
            {project.files?.length ? (
              <ul className="mt-3 divide-y divide-[var(--border)]">
                {project.files.map((f) => (
                  <li key={f.id} className="group/file flex items-center gap-3 py-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--surface-sunken)] text-[var(--text-subtle)]">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] text-[var(--text)]">{f.name}</p>
                      <p className="text-[11.5px] text-[var(--text-subtle)]">
                        {formatBytes(f.size)} · added {shortDate(f.addedAt)}
                        {!f.content && " · metadata only (added before contents were kept)"}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => removeFile(project.id, f.id)}
                      className="grid h-7 w-7 place-items-center rounded-md text-[var(--text-subtle)] opacity-0 transition-opacity hover:text-err-500 group-hover/file:opacity-100 focus:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] italic text-[var(--text-subtle)]">No files yet.</p>
            )}
          </section>
        </div>
      )}

      {settingsOpen && <ProjectSettingsModal project={project} onClose={() => setSettingsOpen(false)} onChange={updateProject} />}

      {confirmDelete && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" onClick={() => setConfirmDelete(false)}>
          <div
            role="dialog"
            aria-modal
            onClick={(e) => e.stopPropagation()}
            className="animate-in w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-lg)]"
          >
            <p className="font-display text-[15px] font-semibold text-[var(--text)]">Delete “{project.name}”?</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">
              The project, its instructions and its {project.files?.length || 0} source file{project.files?.length === 1 ? "" : "s"} are removed.
              Its {chats.length} chat{chats.length === 1 ? "" : "s"} stay in Chat, without the project context.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  deleteProject(project.id);
                  router.push("/projects");
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -- Pieces ---------------------------------------------------------------- */

function BackLink() {
  return (
    <Link
      href="/projects"
      className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--text-subtle)] transition-colors hover:text-[var(--text)]"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      All projects
    </Link>
  );
}

function ChatRow({ thread, onOpen, onDelete }: { thread: ChatThread; onOpen: () => void; onDelete: () => void }) {
  const firstUser = thread.messages.find((m) => m.role === "user");
  const last = thread.messages[thread.messages.length - 1];
  const snippet = (firstUser?.content || last?.content || "").replace(/\s+/g, " ").trim();
  return (
    <li className="group/chat relative border-b border-[var(--border)] last:border-b-0">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start gap-4 rounded-lg px-2 py-3.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[var(--text)]">{thread.title}</p>
          <p className="mt-0.5 truncate text-[13px] text-[var(--text-muted)]">
            {snippet || <span className="italic text-[var(--text-subtle)]">Empty chat</span>}
          </p>
        </div>
        <span className="shrink-0 pt-0.5 text-[12.5px] text-[var(--text-subtle)] group-hover/chat:opacity-0">{shortDate(thread.updatedAt)}</span>
      </button>
      <button
        type="button"
        aria-label={`Delete ${thread.title}`}
        onClick={onDelete}
        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[var(--text-subtle)] opacity-0 transition-opacity hover:bg-[var(--surface)] hover:text-err-500 focus:opacity-100 group-hover/chat:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

function MenuItem({ icon, children, onClick, danger }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-[var(--surface-hover)]",
        danger ? "text-err-700 dark:text-err-500" : "text-[var(--text)]"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
