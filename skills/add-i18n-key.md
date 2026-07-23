# Skill: add an i18n key

## Required reading

[../rules/15-internationalization.md](../rules/15-internationalization.md),
[../rules/14-accessibility.md](../rules/14-accessibility.md), the target catalog (core:
`src/shared/i18n/locales/*.json`; feature copy: the owning module's
`src/modules/<module>/i18n/locales/*.json` — group-orders, order-sessions,
session-invites, settings, social).

## Preconditions

- The right catalog is identified: core app copy vs feature-owned copy (feature modules
  keep their own catalogs; never add feature strings to the core catalog).
- Real translations exist for ALL 12 locales: `en`, `ar`, `it`, `fa`, `fr`, `de`, `es`,
  `pt-BR`, `hi`, `th`, `zh-CN`, `ja`. If you cannot produce one confidently, flag it in
  the PR instead of guessing silently — never commit an English placeholder.

## Steps

1. Add the key with a translated value to EVERY locale JSON of the catalog in the same
   edit, keeping the key order identical to `en.json`. The catalogs derive the key union
   from `en` — a missing locale entry fails `npm run i18n:check` and the vitest parity
   suite.
2. Preserve interpolation placeholders (`{count}`, `{name}`, …) verbatim in every locale;
   only their position in the sentence may change.
3. Consume via the catalog's translate function (`translate(locale, key)` or the
   module-owned equivalent); pass resolved strings into components as props.
4. For dynamic values, use the parameterized-message pattern — never concatenate
   translated fragments.
5. Check the rendered `ar` and `fa` strings in RTL: direction, wrapping, no clipped
   layout (Settings switches locale at runtime).
6. If the key names an interactive control, it doubles as the accessible name — keep it
   imperative and specific.

## Forbidden shortcuts

- Hardcoding the string "temporarily".
- English placeholder values in any non-English locale.
- Aliasing a locale to English or weakening the untranslated-catalog clone gate.
- Reusing a semantically different key because the English text happens to match.

## Required tests

`npm run i18n:check` and `tests/i18n/message-catalog-validation.test.ts` are the
completeness gates. If an e2e spec asserts visible text on the affected screen, update
it; RTL/locale behavior is covered by `tests/e2e/ui.spec.ts`.

## Validation

```bash
npm run i18n:check && npm run typecheck && npm run typecheck:tsc && npm run lint && npm run test
npm run test:e2e   # when visible-copy assertions changed
```

## Definition of done

All 12 locales present with genuine translations, all consumers use the key, RTL
rendering verified, no user-visible literal introduced, `npm run i18n:check` passes.
