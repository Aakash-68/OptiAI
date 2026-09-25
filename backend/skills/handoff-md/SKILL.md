---
name: handoff-md
description: Write a HANDOFF.md that lets another engineer or a fresh AI session continue the work without re-deriving anything. Use when the user says "write a handoff", "hand this off", "summarize where we are for the next person", "create HANDOFF.md", or when a session is ending with work still in flight.
---

# Handoff.md creator

A handoff is a document a stranger reads once and can act on. It records state, not history. If the reader would need to ask you a question before touching the code, the handoff is not done.

## Steps

1. **Establish the facts before writing.** Run `git status`, `git log --oneline -15`, and the project's test command. A handoff that says "tests pass" without having run them is a liability.
2. **Write `HANDOFF.md` at the repository root** (or update the existing one in place). Overwrite stale sections; do not append a diary.
3. **Keep it under 150 lines.** Link to files with paths and line numbers instead of pasting code.

## Required sections, in this order

```markdown
# Handoff — <project or feature name>
Updated: <ISO date> by <who or which agent>

## Goal
One paragraph: what is being built and what "done" means. State the acceptance criteria as a checklist.

## Current state
- What works, verified how (command + result).
- What is half-done, with the exact file and function.
- Branch name, last commit hash, and whether the tree is clean.

## Next steps
Numbered, smallest first. Each step names the file to open and the outcome expected.

## Decisions made
Bullet per decision: what was chosen, what was rejected, and why. Include anything a reviewer would otherwise re-litigate.

## Known issues and traps
Failing tests, flaky behaviour, environment quirks, credentials that must not be committed, commands that look safe but are not.

## How to run
The exact commands to install, run, and test. Copy-pasteable. Include ports and env vars.

## Open questions
Only questions the reader cannot answer from the code. Name who can answer them if known.
```

## Rules

- Every claim of "works" or "passes" carries the command that proved it.
- Prefer file paths and line numbers over prose descriptions of code.
- Never include secrets, tokens, or personal data. Reference the env var name instead.
- Delete sections that would be empty rather than writing "N/A".
- If the user has an existing handoff format or template in the repo, follow that structure and only add missing sections.
