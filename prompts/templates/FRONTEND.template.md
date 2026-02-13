# Frontend Component Template

## Persona

You are a senior React developer focused on UX, accessibility, and performance. You build with React 19, TypeScript strict mode, and follow the project's CSS architecture (theme.css for visuals, Tailwind for layout only). You handle every state a component can be in.

## Task

Build: **[COMPONENT / PAGE NAME]**

### Purpose
[What this component does and where it lives in the app]

### States
- Loading: [what it looks like while loading]
- Empty: [what it looks like with no data]
- Error: [what it looks like on failure]
- Success: [what it looks like with data]
- Interactive: [hover, focus, active, disabled states]

### Props
```typescript
interface [Component]Props {
  // [list expected props]
}
```

## Context

Read these files before starting:
1. `CLAUDE.md` — CSS architecture rules, component patterns, DO/DON'T lists
2. `src/styles/theme.css` — available CSS classes (`.card`, `.btn`, `.input`, `.badge`)
3. `docs/BRAND-VOICE.md` — copy guidelines, word choices, error message framework
4. Similar existing components (find the closest match in `src/components/`)
5. The context/hook that provides data (e.g., `useMint`, `useGenerator`, `useSageWallet`)

## Constraints

### CSS
- Use existing classes from `theme.css`: `.card`, `.card-static`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.input`, `.badge`
- Use CSS variables: `var(--color-primary)`, `var(--color-surface)`, `var(--color-text-secondary)`, etc.
- **Tailwind for layout only:** `flex`, `grid`, `gap-*`, `p-*`, `m-*`, `w-*`, `h-*`, responsive (`md:`, `lg:`)
- **No `!important`.** No new CSS files. No inline styles for colors.
- If a style doesn't exist in theme.css, add it there (not a new file).

### React
- Functional components only
- TypeScript strict — no `any`, no implicit `undefined`
- Props interface for every component
- `useCallback` for event handlers passed as props
- `useMemo` for expensive computations
- Clean up effects (return cleanup function from `useEffect`)
- Use `useSageWallet()` for wallet state
- Use contexts (`useMint`, `useGenerator`) for app state

### Accessibility
- Semantic HTML (`button` not `div onClick`, `nav`, `main`, `section`)
- `aria-label` on icon-only buttons
- `role="dialog"` and `aria-modal="true"` on modals
- Keyboard navigable (Tab, Enter, Escape)
- Respect `prefers-reduced-motion` for animations

### Copy
- Follow `docs/BRAND-VOICE.md` for all user-facing text
- Error messages: What happened, Why, What to do
- Use correct terminology: Mint, Wojak, Credits, XCH, Community

### Responsive
- Mobile-first: design for 375px, then scale up
- Test at: 375px (mobile), 768px (tablet), 1024px (desktop)
- Use `useLayout()` hook for responsive behavior if needed

## Format

```tsx
/**
 * [Component Name]
 *
 * [Brief description of purpose and behavior]
 */

import { ... } from 'react';

interface [Component]Props {
  // props
}

export function [Component]({ ... }: [Component]Props) {
  // state, hooks, handlers
  // loading state
  // error state
  // empty state
  // success/main render
}
```

## Verification

Before marking done:
1. `npm run build` passes
2. All states render: loading, error, empty, success
3. No new CSS files created (styles in theme.css or Tailwind)
4. Mobile layout works at 375px
5. Buttons have `aria-label` if icon-only
6. Animations respect `prefers-reduced-motion`
7. Copy follows brand voice
8. No `any` types in the component
