---
name: research-brief
description: Investigate a question and return a sourced, decision-ready brief instead of a loose summary. Use for "research", "compare options", "what should we use for", "find out whether", "what is the state of", library or vendor evaluations, and any request where the answer depends on facts that must be looked up and cited.
---

# Research brief

The output of research is a decision someone can make, backed by sources they can check. Length is not a signal of quality; verifiable claims are.

## Method

1. **Restate the question** as a single sentence with the decision it serves ("choose a queue for 10k jobs/min with at-least-once delivery"). If the request has several questions inside it, split them and answer each.
2. **List the criteria before looking.** Three to six things the answer must satisfy, ranked. Write them down first so the search does not drift toward whatever is easiest to find.
3. **Gather from primary sources first**: official docs, changelogs, source code, benchmarks with published methodology, standards. Blog posts and forum answers are leads, not evidence. Note the date of every source; a two-year-old comparison of fast-moving tools is a historical document.
4. **Verify anything that matters.** If a claim would change the recommendation, find a second independent source or test it directly (run the code, read the source, check the pricing page).
5. **Record what you could not confirm.** An honest gap beats a confident guess.

## Brief format

```markdown
# <Question>

**Recommendation:** <one sentence>. Confidence: high | medium | low, because <reason>.

## Criteria
1. ...

## Options considered
| Option | Criterion 1 | Criterion 2 | ... | Notes |
|---|---|---|---|---|

## Findings
- Finding one, stated as a fact, with [source](url) (date).
- ...

## Risks and unknowns
- What was not verified and what it would take to verify it.

## Sources
1. Title, publisher, date, URL.
```

## Rules

- Every factual claim in Findings carries a source. No source, no claim; move it to Unknowns.
- Quote numbers exactly as the source states them, with units and the conditions under which they were measured.
- Distinguish "the docs say" from "I tested". Both are useful; conflating them is not.
- Say when the honest answer is "it depends" and state what it depends on.
- Do not pad with background the reader did not ask for. If context is needed, keep it to one paragraph.
- Prefer a table over prose when comparing more than two options.
- If the user's own codebase or data is available, ground the recommendation in it (versions in use, scale, constraints) rather than in a generic scenario.
