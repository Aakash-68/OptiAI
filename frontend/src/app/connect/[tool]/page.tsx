"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, RotateCcw, Save, Terminal } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { ProviderAvatar } from "@/components/ui/ProviderAvatar";
import { ErrorNote } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonCode } from "@/components/ui/Skeleton";
import { getApiKeys, getCliConfig, getCliTools } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

/**
 * Per-tool setup.
 *
 * The backend returns the exact snippet a tool needs but explicitly reports
 * `writeSupported: false` — it never edits config files. So this page is built
 * around giving the user commands to run themselves, with a shell picker
 * because the export syntax differs on Windows.
 */
export default function ConnectToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool: toolId } = use(params);

  const { data: tools } = useApi(() => getCliTools(), []);
  const { data: config, loading, error } = useApi(() => getCliConfig(toolId), [toolId]);
  const { data: keys } = useApi(() => getApiKeys(), []);

  const [shell, setShell] = useState("powershell");
  const [selectedKey, setSelectedKey] = useState<string>("");

  const tool = tools?.find((t) => t.id === toolId);
  const apiKey =
    selectedKey || keys?.[0]?.key || "sk-… (issue a key on the Connect page first)";
  const gateway = config?.gateway || "http://127.0.0.1:20180/v1";

  /**
   * Env var names differ per tool family. The backend's snippet already carries
   * the right ones; we mirror that here to build shell commands from it.
   */
  const envVars = useMemo<Record<string, string>>(() => {
    const content = config?.snippet?.content as { env?: Record<string, string> } | undefined;
    if (content?.env) return content.env;
    // Sensible default for OpenAI-compatible tools when the backend gives no env block.
    return { OPENAI_BASE_URL: gateway, OPENAI_API_KEY: apiKey };
  }, [config, gateway, apiKey]);

  const withKey = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(envVars).map(([k, v]) => [
          k,
          /token|key/i.test(k) ? apiKey : /url|base/i.test(k) ? gateway : v,
        ])
      ),
    [envVars, apiKey, gateway]
  );

  const commands = useMemo(() => {
    const entries = Object.entries(withKey);
    if (shell === "powershell") {
      return entries.map(([k, v]) => `$env:${k} = "${v}"`).join("\n");
    }
    if (shell === "cmd") {
      return entries.map(([k, v]) => `set ${k}=${v}`).join("\n");
    }
    return entries.map(([k, v]) => `export ${k}="${v}"`).join("\n");
  }, [withKey, shell]);

  const persistent = useMemo(() => {
    const entries = Object.entries(withKey);
    if (shell === "powershell") {
      return entries
        .map(([k, v]) => `[Environment]::SetEnvironmentVariable("${k}", "${v}", "User")`)
        .join("\n");
    }
    if (shell === "cmd") {
      return entries.map(([k, v]) => `setx ${k} "${v}"`).join("\n");
    }
    return entries.map(([k, v]) => `echo 'export ${k}="${v}"' >> ~/.bashrc`).join("\n");
  }, [withKey, shell]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-6 py-6">
        <Skeleton className="h-3 w-24" />
        <div className="mt-4 flex items-center gap-3">
          <Skeleton delay={40} className="h-11 w-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton delay={40} className="h-5 w-[35%]" />
            <Skeleton delay={40} className="h-3 w-[55%]" />
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <SkeletonCode lines={3} delay={80} />
          <SkeletonCode lines={5} delay={120} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-6 py-6">
      <Link
        href="/connect"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to CLI Tools
      </Link>

      <div className="mb-5 flex items-center gap-3.5">
        <ProviderAvatar id={toolId} name={tool?.name || toolId} size="lg" />
        <div>
          <h1 className="font-display text-[24px] font-bold tracking-tight text-[var(--text)]">
            {tool?.name || toolId}
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--text-subtle)]">
            {tool?.description || "Route this tool's requests through OptiAI"}
          </p>
        </div>
        <Badge tone="warn" className="ml-auto">
          Not configured
        </Badge>
      </div>

      {error && <ErrorNote message={error} className="mb-4" />}

      {/* Settings */}
      <Card className="mb-5">
        <CardHeader
          title="Configuration"
          description="These are the values the tool needs. Nothing is written to disk from here."
        />

        <div className="mt-4 space-y-3.5">
          <Field label="Endpoint">
            <code className="block truncate rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 font-mono text-[12.5px] text-[var(--text)]">
              {gateway}
            </code>
          </Field>

          <Field label="API key">
            <Select
              value={selectedKey}
              onChange={setSelectedKey}
              aria-label="API key"
              placeholder="No keys issued yet"
              options={(keys || []).map((key) => ({ value: key.key, label: key.key }))}
            />
          </Field>

          {Object.keys(envVars).length > 0 && (
            <Field label="Environment">
              <div className="space-y-1.5">
                {Object.keys(withKey).map((name) => (
                  <div
                    key={name}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-1.5"
                  >
                    <code className="font-mono text-[12px] font-medium text-[var(--brand)]">
                      {name}
                    </code>
                    <span className="truncate font-mono text-[11.5px] text-[var(--text-subtle)]">
                      {withKey[name]}
                    </span>
                  </div>
                ))}
              </div>
            </Field>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
          <Button variant="primary" icon={<Save className="h-4 w-4" />} disabled>
            Apply automatically
          </Button>
          <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} disabled>
            Reset
          </Button>
          <p className="text-[12px] text-[var(--text-subtle)]">
            Automatic apply is disabled — the backend reports{" "}
            <code className="font-mono">writeSupported: false</code>. Use the commands below.
          </p>
        </div>
      </Card>

      {/* Manual config */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardHeader
            title="Manual config"
            description="Run these in your own terminal — OptiAI never edits your files"
          />
          <Tabs
            tabs={[
              { id: "powershell", label: "PowerShell" },
              { id: "cmd", label: "CMD" },
              { id: "bash", label: "bash / zsh" },
            ]}
            active={shell}
            onChange={setShell}
            size="sm"
          />
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-[var(--text)]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--brand-soft)] text-[11px] font-bold text-[var(--brand)]">
                1
              </span>
              Point the tool at OptiAI for this session
            </p>
            <CodeBlock code={commands} prompt caption={`${shell} — current shell only`} />
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-[var(--text)]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--brand-soft)] text-[11px] font-bold text-[var(--brand)]">
                2
              </span>
              Make it stick across restarts
            </p>
            <CodeBlock code={persistent} prompt caption={`${shell} — persistent`} />
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-[var(--text)]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--brand-soft)] text-[11px] font-bold text-[var(--brand)]">
                3
              </span>
              Verify it routes through OptiAI
            </p>
            <CodeBlock
              code={`curl -s ${gateway}/chat/completions -H "content-type: application/json" -H "authorization: Bearer ${apiKey}" -d "{\\"model\\":\\"<your-model>\\",\\"messages\\":[{\\"role\\":\\"user\\",\\"content\\":\\"ping\\"}]}"`}
              prompt
              caption="smoke test"
            />
            <p className="mt-2 flex items-start gap-2 text-[12px] leading-relaxed text-[var(--text-subtle)]">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok-500" />
              If it works, the request shows up under Usage within a second or two. That is how you
              know the tool is really going through OptiAI and not straight to the provider.
            </p>
          </div>

          {config?.snippet?.file && (
            <div>
              <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-[var(--text)]">
                <Terminal className="h-4 w-4 text-[var(--text-subtle)]" />
                Or edit <code className="font-mono">{config.snippet.file}</code> directly
              </p>
              <CodeBlock
                code={JSON.stringify(config.snippet.content, null, 2)}
                caption={config.snippet.file}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4">
      <p className="text-[13px] font-medium text-[var(--text-muted)]">{label}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
