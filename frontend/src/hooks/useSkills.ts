"use client";

import { useCallback, useEffect, useState } from "react";
import { listSkills, updateSkill, updateSkillSettings } from "@/lib/api";
import type { SkillDefinition, SkillInfluence, SkillsResponse } from "@/lib/types";

/**
 * The skill library, read from the backend and shared across every screen
 * that renders it (Skills, Projects, Analytics, Chat).
 *
 * One in-flight request and one cached copy per page load: the picker inside
 * a project dialog and the Skills tab must agree without each refetching, and
 * a toggle on one screen updates the others through the subscriber list.
 */
let cache: SkillsResponse | null = null;
let inflight: Promise<SkillsResponse> | null = null;
const listeners = new Set<(next: SkillsResponse) => void>();

function publish(next: SkillsResponse) {
  cache = next;
  for (const fn of listeners) fn(next);
}

async function load(force = false) {
  if (cache && !force) return cache;
  if (!inflight) {
    inflight = listSkills()
      .then((data) => {
        publish(data);
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useSkills() {
  const [data, setData] = useState<SkillsResponse | null>(cache);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    listeners.add(setData);
    load()
      .then(() => setLoading(false))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load skills");
        setLoading(false);
      });
    return () => {
      listeners.delete(setData);
    };
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      await load(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load skills");
    } finally {
      setLoading(false);
    }
  }, []);

  const patch = useCallback(async (id: string, change: { enabled?: boolean; influence?: SkillInfluence }) => {
    const updated = await updateSkill(id, change);
    if (cache) {
      const skills = cache.skills.map((s) => (s.id === id ? { ...s, ...updated } : s));
      publish({ ...cache, skills, enabledCount: skills.filter((s) => s.enabled).length });
    }
    return updated;
  }, []);

  const setChatApply = useCallback(async (chatApply: boolean) => {
    const out = await updateSkillSettings({ chatApply });
    if (cache) publish({ ...cache, chatApply: out.chatApply });
    return out.chatApply;
  }, []);

  const skills: SkillDefinition[] = data?.skills ?? [];
  return {
    skills,
    enabled: skills.filter((s) => s.enabled),
    chatApply: data?.chatApply ?? true,
    dir: data?.dir ?? "",
    loading,
    error,
    refetch,
    patch,
    setChatApply,
  };
}

/** Distinct categories in library order, for filter chips. */
export function skillCategories(skills: SkillDefinition[]): string[] {
  const seen: string[] = [];
  for (const s of skills) if (!seen.includes(s.category)) seen.push(s.category);
  return seen;
}
