---
name: code-craft
description: General coding discipline for any language - understand before changing, keep diffs small and focused, follow the codebase's conventions, test what changed, and verify before claiming done. Use for "implement", "fix", "refactor", "add a feature", "clean this up", or any coding task that has no more specific skill.
---

# Code craft

Good code changes are boring to review: they do one thing, match their surroundings, and come with proof that they work.

## Understand first

1. Read the code you are about to change and the code that calls it. Know the entry point and at least one caller before editing.
2. Reproduce the problem or write down the expected behaviour before writing the fix. A change without a reproduction is a guess.
3. Find the tests for this area. Run them once before changing anything so you know the baseline.

## Change small

- One logical change per diff. A bug fix is not the place for a rename, and a feature is not the place for a reformat.
- Prefer the smallest change that fully solves the problem. Resist generalizing for cases that do not exist yet.
- Do not touch lines you do not need to touch. Unrelated whitespace and import reordering hide the real change.
- If a larger refactor is genuinely needed, do it as a separate, behaviour-preserving step first, then the change on top.

## Match the codebase

- Naming, file layout, error handling, logging, and test style come from the neighbouring code, not from personal preference.
- Reuse existing helpers before writing new ones. Search for the function you are about to write.
- Keep the same level of abstraction as the surrounding code. A helper that is called once is usually just indirection.
- Comments explain why, not what. Delete comments that restate the code.

## Correctness

- Handle the edge cases the code already handles: empty input, null, concurrency, unicode, time zones, large sizes.
- Fail loudly on invalid state. A silent default is a bug waiting for a worse moment.
- No dead code, no commented-out blocks, no TODOs without an owner or ticket.
- Never leave debugging output in.

## Test what changed

- Add or update a test that fails without the change and passes with it.
- Test behaviour through the public interface, not private details.
- Cover the failure path once, not only the happy path.
- Keep tests deterministic: no real time, no network, no shared mutable state between tests.

## Verify before claiming done

- Run the full relevant test suite, the linter, and the type checker. Paste the actual result, not a summary from memory.
- Read the final diff top to bottom as a reviewer would. Remove anything that does not serve the change.
- State plainly what was verified and what was not. "Tests pass" means they were run and passed, nothing less.

## Communicating the change

The summary answers three questions in order: what was wrong or missing, what changed, how it was verified. Mention anything a reviewer would otherwise have to discover: a behaviour change, a new dependency, a migration, a follow-up left undone.
