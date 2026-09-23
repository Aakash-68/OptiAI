/**
 * The OptiAI skill & plugin library.
 *
 * This list is curated on purpose. OptiAI does not let users install arbitrary
 * Git repositories — a skill is only installable once it has been reviewed and
 * added here. When the backend grows a skills API this file becomes its seed
 * data; the shape below is what that endpoint should return.
 */

export type SkillKind = "skill" | "plugin";

export type SkillCategory =
  | "Development"
  | "Research"
  | "Writing"
  | "Data"
  | "Productivity"
  | "Cost";

export interface SkillDefinition {
  id: string;
  name: string;
  kind: SkillKind;
  category: SkillCategory;
  summary: string;
  /** What it actually does, shown on the detail panel. */
  detail: string;
  author: string;
  version: string;
  /** Rough token impact per invocation — negative means it saves tokens. */
  tokenImpact?: string;
  tags: string[];
  /** Enabled by default on a fresh install. */
  defaultEnabled?: boolean;
}

export const SKILL_LIBRARY: SkillDefinition[] = [
  {
    id: "repo-analyzer",
    name: "Repository Analyzer",
    kind: "skill",
    category: "Development",
    summary: "Maps a Git repository's structure, dependencies and hot spots before you ask about it.",
    detail:
      "Walks the working tree, builds a dependency graph and a per-directory summary, then attaches only the relevant slices to your prompt instead of pasting whole files.",
    author: "OptiAI",
    version: "1.2.0",
    tokenImpact: "−40% on codebase questions",
    tags: ["git", "codebase", "context"],
    defaultEnabled: true,
  },
  {
    id: "prompt-compressor",
    name: "Prompt Compressor",
    kind: "skill",
    category: "Cost",
    summary: "Runs the RTK filter chain over long prompts before they leave OptiAI.",
    detail:
      "Wraps the router's built-in token-reduction filters. Autodetects the best filter for the content type, strips redundancy, and reports the byte delta per request.",
    author: "OptiAI",
    version: "2.0.1",
    tokenImpact: "−15–60% on long inputs",
    tags: ["tokens", "cost", "rtk"],
    defaultEnabled: true,
  },
  {
    id: "cost-guard",
    name: "Cost Guard",
    kind: "plugin",
    category: "Cost",
    summary: "Caps spend per day and downgrades to a cheaper model instead of failing.",
    detail:
      "Watches the running daily cost. When you cross the threshold it transparently reroutes to the cheapest model in the active combo rather than blocking the request.",
    author: "OptiAI",
    version: "0.9.4",
    tags: ["budget", "routing", "fallback"],
  },
  {
    id: "web-researcher",
    name: "Web Researcher",
    kind: "skill",
    category: "Research",
    summary: "Multi-source web search with citation tracking.",
    detail:
      "Fans out a question across search providers, deduplicates the results, and returns a synthesized answer where every claim carries its source URL.",
    author: "OptiAI",
    version: "1.5.2",
    tags: ["search", "citations", "research"],
  },
  {
    id: "doc-writer",
    name: "Technical Doc Writer",
    kind: "skill",
    category: "Writing",
    summary: "Turns code and notes into structured documentation.",
    detail:
      "Reads source files or meeting notes and produces README-shaped output: overview, setup, API reference and a worked example, in your existing house style.",
    author: "OptiAI",
    version: "1.1.0",
    tags: ["docs", "markdown", "writing"],
  },
  {
    id: "sql-analyst",
    name: "SQL Analyst",
    kind: "skill",
    category: "Data",
    summary: "Writes, explains and optimizes SQL against a described schema.",
    detail:
      "Give it a schema once and it keeps that context per project. Produces queries with an execution-plan rationale and flags full scans before you run them.",
    author: "OptiAI",
    version: "1.0.3",
    tags: ["sql", "database", "analysis"],
  },
  {
    id: "diff-reviewer",
    name: "Diff Reviewer",
    kind: "skill",
    category: "Development",
    summary: "Reviews a patch for correctness bugs, not style nits.",
    detail:
      "Takes a unified diff, reasons about the surrounding code, and reports only defects it can describe with a concrete failure scenario.",
    author: "OptiAI",
    version: "2.1.0",
    tags: ["review", "git", "quality"],
  },
  {
    id: "meeting-synthesizer",
    name: "Meeting Synthesizer",
    kind: "skill",
    category: "Productivity",
    summary: "Transcript in, decisions and owners out.",
    detail:
      "Condenses a transcript into decisions, action items with owners, and open questions — dropping the chatter rather than summarizing it.",
    author: "OptiAI",
    version: "1.3.1",
    tags: ["meetings", "summary", "actions"],
  },
  {
    id: "model-router",
    name: "Smart Model Router",
    kind: "plugin",
    category: "Cost",
    summary: "Classifies each prompt and routes it to the cheapest model that can handle it.",
    detail:
      "Scores incoming prompts for difficulty and required capabilities, then picks from your active combo — trivial prompts stop hitting your most expensive model.",
    author: "OptiAI",
    version: "0.7.0",
    tokenImpact: "−25–50% on mixed workloads",
    tags: ["routing", "cost", "combos"],
  },
  {
    id: "citation-checker",
    name: "Citation Checker",
    kind: "plugin",
    category: "Research",
    summary: "Verifies that quoted sources actually say what the answer claims.",
    detail:
      "Re-fetches every cited URL in a response and flags claims the source does not support. Runs after generation, so it catches confident fabrication.",
    author: "OptiAI",
    version: "0.4.2",
    tags: ["accuracy", "citations", "verification"],
  },
  {
    id: "schema-extractor",
    name: "Schema Extractor",
    kind: "skill",
    category: "Data",
    summary: "Pulls structured records out of unstructured text or PDFs.",
    detail:
      "Define the target shape once; it extracts conforming records from documents and reports per-field confidence so you know what to spot-check.",
    author: "OptiAI",
    version: "1.0.0",
    tags: ["extraction", "json", "pdf"],
  },
  {
    id: "context-pruner",
    name: "Context Pruner",
    kind: "plugin",
    category: "Cost",
    summary: "Drops conversation turns that no longer affect the answer.",
    detail:
      "Scores earlier turns for relevance to the current question and trims the ones that stopped mattering, keeping long threads inside the context window.",
    author: "OptiAI",
    version: "1.4.0",
    tokenImpact: "−30% on long threads",
    tags: ["context", "tokens", "memory"],
  },
];

export const SKILL_CATEGORIES: SkillCategory[] = [
  "Development",
  "Research",
  "Writing",
  "Data",
  "Productivity",
  "Cost",
];
