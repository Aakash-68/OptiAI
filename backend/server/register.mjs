// Loaded via `node --import ./server/register.mjs` so the alias hook in hooks.mjs
// is active before any 9Router module is imported.
import { register } from "node:module";

register("./hooks.mjs", import.meta.url);
