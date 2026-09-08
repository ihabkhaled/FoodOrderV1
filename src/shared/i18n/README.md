# i18n

The hand-rolled thirteen-locale translation engine: supported-locale
registry/direction/matching, the `translate(locale, key)` lookup, the raw
locale JSON catalogs, and a catalog-consistency validator.

## Responsibility

- Owns which locales are supported, their direction (RTL for `ar`/`fa`), and
  matching a browser `Accept-Language`-style list against them.
- Resolves the locale to use: stored preference if valid, else best browser
  match, else fallback.
- The core `translate(locale, key)` lookup every module's own i18n catalog
  is layered on top of (this repo splits catalogs across seven directories
  — see the shared `en.json` here plus each module's `i18n/locales/`).
- Validates every locale catalog against the reference (`en`): missing/
  unknown keys, blank or non-string values, mismatched `{token}`
  interpolation placeholders, and a heuristic for a catalog that is still
  effectively untranslated (≥80% identical to the reference).

## Public exports (`@/shared/i18n`)

- `DEFAULT_LOCALE`, `SUPPORTED_LOCALES`, `LOCALE_DEFINITIONS`,
  `LocaleDefinition` / `LocaleDirection` (types), `RTL_LOCALES`.
- `isSupportedLocale(value)`, `localeDirection(locale)`,
  `matchSupportedLocale(preferredLanguages)`,
  `resolvePreferredLocale(storedLocale, preferredLanguages, fallback?)`.
- `MessageKey` (type) — `keyof typeof messages.en`.
- `translate(locale, key)`.
- `MessageCatalogValidationIssue` / `MessageCatalogValidationIssueCode`
  (types), `assertMessageCatalogsValid(catalogs, referenceLocale?)`,
  `validateMessageCatalogs(catalogs, referenceLocale?)`.

## Structure

- `locale.constants.ts` — supported-locale registry, direction, browser
  -language matching.
- `messages.constants.ts` — imports all `locales/*.json` catalogs and
  assembles the `messages` map + `MessageKey` type.
- `translate.helper.ts` — the lookup function.
- `message-catalog-validation.helper.ts` — the consistency validator.
- `locales/` — 13 flat JSON message catalogs (`ar`, `ar-Latn`, `de`, `en`,
  `es`, `fa`, `fr`, `hi`, `it`, `ja`, `pt-BR`, `th`, `zh-CN`); `en.json` is
  the reference and type source.

## Dependencies

`@/shared/types` (`Locale`). No `@/platform/*` or `@/packages/*` imports —
this is the core i18n engine other layers build on.

## Testing

`tests/i18n/locale-runtime.test.ts`,
`tests/i18n/message-catalog-validation.test.ts` (also validates several
modules' own message constants against this engine).
