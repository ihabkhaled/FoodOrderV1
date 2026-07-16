# 15 — Internationalization

## Rule

Every user-visible string comes from a typed message catalog with complete `en` and `ar`
entries, looked up via the hand-rolled `translate(locale, key)` mechanism. No i18n library
is added. RTL support is total: the app renders correctly with `dir="rtl"` whenever the
locale is `ar`.

## Motivation

The catalogs (legacy `src/i18n/messages.ts` + `socialMessages.ts` + `groupOrderMessages.ts`;
227 lookups across 24 files) are typed, flat, and dependency-free — exactly enough for a
two-locale app. Message keys are checked by the compiler (`MessageKey` unions), so a
missing translation is a type error, not a runtime fallback.

## Required

- Core engine and app-wide catalog in `src/shared/i18n`; feature catalogs owned by their
  module (social copy with `src/modules/social`, group-order copy with
  `src/modules/group-orders`) and exposed through module-internal helpers.
- Adding copy = adding the key to BOTH locale maps in the same commit
  ([../skills/add-i18n-key.md](../skills/add-i18n-key.md)); the `as const` catalog + key
  union makes a one-locale addition fail typecheck.
- Locale is a runtime preference (session module, persisted via platform storage; default
  from `VITE_DEFAULT_LOCALE`); switching updates `document` `lang`/`dir` through
  `src/platform/browser`.
- Dates, currency (default `EGP`, runtime-changeable), and numbers format via `Intl` with
  the active locale.
- Firebase error copy is bilingual inside `src/packages/firebase` (EXC-4).

## Forbidden

- Hardcoded user-visible literals in components/containers (the migration fixes the two
  known violators: `ErrorState`'s `Try again`, `NotFoundPage`'s four strings).
- Adding a key to one locale only; leaving `ar` as a copy of `en` "for now".
- Concatenating translated fragments to build sentences (word order differs); use
  parameterized message functions instead.
- Adding i18next/react-intl or exposing raw catalogs across module surfaces.

## Enforcement

- TypeScript key unions (missing key/locale = compile error); review checklist for new
  literals (no mechanical literal-detection rule exists — reviewers grep the diff).
- `tests/e2e/ui.spec.ts` exercises language switching and RTL.

## Definition of done

Both locales updated, typecheck green, the screen verified in `ar` with correct direction
and no clipped/overflowing RTL layout, and no user-visible literal left in JSX.
