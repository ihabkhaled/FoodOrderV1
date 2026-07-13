# Phase 02 — NextRanger rule inventory and Capacitor adaptation map

Source: `ihabkhaled/NextRanger@main` (Next.js 15 App Router reference). Audited 2026-07-13.

## Inventory (verified)
- Rule documents: `rules/00-non-negotiable-rules.md` … `rules/14-i18n-rtl.md` (15 files).
- ESLint architecture: `eslint/*.config.mjs` (22 configs) including a custom `architecture-plugin` enforcing layer boundaries; strict `--max-warnings=0`.
- Toolchain: TypeScript **^5.9.3** with `tsgo` (native preview) + `tsc` fallback; Prettier; Husky + lint-staged + commitlint; Vitest 4; Playwright (e2e/a11y/visual); Knip (dead code); Madge (circular); `npm audit` + `trivy fs --scanners vuln,secret,misconfig`; npm-check-updates.
- Structure: `src/app` (bootstrap/routes), `src/modules/<feature>`, `src/packages/<vendor>` (single owner per third-party lib: axios, browser, date, env, forms, i18n, icons, image, link, logger, navigation, query, storage, toast, ui-primitives, zod, zustand), `src/shared`.

## Adaptation decisions for FoodOrderV1 (Capacitor/Vite, small app)
| NR rule | Disposition in FoodOrderV1 | Enforcement |
|---|---|---|
| NR-001 module boundaries | Adapted to flat small-app layout: `src/lib` (pure domain) / `src/services` (adapters, single Firebase+Capacitor owners) / `src/state` / `src/pages` / `src/components` | code review + typecheck path aliases; documented in `.ai/BOOTSTRAP.md` |
| NR-002/003 presentational purity | Pages are containers; `src/components/*` render props only (no data access) | review; jsx structure |
| NR-005 no enum | `as const` + union types only (verified: no `enum` keyword in src) | grep + lint |
| NR-006/015/016 no magic strings | Firestore paths built only in `firebaseServices.ts` ref helpers; storage keys in `localServices.ts`/`deviceConfig.ts` consts; routes in `App.tsx`; message keys in `i18n/messages.ts` | single-owner modules |
| NR-007/010/011 wrappers | Firebase SDK only in `services/firebaseServices.ts`; Capacitor plugins + clipboard/share/navigator only in `services/platform.ts`; `import.meta.env` only in `config/env.ts` (verified by grep) | grep gate + review |
| NR-009 no server state in stores | No Zustand; server data fetched per page, session state in one context | dependency absent |
| NR-012 message catalogs | `src/i18n/messages.ts` en+ar complete; `dir=rtl` for ar | i18n key type `MessageKey` |
| NR-014 strict TS | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, no `any`/`@ts-ignore` in src | `npm run typecheck` |
| NR-019 TDD | Domain engines (bucket/order/sharing) covered by unit tests written with the behavior | vitest |
| NR-020 gates | `npm run validate` = knowledge + typecheck + lint + tests + build; CI mirrors | `.github/workflows/ci.yml` |
| NR-021/022/23/27 | `eslint.config.js`: typescript-eslint strict+stylistic type-checked, react-hooks, no-floating-promises | lint |
| NR-032/033 dead/circular | Deferred: Knip/Madge not yet wired (recorded gap — small codebase, `noUnusedLocals` catches most) | backlog |
| NR-034/035/036/037 format/commits/hooks | Prettier via `scripts/check-format.mjs`; commitlint/husky deferred (solo repo, CI enforces gates) — documented deviation | CI |
| NR-038/039/040 audits/scans | `npm audit` + `trivy fs` executed in Phase 11 with results in `audit/security-review.md` | local + CI backlog |
| NR-042..47 native/web security | Android: cleartext off (default), `androidScheme:https`, minimal permissions (INTERNET only), WebView limited to app origin; CSP N/A for file-served WebView (documented) | Phase 13 manifest review |
| Next.js-only rules (App Router, next.config, Server Components) | NOT APPLICABLE — no Next.js runtime | n/a |

Deviations are deliberate, recorded here and in the risk register; none weaken security, typing, isolation, localization, or testability.
