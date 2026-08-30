# Skill: add a public guide page

## Required reading

[../rules/15-internationalization.md](../rules/15-internationalization.md),
[../docs/operations/public-content.md](../docs/operations/public-content.md)
(if present), and `scripts/public-content/add-guide-page.mjs`.

## Why guides exist

The public site was rejected for thin content: ten pages carrying about 1,500
English words in total. Guides are the remedy — real, step-by-step explanations
someone would search for, not padding. A guide that does not teach something a
reader could act on is worse than no guide, because thin pages are exactly what
gets a site rejected.

## Preconditions

The behaviour the guide describes already exists in the app. A guide is
documentation, not a promise.

## Steps

1. **Write the definition module.** Export a default object:

   ```js
   export default {
     id: 'run-an-order-round',
     slug: 'run-an-order-round',
     navigation: false,   // guides are linked from content, not the top nav
     adEligible: true,
     copy: { en: {...}, ar: {...} },   // the catalogue locales
     locales: { 'ar-Latn': {...}, it: {...}, /* nine more */ },
   };
   ```

   Each copy object needs `navigationLabel`, `seoTitle`, `description`,
   `eyebrow`, `heading`, `introduction`, `sections[]`, and `faq[]`.

2. **Keep parity.** Every locale needs the same number of sections and FAQ
   entries as English, and the same number of paragraphs per section. The
   registration script checks this before writing anything, and the content
   validator checks it again at build time.

3. **Aim for depth.** Target 500+ words per locale across four or five
   sections, plus three FAQ entries. FAQ entries earn `FAQPage` structured data
   automatically, so write real questions a reader would ask.

4. **Register it:**

   ```bash
   node scripts/public-content/add-guide-page.mjs path/to/definition.mjs
   ```

   This writes the catalogue, the eleven locale files, the runtime route
   registry, and the Vercel bare-path redirect list together.

5. **Add the id to `PublicRouteId`** in
   `src/modules/public-content/types/public-content.types.ts`. The script
   deliberately does not do this: it is type-level policy and TypeScript should
   fail until a person adds it on purpose.

6. **Build and validate:** `npm run build:web`. The document count must rise by
   thirteen. Then `npm run lint`, `npm run typecheck`, `npm run test:ai`,
   `npm run i18n:check`, and `npm run knowledge:build:incremental` **last**.

## Verification

Open `dist/en/<slug>/index.html` and one right-to-left locale
(`dist/ar/<slug>/`). Confirm the title, the `hreflang` set (27 entries), and
that `FAQPage` appears in the structured data.

## Prohibited

- Machine-padded or duplicated prose to reach a word count.
- Shipping English while other locales carry placeholders.
- Editing the generated `dist/` output.
- A guide describing behaviour the app does not have.
