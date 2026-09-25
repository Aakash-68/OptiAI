"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useApi";
import { newId } from "./useChatStore";

/**
 * Projects are persistent AI workspaces: a name, standing instructions, files,
 * a preferred model/combo and the skills that should be active inside it.
 *
 * Like chat threads these live in the browser — the backend has no projects
 * table yet. The interface is deliberately server-shaped so moving it later is
 * a swap of this hook's internals.
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  /** Standing context prepended to every chat started inside the project. */
  instructions: string;
  /** Model or combo id this project prefers. Empty = use the global default. */
  preferredModel: string;
  /**
   * Models this project is allowed to use. Empty means "no restriction — any
   * connected model". Chats started in the project are limited to this set,
   * which is how a project keeps an expensive model out of routine work.
   */
  models: string[];
  /** Skill ids active inside this project. */
  skills: string[];
  /** Plugin ids active inside this project. Kept apart from skills because
   *  the two are chosen separately, even though both live in SKILL_LIBRARY. */
  plugins: string[];
  /** Pinned projects sort to the top of the list. */
  pinned?: boolean;
  /**
   * Sources: text files kept with the project. `content` is the file's text,
   * sent as context with every chat in the project. Images and binaries are
   * not accepted here; drop those into a single chat instead.
   */
  files: ProjectFile[];
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  size: number;
  addedAt: string;
  content?: string;
}

/** Per-file cap. localStorage is the store, so this stays modest. */
export const MAX_PROJECT_FILE_BYTES = 200 * 1024;

const PALETTE = ["#8e55fb", "#2f80fc", "#10b981", "#f59e0b", "#ef4444", "#6768fb"];

export function useProjects() {
  const [projects, setProjects, hydrated] = useLocalStorage<Project[]>("optiai.projects", []);

  const createProject = useCallback(
    (input: Pick<Project, "name"> & Partial<Project>) => {
      const now = new Date().toISOString();
      const project: Project = {
        id: newId(),
        name: input.name,
        description: input.description || "",
        instructions: input.instructions || "",
        preferredModel: input.preferredModel || "",
        models: input.models || [],
        skills: input.skills || [],
        plugins: input.plugins || [],
        pinned: false,
        files: [],
        color: input.color || PALETTE[Math.floor(Math.random() * PALETTE.length)],
        createdAt: now,
        updatedAt: now,
      };
      setProjects((prev) => [project, ...prev]);
      return project.id;
    },
    [setProjects]
  );

  const updateProject = useCallback(
    (id: string, patch: Partial<Project>) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p))
      );
    },
    [setProjects]
  );

  const deleteProject = useCallback(
    (id: string) => setProjects((prev) => prev.filter((p) => p.id !== id)),
    [setProjects]
  );

  const togglePinned = useCallback(
    (id: string) =>
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, pinned: !p.pinned } : p))),
    [setProjects]
  );

  const addFile = useCallback(
    (projectId: string, file: Omit<ProjectFile, "id" | "addedAt">) => {
      const entry: ProjectFile = { ...file, id: newId(), addedAt: new Date().toISOString() };
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, files: [entry, ...(p.files || [])], updatedAt: entry.addedAt }
            : p
        )
      );
      return entry.id;
    },
    [setProjects]
  );

  const removeFile = useCallback(
    (projectId: string, fileId: string) =>
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, files: (p.files || []).filter((f) => f.id !== fileId), updatedAt: new Date().toISOString() }
            : p
        )
      ),
    [setProjects]
  );

  return {
    projects,
    hydrated,
    createProject,
    updateProject,
    deleteProject,
    togglePinned,
    addFile,
    removeFile,
    palette: PALETTE,
  };
}
