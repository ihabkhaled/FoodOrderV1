# Skill: add an i18n key

## Required reading

[../rules/15-internationalization.md](../rules/15-internationalization.md),
[../rules/14-accessibility.md](../rules/14-accessibility.md), the target catalog (core:
`src/shared/i18n` — legacy `src/i18n/messages.ts`; social: module catalog — legacy
`src/i18n/socialMessages.ts`; group orders: legacy `src/i18n/groupOrderMessages.ts`).

## Preconditions

- The right catalog is identified: core app copy vs feature-owned copy (social /
  group-orders keep their own catalogs in their modules).
- The `ar` translation is real Arabic copy, not transliterated English. If you cannot
  produce it confidently, flag it in the PR instead of guessing silently.

## Steps

1. Add the key with values to BOTH the `en` and `ar` maps of the catalog in the same edit.
   The `as const` catalogs derive the key union — a single-locale addition fails
   `npm run typecheck`.
2. Consume via the catalog's translate function (`translate(locale, key)` /
   `translateSocial` / `translateGroupOrder` or their module-owned successors); pass
   resolved strings into components as props.
3. For dynamic values, use the catalog's parameterized-message pattern — never concatenate
   translated fragments.
4. Check the rendered `ar` string in RTL: direction, wrapping, no clipped layout
   (Settings switches locale at runtime).
5. If the key names an interactive control, it doubles as the accessible name — keep it
   imperative and specific.

## Forbidden shortcuts

- Hardcoding the string "temporarily" (the migration is deleting exactly such cases:
  `ErrorState`'s `Try again`, `NotFoundPage`'s copy).
- English placeholder in the `ar` map.
- Reusing a semantically different key because the English text happens to match.

## Required tests

Typecheck is the completeness gate. If an e2e spec asserts visible text on the affected
screen, update it; RTL/locale behavior is covered by `tests/e2e/ui.spec.ts`.

## Validation

```bash
npm run typecheck && npm run typecheck:tsc && npm run lint && npm run test
npm run test:e2e   # when visible-copy assertions changed
```

## Definition of done

Both locales present, all consumers use the key, `ar` rendering verified, no user-visible
literal introduced.
