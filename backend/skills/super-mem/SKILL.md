---
name: supermemory
description: "Use when you need to store, search, or manage memories across sessions. Provides persistent memory for AI agents via the Supermemory API."
---

# Supermemory — Persistent Memory for AI Agents

`sm` is a lightweight CLI that gives any AI agent (Claude Code, Codex, Gemini CLI, etc.) persistent memory across sessions, powered by the [Supermemory](https://supermemory.ai) API free tier.

## When to Use

- **Store**: When the user shares preferences, project facts, or decisions worth remembering
- **Search**: When you need context from previous sessions (e.g., "what stack does this project use?")
- **List**: When you want to see all stored memories for a project
- **Forget**: When information becomes outdated or incorrect

## Commands

### Store a memory
```bash
sm add "Frank prefers TypeScript over JavaScript"
sm add "This project uses Next.js 15 with App Router" --containerTag project-name
echo "deployment uses Cloudflare Workers" | sm add -
```

### Search memories
```bash
sm search "user preferences"
sm search "database schema" --containerTag project-name
sm search "authentication" --v4 --limit 5
```

### List recent memories
```bash
sm list --containerTag project-name
```

### Forget outdated info
```bash
sm forget "old incorrect fact" --containerTag project-name
sm forget mem_abc123 --containerTag project-name
```

### Document operations (for larger content)
```bash
sm doc add README.md --containerTag project-name
sm doc get <document-id>
sm doc delete <document-id>
```

## Common Patterns

### Session Start — Recall Context
At the start of a session, search for relevant project context:
```bash
sm search "project architecture and conventions" --containerTag $(basename $(pwd))
```

### Session End — Save Key Learnings
After making important decisions or discoveries:
```bash
sm add "Decided to use Prisma ORM for database layer" --containerTag project-name
sm add "Auth flow: JWT tokens with 24h expiry, refresh via /api/auth/refresh"
```

### User Preferences
When the user expresses a preference:
```bash
sm add "User prefers dark mode in all UIs"
sm add "User wants minimal comments, self-documenting code"
```

## Setup

If `sm` is not installed or configured:
```bash
curl -sSL https://raw.githubusercontent.com/franksde/supermemory-cli/main/install.sh | bash
sm config set-key <api-key>          # Get key from https://console.supermemory.ai/keys
sm config set-tag <default-container-tag>

# Optional recommended Agent configurations
sm config set-default-limit 3
sm config set-score-threshold 0.5
sm config set-max-content-length 500
sm config set-default-v4 true
```

## Notes

- All commands output JSON (agent-friendly)
- `--containerTag` scopes memories; set a default with `sm config set-tag`. If omitted, the platform's default container is used.
- `sm add` uses the v4 memories API (immediate, no ingestion delay)
- `sm search` uses `default_v4` flag (default true), or use `--v4=false` to use v3 API.
- Config file: `~/.config/sm/config.json`
