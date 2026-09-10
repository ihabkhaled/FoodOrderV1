# vercel-analytics

Owned facade for `@vercel/analytics`'s React entry point
(`@vercel/analytics/react`, not `/next` — this app is Vite + React Router).

## Responsibility

Isolates the rest of the app from the Vercel Analytics SDK, per
[rules/08-package-ownership.md](../../../rules/08-package-ownership.md).

## Public exports (`@/packages/vercel-analytics`)

- `Analytics` — the React component that reports page-view analytics to
  Vercel.

## Structure

- `index.ts` — single-file re-export; no adapting logic.

## Dependencies

None.

## Consumers

`src/app/providers/vercel-insights.container.tsx`, which gates rendering the
component on the person's analytics consent level — modules never import
this package directly.

## Testing

`tests/components/VercelInsights.test.tsx` mocks the `Analytics` export and
asserts it is invoked or not based on analytics consent level.
