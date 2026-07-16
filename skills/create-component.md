# Skill: create a component

## Required reading

[../rules/03-components.md](../rules/03-components.md),
[../rules/14-accessibility.md](../rules/14-accessibility.md),
[../rules/15-internationalization.md](../rules/15-internationalization.md).

## Preconditions

- You know the owning module — or the component is provably feature-agnostic and belongs
  in `src/shared/ui` (used or clearly usable by 2+ modules).
- All data/behavior it needs can arrive as props (if not, you need a container/hook first).

## Steps

1. Create `src/modules/<name>/components/<kebab-name>.component.tsx` (or
   `src/shared/ui/<kebab-name>.component.tsx`).
2. Define a typed props interface (in-file or `<name>.types.ts` if shared): data in,
   `on<Event>` callbacks out. No service, platform, or firebase imports.
3. Render semantic, labeled, keyboard-operable markup; icons from `@/packages/icons`;
   long lists via `@/packages/virtuoso`; logical CSS properties for RTL.
4. Localized copy only — message values arrive as props or via catalog keys
   ([add-i18n-key.md](add-i18n-key.md)); never literals.
5. Export exactly one component. Wire it from its container.

## Forbidden shortcuts

- Any hook call ("just one `useState`" is still a violation — lift it to the container's
  view-model hook).
- Fetching, navigating, or reading `window`/`document` inside the component.
- Copying an existing component instead of extending it with a variant prop.

## Required tests

Testing Library test for shared/self-contained components (render from props, assert by
role/label, fire callbacks); module screen components may instead be covered by the owning
Playwright journey (EXC-3) — verify the journey actually exercises the new UI.

## Validation

```bash
npm run lint && npm run typecheck && npm run typecheck:tsc && npm run test
npm run test:e2e   # when covered by a journey
```

## Definition of done

Zero hooks, zero forbidden imports, accessible and bilingual, one export, tests/journey
prove the rendered behavior.
