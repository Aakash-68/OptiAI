---
name: anti-slop-audit
description: "Use when reviewing existing text for AI slop — landing pages, README prose, pitch decks, marketing copy, product descriptions. Use when the user says 'audit this copy', 'check for slop', 'does this sound like AI', 'tighten this up', 'review this for quality', or 'is this too generic'."
---

# Anti-Slop Audit

Retrospective review of existing text for AI slop patterns. Unlike tasteful-output (which filters during generation), this skill reviews text that already exists — written by anyone, human or AI.

**Core principle:** Find every sentence that could be about something else. Flag it. Fix it.

## The Process

1. READ the full text provided
2. CLASSIFY the content tier using the tasteful-output genre classifier:
   - **Full:** Product marketing, sales copy, ad copy, case studies, email sequences
   - **Reduced:** Brand manifestos, editorial, newsletters, vision statements
   - **Craft:** Social posts, personal essays, community docs, internal comms
3. Read `skills/tasteful-output/specificity-test.md` for the 5-check procedure
4. Read `skills/tasteful-output/anti-pattern-catalog.md` for the pattern index, then load relevant category files
5. RUN every sentence through the appropriate gate for its tier
6. PRODUCE the audit report (format below)

## Output Format

```
## Slop Audit: [Document Name]

**Tier:** [Full / Reduced / Craft]
**Overall:** [X]% of sentences pass | **Severity:** [Clean / Touch-ups / Rewrite / Start Over]

### Findings

#### 1. [Section/line reference]
**Original:** "[the sentence]"
**Pattern:** [Code, e.g., L3: Thesaurus Parade]
**Failed:** [which checks]
**Fix:** "[specific rewrite]"

#### 2. ...

### Strongest Lines
[2-3 lines that passed all checks — explain why they work]

### Voice Assessment
[For Reduced/Craft tier: rhythm, surprise, emotional specificity notes]

### Summary
- Sentences audited: [N]
- Passed clean: [N]
- Rewritten: [N]
- Deleted (no salvageable content): [N]
```

## Severity Scale

| Score | Rating | Meaning |
|-------|--------|---------|
| 90-100% | Clean | Minor polish only |
| 70-89% | Touch-ups | A few sentences need specificity |
| 40-69% | Rewrite | Structure may be OK but content is hollow |
| 0-39% | Start Over | Start from what's actually true |
