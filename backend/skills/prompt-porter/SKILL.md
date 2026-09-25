---
name: prompt-porter
description: Write, adapt, and structure prompts for other AI platforms and tools - ChatGPT and OpenAI models, Gemini, Claude, Midjourney and image models, Cursor rules, Copilot instructions, custom GPTs, system prompts for products, and agent instructions. Use for "write a prompt for", "turn this into a system prompt", "make a Cursor rule", "port this to GPT", "prompt for Midjourney", or any request whose output is a prompt rather than an answer.
---

# Prompt porter

A prompt is a specification for a model. Write it the way you would write a spec for a contractor: goal, constraints, examples, and how the result will be checked.

## Universal structure

Every prompt, whatever the platform, is built from the same parts in this order. Omit a part only when it is genuinely empty.

1. **Role and context**: who the model is acting as and what situation it is in. One or two sentences. No flattery ("you are a world-class expert").
2. **Task**: the single thing to produce, stated as an outcome.
3. **Inputs**: what the model will be given and how it is delimited (fenced blocks, XML tags, or clearly labelled sections).
4. **Constraints**: length, format, language, tone, what to avoid, what to do when information is missing.
5. **Process**, if the task benefits from steps: "first ..., then ..., finally ...". Keep it to what changes the output.
6. **Output format**: exact shape. If JSON, give the schema and one example. If prose, give section headings.
7. **Examples**: one or two input-output pairs when format or judgement is subtle. Examples beat adjectives.
8. **Quality bar**: how the result will be judged, so the model can self-check.

## Platform notes

**OpenAI / ChatGPT / custom GPTs**: system prompt carries role, constraints, and format; user turn carries the task and inputs. Use Markdown headers to separate sections. For custom GPTs, keep instructions under about 8,000 characters and put reference material in knowledge files. For structured output, request JSON mode or a JSON schema explicitly.

**Claude**: XML-style tags (`<document>`, `<instructions>`, `<example>`) delimit inputs cleanly. Put long documents before the question. State the output format at the end. Claude follows explicit "do not" instructions well but responds better to being told what to do instead.

**Gemini**: similar to OpenAI structure. Be explicit about output format; give the schema for structured output. Long context is fine; put instructions at both the start and the end for very long inputs.

**Cursor rules / Copilot instructions / AGENTS.md**: these are standing instructions, not tasks. Write them as short imperative bullets grouped by topic (style, architecture, testing, forbidden patterns). Reference real files and commands from the repo. Keep under a page; a rule file that is too long gets ignored.

**System prompts for products**: add identity, scope ("you only help with X; for anything else say ..."), safety boundaries, how to handle missing information, and the persona in one line. Include three or four canonical example exchanges. Version the prompt and keep a changelog.

**Agent instructions (tool-using models)**: describe each tool once with when to use it and when not to. State the stopping condition. Tell the agent what to do when a tool fails. Ask for a final summary in a fixed shape.

**Image models (Midjourney, DALL-E, Stable Diffusion, Imagen)**: subject first, then setting, then style, lighting, camera or medium, then mood, then technical parameters (aspect ratio, quality flags). Concrete nouns and named styles work; abstract adjectives do not. For Midjourney, parameters go last (`--ar 16:9 --v 6`). Give a negative prompt where the platform supports it.

## Adapting an existing prompt to a new platform

1. Extract the eight parts above from the source prompt. Note anything platform-specific (tags, parameters, token limits).
2. Rebuild in the target's conventions. Keep the wording of constraints and examples; change only the scaffolding.
3. Flag anything that does not translate (a tool that does not exist on the target, a format the target cannot guarantee).

## Rules

- Write the prompt in a fenced block so it can be copied verbatim. Put your notes outside the block.
- Be specific over clever. "Reply in under 120 words" beats "be concise".
- Never include secrets or personal data in a prompt meant to be shared.
- Include one test input the user can paste to check the prompt works.
