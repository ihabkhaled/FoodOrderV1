# 28 — Plain language in the interface

## Rule

**Every user-facing string MUST use the word an ordinary person would use.**

- The reusable list of items is a **menu**, never a "bucket". Each locale uses
  its own natural word for a food menu, and it MUST be a translation rather than
  a transliteration of the English term.
- Where a language's existing word is grammatically gendered, the replacement
  MUST keep that gender (Spanish `carta`, German `Speisekarte`) so surrounding
  articles stay correct.
- Permission levels MUST be described by what the person can do — "Can order",
  "Can change the menu", "Can only look" — never by a role noun borrowed from
  the permission system ("Contributor", "Viewer", "Editor").
- Actions MUST say what happens: "Remove access", not "Revoke"; "Stop taking
  orders", not "Freeze".
- A destructive confirmation MUST state the consequence in the same sentence
  ("Orders already placed stay as they are").

## Motivation

The application is used by people who did not choose it and will not read
documentation. Six locales had shipped a *transliteration* of the English
jargon — `बकेट`, `バケット`, `บัคเก็ต` — which carries no meaning at all in
those languages; French called it a shopping basket. Meanwhile the tours, the
marketing site and all six guides already said "menu", so the product spoke two
languages about its central object.

Permission nouns are worse than jargon: "Contributor" looks like a word the
reader should already know, so they do not ask.

## Prohibited

- `bucket` (or a transliteration of it) in any locale value.
- Role nouns as user-visible labels.
- A confirmation that asks "Are you sure?" without saying what will happen.
- Fixing English only and leaving the other twelve locales behind.

## Enforcement

`tests/tooling/plain-language.test.mjs` fails on any banned term in any locale
and on locale files that disagree about how many strings they define.
`npm run i18n:check` proves key parity across all thirteen.

## Related

[15-internationalization.md](15-internationalization.md),
[14-accessibility.md](14-accessibility.md),
[26-mutating-actions-and-busy-state.md](26-mutating-actions-and-busy-state.md).
