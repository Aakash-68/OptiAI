"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Folder, MessageSquare, Pin, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { aiOptify } from "@/lib/api";
import { useModelCatalog } from "@/hooks/useModelCatalog";
import { useSkills } from "@/hooks/useSkills";
import { shortModelName } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectScopePicker } from "@/components/projects/ProjectScopePicker";
import { ProjectSettingsModal } from "@/components/projects/ProjectSettingsModal";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const catalog = useModelCatalog();
  const library = useSkills();
  const [optifying, setOptifying] = useState(false);
  const [optifyNote, setOptifyNote] = useState<string | null>(null);

  /**
   * OptiFy: the title and description go to a connected model along with
   * the connected catalog and the skill library, and it picks the scope.
   * Applies straight into the picker so the choice can still be edited.
   */
  async function optify(
    title: string,
    description: string,
    apply: (patch: { models: string[]; skills: string[]; plugins: string[] }) => void
  ) {
    setOptifying(true);
    setOptifyNote(null);
    try {
      const out = await aiOptify({
        title,
        description,
        models: catalog.models
          .filter((m) => m.connected)
          .map((m) => ({ id: m.id, name: m.name, provider: m.providerName })),
        skills: library.skills.map((s) => ({ id: s.id, name: s.name, kind: s.kind, summary: s.summary })),
      });
      apply({ models: out.models, skills: out.skills, plugins: out.plugins });
      setOptifyNote(
        `${shortModelName(out.model)} picked ${out.models.length} model${out.models.length === 1 ? "" : "s"}, ${out.skills.length} skill${out.skills.length === 1 ? "" : "s"} and ${out.plugins.length} plugin${out.plugins.length === 1 ? "" : "s"}.${out.reason ? ` ${out.reason}` : ""}`
      );
    } catch (err) {
      setOptifyNote(err instanceof Error ? err.message : "OptiFy failed");
    } finally {
      setOptifying(false);
    }
  }

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
    setOptifyNote(null);
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
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="flex min-w-0 items-center gap-3 text-left"
                    title={`Open ${project.name}`}
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
                    <IconButton label="Project settings" onClick={() => setEditingId(project.id)}>
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
            <OptifyRow
              busy={optifying}
              note={optifyNote}
              disabled={!draft.name.trim() && !draft.description.trim()}
              onClick={() =>
                void optify(draft.name, draft.description, (patch) =>
                  setDraft((d) => ({ ...d, ...patch }))
                )
              }
            />
          </div>
        </div>
      </Modal>

      {editingId && (
        <ProjectSettingsModal
          project={projects.find((p) => p.id === editingId) || null}
          onClose={() => setEditingId(null)}
          onChange={updateProject}
        />
      )}
    </div>
  );
}

/** The OptiFy control under the scope picker, with the model's note beneath. */
function OptifyRow({
  busy,
  note,
  disabled,
  onClick,
}: {
  busy: boolean;
  note: string | null;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="mt-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          size="sm"
          variant="gradient"
          loading={busy}
          disabled={disabled}
          onClick={onClick}
          icon={<LogoMark size={12} className="brightness-0 invert" />}
          title={disabled ? "Give the project a name or description first" : "Let OptiAI pick models, skills and plugins from the description"}
        >
          OptiFy
        </Button>
        <span className="text-[11.5px] text-[var(--text-subtle)]">
          Pick the scope from the name and description. You can still edit it.
        </span>
      </div>
      {note && (
        <p className="mt-2 rounded-lg border border-[var(--brand-soft-border)] bg-[var(--brand-soft)] px-3 py-2 text-[12px] leading-relaxed text-[var(--text-muted)]">
          {note}
        </p>
      )}
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
