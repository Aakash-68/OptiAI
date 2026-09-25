---
name: spec-writer
description: Turn an idea, feature request, or vague ask into a written spec or PRD that an engineer can build from - problem, users, scope, requirements, acceptance criteria, open questions. Use for "write a spec", "create a PRD", "turn this idea into requirements", "scope this feature", "what would it take to build", or when a request is too fuzzy to start coding.
---

# Spec writer

A spec exists so that building the wrong thing becomes hard. It is short, testable, and honest about what is not decided.

## Before writing

1. **Name the problem without the solution.** "Users cannot find past orders" is a problem. "Add a search bar" is one solution. Start from the problem; the user may have handed you a solution.
2. **Identify who has the problem** and how often. If the answer is unknown, say so; do not invent personas.
3. **Look at what exists.** If there is a codebase, find the parts this touches and note constraints (data model, auth, existing UI patterns). A spec that ignores the current system produces an estimate off by an order of magnitude.

## Spec format

```markdown
# <Feature name>
Owner: <name> · Status: draft | reviewed | approved · Updated: <date>

## Problem
Two to four sentences. Who is affected, what they cannot do today, why it matters now. Evidence if any (support tickets, metrics, quotes).

## Goal and non-goals
Goal: one sentence. Non-goals: bullets of things this explicitly will not do, to stop scope creep.

## Users and scenarios
For each user type: one or two concrete scenarios written as "As <user>, when <situation>, I want <outcome> so that <reason>".

## Requirements
Numbered. Each is testable and uses "must" or "should". Group into functional, data, permissions, performance, and compatibility.

## Acceptance criteria
Checklist. Each line is something a tester can do and observe. Cover the happy path, the main failure paths, and the edge cases that matter.

## Design notes
Only what constrains the build: data model changes, API contracts, UI states, integration points, migration needs. Link to mockups or ADRs rather than embedding them.

## Rollout
Feature flag or not, migration steps, who needs to be told, how success is measured after launch (one or two metrics with a target).

## Risks and open questions
Numbered. Each open question names who can answer it. Each risk names the mitigation or says there is none.

## Out of scope for v1
What was considered and deferred, so nobody re-proposes it next week.
```

## Rules

- Requirements are testable. "Fast" is not a requirement; "list loads in under 500 ms at p95 for 10,000 rows" is.
- Separate what the user said from what you inferred. Mark inferences ("Assumed: ...") so they can be corrected.
- Prefer a table for anything with three or more attributes per row (fields, permissions, states).
- Keep the whole spec readable in ten minutes. Move detail to appendices or links.
- Do not design the implementation beyond what constrains it. The spec says what and why; the plan says how.
- If the ask is large, split it into phases, each with its own acceptance criteria, and spec phase one fully.
- End with the smallest version that would still be worth shipping, and say whether the full spec is needed to get value.
