// Boots the extracted 9Router layer and reports its health to the OptiAI API.
import { initTranslators } from "open-sse/translator/index.js";
import { getAdapter } from "@/lib/db/driver.js";
import { PROVIDERS } from "open-sse/providers/index.js";
import { DATA_DIR } from "@/lib/dataDir.js";
import corePkg from "../9router/package.json" with { type: "json" };

let booted = null;

export function bootstrap() {
  booted ??= (async () => {
    const adapter = await getAdapter();
    await initTranslators();
    return { driver: adapter.driver };
  })();
  return booted;
}

export async function getStatus() {
  const started = Date.now();
  try {
    const { driver } = await bootstrap();
    return {
      ok: true,
      backend: "up",
      database: { connected: true, driver, dataDir: DATA_DIR },
      router: { loaded: true, version: corePkg.version, providers: Object.keys(PROVIDERS).length },
      checkedInMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      backend: "up",
      database: { connected: false, error: error.message },
      router: { loaded: false },
      checkedInMs: Date.now() - started,
    };
  }
}
