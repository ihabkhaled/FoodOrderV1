# 15 — Internationalization

## Rule

Every user-visible string comes from an owned message catalog with complete entries for
all supported locales: `en`, `ar`, `it`, `fa`, `fr`, `de`, `es`, `pt-BR`,
`hi`, `th`, `zh-CN`, and `ja`. The hand-rolled `translate(locale, key)`
mechanism remains the single runtime; no i18n library is added. Arabic and Persian render
with `dir="rtl"`; every other supported locale renders LTR.

## Motivation

Locale selection is useful only when the selected catalog contains genuine copy. Key
parity alone cannot catch a catalog cloned from English, so validation also rejects blank,
placeholder, interpolation-mismatched, and substantially untranslated catalogs.

## Required

- Core engine and app-wide catalog live in `src/shared/i18n`; feature catalogs remain
  owned by their modules and are not exposed as raw cross-module data.
- Adding or changing copy updates every supported locale in the same change
  ([../skills/add-i18n-key.md](../skills/add-i18n-key.md)).
- Every catalog has exact key and interpolation-token parity with English. Validation
  rejects missing files, missing/extra keys, blanks, placeholder text, and catalogs whose
  values substantially clone English.
- Locale is a runtime preference persisted through the platform device adapter. Switching
  updates `lang` and `dir` through `src/platform/browser`, survives reload, and never
  silently coerces a supported locale to English.
- Dates, currency (default `EGP`, runtime-changeable), and numbers format through the
  shared Intl helper with the active locale.
- Firebase error copy is a complete 12-locale catalog in
  `src/packages/firebase/*-messages.constants.ts`; adapters contain behavior only.
- Locale/type declarations and message records follow rule 07 owner suffixes.

## Forbidden

- Hardcoded user-visible literals in components or containers.
- Adding one locale while aliasing it to `en`, copying English values as scaffolding, or
  weakening clone detection to make incomplete translation pass.
- Binary locale branches such as `locale === 'ar' ? ar : en`.
- A two-argument `message(en, ar)` constructor or partial record asserted as complete.
- Concatenating translated fragments to form sentences; use parameterized messages.
- Adding i18next/react-intl or exposing raw catalogs across module surfaces.

## Enforcement

- TypeScript locale/key records; `tests/i18n/message-catalog-validation.test.ts` for
  complete locale, key, token, blank, placeholder, and untranslated-catalog checks.
- `npm run i18n:check` (`scripts/i18n/check-translations.mjs`) is the standalone gate:
  it applies the same checks to every catalog directory plus structural completeness of
  `src/modules/public-content/content/locales/*.json`, and runs inside the preview
  validation pipeline before build.
- Unit tests exercise locale resolution for all 12 values.
- Playwright switches among LTR and RTL locales, verifies visible copy plus document
  `lang`/`dir`, reloads, and checks persistence.

## Definition of done

All catalogs pass the completeness and clone gates; language switching visibly changes
copy for representative LTR and RTL locales; reload preserves the locale; both RTL
locales have no clipping/overflow regression; no user-visible literal or binary fallback
remains.
