# helpers

Pure, feature-agnostic utility functions with zero React and zero
browser-global dependencies, usable by any module or platform code.

## Responsibility

Dates, ids, i18n-aware number/list/plural formatting, money rounding and
formatting, cursor-based pagination, and email/password validation.

## Public exports (`@/shared/helpers`)

- `formatDateTime(value, locale?)`, `nowIso()`.
- `createId(prefix?)` — `${prefix}_${crypto.randomUUID()}`.
- `formatList`, `formatNumber`, `pluralCategory`, `selectPlural`,
  `PluralCategory` / `PluralForms<Value>` (types) — thin wrappers over
  `Intl.ListFormat` / `Intl.NumberFormat` / `Intl.PluralRules`.
- `formatMoney(value, currency, locale?)`, `roundMoney(value)` — epsilon-safe
  2-decimal rounding plus `Intl.NumberFormat` currency display.
- `decodeSortCursor`, `encodeSortCursor`, `MAX_PAGE_SIZE`,
  `normalizePageLimit`, `paginateDescending`, `PageRequest` /
  `PageResult<Item>` (types) — a full cursor-based descending-sort
  pagination implementation over in-memory arrays, used by the local-mode
  data gateways.
- `isEmail(value)`, `validatePassword(value)` — the latter returns a
  message key (`'passwordTooShort' | null`) for the caller to localize.

## Structure

One file per concern, each independently testable: `date.helper.ts`,
`id.helper.ts`, `intl.helper.ts`, `money.helper.ts`, `pagination.helper.ts`,
`validation.helper.ts`.

## Dependencies

`@/shared/types` (`Locale`, `CurrencyCode`). Uses global `crypto.randomUUID`
and `Intl.*`; no `@/platform/*` or `@/packages/*` imports.

## Testing

`tests/domain/sharedHelpers.test.ts`, `tests/domain/pagination.test.ts`.
