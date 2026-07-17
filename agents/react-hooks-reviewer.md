# React hooks reviewer

Scope: hook isolation, component purity, effect hygiene. Rules:
[../rules/03](../rules/03-components.md), [../rules/04](../rules/04-containers.md),
[../rules/05](../rules/05-hooks-and-effects.md).

## Checklist

- [ ] No hook call in any `*.component.tsx` — including `useState` and custom hooks.
- [ ] Containers/providers/`*.routes.tsx`/shell/router call project hooks only; every hook
      import resolves to a project path, not a vendor package.
- [ ] Every `use<X>` function is defined in a `*.hook.ts` file or `hooks/` directory.
- [ ] Effects: dependency arrays complete (no `exhaustive-deps` suppression); subscriptions,
      listeners, and timers cleaned up; async completions guarded against unmount.
- [ ] Timers/browser APIs inside hooks go through `src/platform`, not `window.*`.
- [ ] View-model hooks return cohesive objects; no hook does unrelated double duty.
- [ ] One exported component per file (`react-refresh/only-export-components`).
- [ ] Data flows down as props; no component imports services, gateways, or platform.
- [ ] No new context provider where session + props would do
      ([../rules/11](../rules/11-state-management.md)).
- [ ] Loading/error/empty states rendered via the shared UI components, with retry on error.

## Blocking question

Could this component render in a Storybook-style harness with only props? If not, state
leaked into the wrong layer.
