# types

Cross-layer primitive type aliases with no runtime code.

## Responsibility

Shared by the domain model, platform device config, and i18n engine to keep
the dependency direction one-way — a leaf module every other layer can
depend on without creating a cycle.

## Public exports (`@/shared/types`)

- `Locale` (type) — union of the 13 supported locale codes.
- `Theme` (type) — `'system' | 'light' | 'dark'`.
- `CurrencyCode` (type) — union of the 6 supported currencies (`EGP`, `USD`,
  `EUR`, `GBP`, `SAR`, `AED`).
- `AppRouteDescriptor` (type) — `{ path?; index?; element: ReactElement }`,
  the shape a feature module contributes to the app router. Paths are
  relative; each module owns its own absolute paths in its own routes files.

## Structure

- `localization.types.ts` — locale/theme/currency unions, pure type aliases.
- `routing.types.ts` — the one router-shape type (imports the `react` type
  `ReactElement` only — an allowed foundational exception).

## Dependencies

None from the repo — this is a leaf module.

## Testing

None found directly (pure type-only module, no runtime behavior). Used as
compile-time types throughout the domain and component test suites.
