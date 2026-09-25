---
name: frontend-engineering
description: Build and review web UI - React, Next.js, Vue, Svelte, plain DOM - with attention to component boundaries, state, accessibility, loading and error states, and performance. Use for "build a component", "add a page", "fix this layout", "why does this re-render", form handling, data fetching in the browser, responsive design, or any frontend code change.
---

# Frontend engineering

Ship UI that works for every user, in every state, on the framework and design system the project already uses.

## Before touching code

1. **Read the neighbours.** Open two or three existing components of the same kind. Match their file layout, naming, styling method (CSS modules, Tailwind, styled components, design tokens), and data-fetching pattern. Never introduce a second way of doing something the project already does.
2. **Find the design tokens.** Colours, spacing, radii, and type come from the project's tokens or theme, not from hard-coded values. If none exist, use the nearest existing component's values.
3. **Identify every state the UI can be in**: empty, loading, partial, error, success, disabled, offline where relevant. Each one is a requirement, not a nice-to-have.

## Component rules

- One component, one responsibility. Presentation components take data and callbacks; container or page components own fetching and state.
- Props are the public API. Keep them minimal, typed, and named for what they mean, not how they are rendered.
- Derive, do not duplicate. If a value can be computed from props or state, compute it; do not store it twice.
- Keep state as local as possible and lift it only when two siblings need it.
- Effects are for synchronizing with the outside world (network, DOM, subscriptions). Not for deriving state.
- Lists get stable keys from data ids, never from array indexes when items can reorder.

## Accessibility is not optional

- Use the semantic element first: `button`, `a`, `nav`, `label`, `table`. Reach for `div` plus ARIA only when no element fits.
- Every interactive element is keyboard reachable and has a visible focus style.
- Every image has `alt` text or is explicitly decorative. Every form control has a label.
- Colour is never the only carrier of meaning. Contrast meets WCAG AA.
- Respect `prefers-reduced-motion` for any animation larger than a fade.

## Data and performance

- Show something immediately: a skeleton or the previous data, never a blank region.
- Handle request failure with a message the user can act on and a retry path.
- Cancel or ignore stale requests when inputs change.
- Memoize only after measuring a problem. Premature `useMemo` is noise.
- Images: correct size, lazy loaded below the fold, modern format.
- Avoid layout shift: reserve space for async content.

## Styling

- Mobile first. Verify at a phone width and a wide width.
- No magic numbers. Spacing and sizes come from the scale.
- Dark mode is a token swap, not a second stylesheet, if the project supports it.
- Avoid `!important` and deep selector chains. Specificity problems are structure problems.

## Before finishing

- Run the type checker and linter the project uses.
- Open the UI, if the environment allows, and exercise every state listed in step 3.
- Test with keyboard only once.
- Leave no console errors or warnings.
