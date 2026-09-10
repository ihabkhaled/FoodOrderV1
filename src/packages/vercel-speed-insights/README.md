# vercel-speed-insights

Owned facade for `@vercel/speed-insights`'s React entry point
(`@vercel/speed-insights/react`, not `/next` — this app is Vite + React
Router).

## Responsibility

Isolates the rest of the app from the Vercel Speed Insights SDK, per
[rules/08-package-ownership.md](../../../rules/08-package-ownership.md).

## Public exports (`@/packages/vercel-speed-insights`)

- `SpeedInsights` — the React component that reports Core Web Vitals and
  other performance metrics to Vercel.

## Structure

- `index.ts` — single-file re-export; no adapting logic.

## Dependencies

None.

## Consumers

`src/app/providers/vercel-insights.container.tsx`, which gates rendering the
component on the person's analytics consent level — modules never import
this package directly.

## Testing

`tests/components/VercelInsights.test.tsx` mocks the `SpeedInsights` export
and asserts it fires at "operational" consent and above but not at "denied".
