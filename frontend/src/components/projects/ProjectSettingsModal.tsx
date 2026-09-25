"use client";

import { useState } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { ProjectScopePicker } from "@/components/projects/ProjectScopePicker";
import { aiOptify } from "@/lib/api";
import { useModelCatalog } from "@/hooks/useModelCatalog";
import { useSkills } from "@/hooks/useSkills";
import { shortModelName } from "@/lib/format";
import type { Project } from "@/hooks/useProjects";

/**
 * Edits an existing project in place. Every change is written as it is typed,
 * so "Done" only closes the dialog. Shared by the projects list and the
 * project page, which is why it lives here rather than inside either.
 */
export function ProjectSettingsModal({
  project,
  onClose,
  onChange,
}: {
  project: Project | null;
  onClose: () => void;
  onChange: (id: string, patch: Partial<Project>) => void;
}) {
  const catalog = useModelCatalog();
  const library = useSkills();
  const [optifying, setOptifying] = useState(false);
  const [optifyNote, setOptifyNote] = useState<string | null>(null);

  async function optify() {
    if (!project) return;
    setOptifying(true);
    setOptifyNote(null);
    try {
      const out = await aiOptify({
        title: project.name,
        description: project.description,
        models: catalog.models
          .filter((m) => m.connected)
          .map((m) => ({ id: m.id, name: m.name, provider: m.providerName })),
        skills: library.skills.map((s) => ({ id: s.id, name: s.name, kind: s.kind, summary: s.summary })),
      });
      onChange(project.id, { models: out.models, skills: out.skills, plugins: out.plugins });
      setOptifyNote(
        `${shortModelName(out.model)} picked ${out.models.length} model${out.models.length === 1 ? "" : "s"}, ${out.skills.length} skill${out.skills.length === 1 ? "" : "s"} and ${out.plugins.length} plugin${out.plugins.length === 1 ? "" : "s"}.${out.reason ? ` ${out.reason}` : ""}`
      );
    } catch (err) {
      setOptifyNote(err instanceof Error ? err.message : "OptiFy failed");
    } finally {
      setOptifying(false);
    }
  }

  if (!project) return null;
  const disabled = !project.name.trim() && !project.description.trim();

  return (
    <Modal
      open
      onClose={onClose}
      title={`${project.name} settings`}
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-3.5">
        <Input
          label="Name"
          value={project.name}
          onChange={(e) => onChange(project.id, { name: e.target.value })}
        />
        <Input
          label="Description"
          value={project.description}
          onChange={(e) => onChange(project.id, { description: e.target.value })}
          placeholder="What this workspace is for"
        />
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">Standing instructions</span>
          <Textarea
            value={project.instructions}
            rows={4}
            onChange={(e) => onChange(project.id, { instructions: e.target.value })}
            placeholder="Context every chat in this project should start with."
          />
        </label>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-[var(--text)]">What this project can use</p>
          <ProjectScopePicker
            models={project.models || []}
            skills={project.skills || []}
            plugins={project.plugins || []}
            onChange={(patch) => onChange(project.id, patch)}
          />
          <div className="mt-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                size="sm"
                variant="gradient"
                loading={optifying}
                disabled={disabled}
                onClick={() => void optify()}
                icon={<LogoMark size={12} className="brightness-0 invert" />}
                title={disabled ? "Give the project a name or description first" : "Let OptiAI pick models, skills and plugins from the description"}
              >
                OptiFy
              </Button>
              <span className="text-[11.5px] text-[var(--text-subtle)]">
                Pick the scope from the name and description. You can still edit it.
              </span>
            </div>
            {optifyNote && (
              <p className="mt-2 rounded-lg border border-[var(--brand-soft-border)] bg-[var(--brand-soft)] px-3 py-2 text-[12px] leading-relaxed text-[var(--text-muted)]">
                {optifyNote}
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
