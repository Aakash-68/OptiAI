---
name: doc-writer
description: Turn code, notes, or a feature into structured technical documentation - READMEs, setup guides, API references, architecture notes, runbooks, and changelogs. Use for "document this", "write a README", "explain how this module works", "write the setup guide", or any request whose output is documentation rather than code.
---

# Technical documentation writer

Documentation is a product for a reader who is busy and skeptical. Every section must earn its place by answering a question that reader has.

## First decide who is reading

Name the audience in one line before writing (a new contributor, an operator on call, an API consumer, a reviewer). Everything else follows from it: a contributor needs setup and structure, an operator needs symptoms and commands, a consumer needs contracts and examples.

## Ground it in the code

- Read the actual entry points, config files, and scripts before describing them. Never document a command you did not see defined.
- Copy exact names: flags, env vars, file paths, ports, error strings. Wrap them in backticks.
- When something is uncertain, say so in the doc ("not verified on Windows") rather than smoothing it over.

## Document shapes

**README**: one-paragraph purpose, quick start (the three commands that get to a running state), project layout, how to run tests, where to look next. Under 200 lines; move detail to `docs/`.

**Setup or install guide**: prerequisites with versions, numbered steps that each end in a verifiable state ("you should see ..."), a troubleshooting table of symptom to fix.

**API reference**: one section per endpoint or function. Signature or method plus path, parameters with types and defaults, one realistic request and response example, error cases with codes, and any rate limit or auth requirement.

**Architecture note**: the problem, the components and their responsibilities, how a request or a piece of data flows through them, the decisions taken and rejected alternatives, and known limitations. One diagram in text or Mermaid if it removes a paragraph.

**Runbook**: trigger (alert or symptom), impact, first checks with exact commands, remediation steps, rollback, who to escalate to, and how to confirm recovery.

**Changelog**: grouped under Added, Changed, Fixed, Removed, Security. One line per change, user-facing wording, link to the PR or commit.

## Writing rules

- Lead with the answer. The first sentence of any section is the point of that section.
- Short sentences. One idea each. Active voice.
- Use tables for anything with three or more attributes per item (flags, env vars, endpoints).
- Examples over adjectives. Show the command and its output rather than describing it as "simple".
- No filler ("in this document we will"), no marketing, no emoji.
- Keep headings to three levels. If a fourth level appears, the doc needs splitting.
- Keep house style: match the existing docs' tone, heading case, and code fence language tags.

## Before finishing

Run every command you wrote down if the environment allows it. Check each link and path exists. Remove any section that only says what the heading already says.
