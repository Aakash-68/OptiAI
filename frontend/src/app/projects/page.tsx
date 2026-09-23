"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Folder, MessageSquare, Pin, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectScopePicker } from "@/components/projects/ProjectScopePicker";
import { useProjects, type Project } from "@/hooks/useProjects";
import { useChatStore } from "@/hooks/useChatStore";
import { cx } from "@/lib/format";

const EMPTY_DRAFT = {
  name: "",
  description: "",
  instructions: "",
  models: [] as string[],
  skills: [] as string[],
  plugins: [] as string[],
};

/**
 * Projects are persistent workspaces: standing instructions, a scoped set of
 * models, and the skills and plugins that should be active inside them.
 *
 * Listed as rows rather than cards — a project is identified by its name and
 * when it was last touched, and rows put both on a shared axis so the list
 * stays scannable well past the point a card grid stops being.
 */
export default function ProjectsPage() {
  const { projects, createProject, updateProject, deleteProject, togglePinned } = useProjects();
  const { threads, createThread, selectThread } = useChatStore();
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...projects];
    if (tab === "pinned") list = list.filter((p) => p.pinned);
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    // Pinned first, then most recently touched.
    return list.sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [projects, tab, query]);

  function startChat(project: Project) {
    const id = createThread({ projectId: project.id, title: `${project.name} — new chat` });
    selectThread(id);
    router.push("/chat");
  }

  function openCreate() {
    setDraft(EMPTY_DRAFT);
    setCreateOpen(true);
  }

  function submitCreate() {
    if (!draft.name.trim()) return;
    createProject({ ...draft, name: draft.name.trim() });
    setCreateOpen(false);
    setDraft(EMPTY_DRAFT);
  }

  const chatCount = (projectId: string) => threads.filter((t) => t.projectId === projectId).length;

  return (
    <div className="mx-auto w-full max-w-[880px] px-6 py-10">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold tracking-tight text-[var(--text)]">
          Projects
        </h1>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects"
              className="w-[240px] rounded-full border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3.5 text-[13px] text-[var(--text)] placeholder:text-[var(--text-subtle)] hover:border-[var(--border-strong)] focus:border-[var(--border-strong)] focus:outline-none"
            />
          </div>
          <button
            onClick={openCreate}
            className="rounded-full bg-[var(--text)] px-5 py-2 text-[13px] font-medium text-[var(--surface)] transition-[filter,transform] duration-150 ease-out hover:brightness-125 active:scale-[0.97]"
          >
            New
          </button>
        </div>
      </div>

      <div className="mb-2">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "all", label: "All" },
            { id: "pinned", label: "Pinned" },
          ]}
        />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<Folder className="h-5 w-5" />}
          title="No projects yet"
          description="A project keeps its own instructions, allowed models and skills, so every chat inside it already knows the context."
          action={
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Create your first project
            </Button>
          }
        />
      ) : (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="pb-2 text-[13px] font-normal text-[var(--text-subtle)]">Name</th>
              <th className="w-[160px] pb-2 text-[13px] font-normal text-[var(--text-subtle)]">
                Modified
              </th>
              <th className="w-[120px] pb-2" />
            </tr>
          </thead>
          <tbody>
            {visible.map((project) => (
              <tr
                key={project.id}
                className="group/row border-t border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                <td className="py-3">
                  <button
                    onClick={() => startChat(project)}
                    className="flex min-w-0 items-center gap-3 text-left"
                    title={`Start a chat in ${project.name}`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                      <Folder className="h-4 w-4 text-[var(--text-muted)]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] text-[var(--text)]">
                        {project.name}
                      </span>
                      <span className="block truncate text-[11.5px] text-[var(--text-subtle)]">
                        {scopeSummary(project, chatCount(project.id))}
                      </span>
                    </span>
                  </button>
                </td>

                <td className="py-3 text-[13px] text-[var(--text-muted)]">
                  {shortDate(project.updatedAt)}
                </td>

                <td className="py-3">
                  <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity duration-150 ease-out focus-within:opacity-100 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100">
                    <IconButton
                      label={project.pinned ? "Unpin project" : "Pin project"}
                      onClick={() => togglePinned(project.id)}
                      active={project.pinned}
                    >
                      <Pin className={cx("h-3.5 w-3.5", project.pinned && "fill-current")} />
                    </IconButton>
                    <IconButton label="Start a chat" onClick={() => startChat(project)}>
                      <MessageSquare className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton label="Project settings" onClick={() => setEditing(project)}>
                      <Settings2 className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton label="Delete project" onClick={() => deleteProject(project.id)} danger>
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}

            {visible.length === 0 && (
              <tr className="border-t border-[var(--border)]">
                <td colSpan={3} className="py-6 text-center text-[13px] text-[var(--text-subtle)]">
                  {tab === "pinned" ? "Nothing pinned yet." : "No projects match that."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New project"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submitCreate} disabled={!draft.name.trim()}>
              Create project
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Input
            label="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Billing service rewrite"
            autoFocus
          />
          <Input
            label="Description"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="What this workspace is for"
          />
          <Field label="Standing instructions">
            <Textarea
              value={draft.instructions}
              onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
              placeholder="Context every chat in this project should start with."
              rows={3}
            />
          </Field>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[var(--text)]">
              What this project can use
            </p>
            <ProjectScopePicker
              models={draft.models}
              skills={draft.skills}
              plugins={draft.plugins}
              onChange={(patch) => setDraft({ ...draft, ...patch })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `${editing.name} settings` : ""}
        footer={
          <Button variant="primary" onClick={() => setEditing(null)}>
            Done
          </Button>
        }
      >
        {editing && (
          <div className="space-y-3.5">
            <Input
              label="Name"
              value={editing.name}
              onChange={(e) => {
                updateProject(editing.id, { name: e.target.value });
                setEditing({ ...editing, name: e.target.value });
              }}
            />
            <Field label="Standing instructions">
              <Textarea
                value={editing.instructions}
                rows={3}
                onChange={(e) => {
                  updateProject(editing.id, { instructions: e.target.value });
                  setEditing({ ...editing, instructions: e.target.value });
                }}
              />
            </Field>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[var(--text)]">
                What this project can use
              </p>
              <ProjectScopePicker
                models={editing.models || []}
                skills={editing.skills || []}
                plugins={editing.plugins || []}
                onChange={(patch) => {
                  updateProject(editing.id, patch);
                  setEditing({ ...editing, ...patch });
                }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** `Textarea` is unlabelled by design; projects needs labels, so wrap it. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">{label}</span>
      {children}
    </label>
  );
}

/** "3 models · 2 skills · 4 chats" — empty scopes are left out, not zeroed. */
function scopeSummary(project: Project, chats: number): string {
  const parts: string[] = [];
  const models = project.models?.length || 0;
  const skills = project.skills?.length || 0;
  const plugins = project.plugins?.length || 0;

  parts.push(models ? `${models} model${models === 1 ? "" : "s"}` : "any model");
  if (skills) parts.push(`${skills} skill${skills === 1 ? "" : "s"}`);
  if (plugins) parts.push(`${plugins} plugin${plugins === 1 ? "" : "s"}`);
  if (chats) parts.push(`${chats} chat${chats === 1 ? "" : "s"}`);

  return parts.join(" · ");
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function IconButton({
  label,
  onClick,
  children,
  danger,
  active,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cx(
        "grid h-7 w-7 place-items-center rounded-md transition-colors active:scale-[0.94]",
        active
          ? "text-[var(--brand)]"
          : danger
            ? "text-[var(--text-subtle)] hover:bg-[var(--surface)] hover:text-err-500"
            : "text-[var(--text-subtle)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
      )}
    >
      {children}
    </button>
  );
}
