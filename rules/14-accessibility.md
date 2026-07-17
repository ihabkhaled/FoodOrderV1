# 14 — Accessibility

## Rule

Every interactive element is keyboard-operable, labeled, and announced correctly in both
`en` (LTR) and `ar` (RTL). Accessibility never regresses; `jsx-a11y` recommended runs at
error severity as part of `--max-warnings 0`.

## Motivation

This is a mobile-first bilingual app; RTL rendering and touch/keyboard parity are core
product behavior (covered by `tests/e2e/ui.spec.ts`), not polish. AGENTS.md lists
accessibility among the properties that may never be weakened.

## Required

- Semantic elements first (`button`, `nav`, `main`, `label`+`input`); ARIA only when
  semantics cannot express it.
- Every form control has a programmatic label; every icon-only button (icons from
  `@/packages/icons`) has an accessible name — localized through the message catalogs, both
  locales.
- Dialogs (`ConfirmDialog` and successors in `src/shared/ui`) trap focus, restore focus on
  close, and close on Escape.
- Focus order follows visual order in LTR and RTL; use logical CSS properties
  (`margin-inline-start`, not `margin-left`) so RTL flips correctly.
- Status changes (toasts, loading→content, order status updates) are announced via live
  regions where users depend on them.
- Color is never the only signal (order `StatusBadge` carries text, not just color).

## Forbidden

- `onClick` on non-interactive elements without role/keyboard handling.
- Suppressing any `jsx-a11y` rule without an exception document.
- Direction-dependent styling that breaks RTL; hardcoded `left`/`right` where
  logical properties exist.
- Removing/weakening e2e assertions that cover RTL or responsive shell behavior.

## Enforcement

- `jsx-a11y` flat recommended config (error, `--max-warnings 0`).
- Playwright `mobile-chrome` project + `tests/e2e/ui.spec.ts` (responsive/theme/RTL).
- Review checklist item in [21-review-checklist.md](21-review-checklist.md).

## Definition of done

Lint clean; new interactive UI verified keyboard-only; screen-affecting changes verified in
`ar` (RTL) as well as `en`; e2e suites green on both chromium and mobile-chrome projects.
