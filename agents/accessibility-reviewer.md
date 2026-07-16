# Accessibility reviewer

Scope: any rendered UI, in both locales. Rules: [../rules/14](../rules/14-accessibility.md),
[../rules/15](../rules/15-internationalization.md).

## Checklist

- [ ] Semantic elements used (`button` not clickable `div`; `label` bound to every input).
- [ ] Every icon-only control (icons from `@/packages/icons`) has a localized accessible
      name in `en` AND `ar`.
- [ ] Full keyboard path: reachable, operable, visible focus, logical order — verified by
      tabbing through the changed screen.
- [ ] Dialogs trap focus, restore it on close, close on Escape (shared `ConfirmDialog`
      pattern).
- [ ] Status/async changes users depend on are announced (live region or focus move);
      loading→content→error transitions are perceivable.
- [ ] RTL verified: switch locale to `ar` in Settings — direction flips, no clipped or
      overlapped layout, logical CSS properties used (no hardcoded left/right).
- [ ] Color never the only signal (status badges carry text).
- [ ] Touch targets adequate on mobile-chrome (Pixel 7 project) — e2e green on both
      Playwright projects.
- [ ] Zero `jsx-a11y` suppressions added.
- [ ] New copy exists in both catalogs; no hardcoded user-visible literal
      ([../skills/add-i18n-key.md](../skills/add-i18n-key.md)).

## Blocking question

Can a keyboard-only Arabic-locale user complete this flow end-to-end? If unverified, the
review is not done.
