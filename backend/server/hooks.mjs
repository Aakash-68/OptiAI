// Node resolver hook for the extracted 9Router tree.
//
// 9Router is a Next.js app and relies on bundler path aliases ("@/*" -> src/*,
// "open-sse/*"). OptiAI runs the extracted code on plain Node, so rather than
// rewriting thousands of import statements (and breaking future re-syncs with
// upstream), we teach Node's resolver the same two aliases.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CORE = path.resolve(import.meta.dirname, "..", "9router");
const CANDIDATE_SUFFIXES = ["", ".js", ".mjs", "/index.js"];

function firstExistingFile(base) {
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = base + suffix;
    try {
      if (fs.statSync(candidate).isFile()) return pathToFileURL(candidate).href;
    } catch {}
  }
  return null;
}

function aliasBase(specifier) {
  if (specifier.startsWith("@/")) return path.join(CORE, "src", specifier.slice(2));
  if (specifier === "open-sse") return path.join(CORE, "open-sse", "index.js");
  if (specifier.startsWith("open-sse/")) return path.join(CORE, specifier);
  return null;
}

export function resolve(specifier, context, nextResolve) {
  const base = aliasBase(specifier);
  if (base) {
    const url = firstExistingFile(base);
    if (url) return { url, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
