# Dependency direction

Enforced by `architecture/no-restricted-layer-imports` +
`architecture/no-cross-module-deep-imports` (error severity). Full rule:
[../rules/01-architecture-and-dependency-direction.md](../rules/01-architecture-and-dependency-direction.md).

## Matrix (row = importer, column = imported)

| may import → | app | modules       | shared | platform | packages     | vendor     |
| ------------ | --- | ------------- | ------ | -------- | ------------ | ---------- |
| **app**      | yes | surface only  | yes    | yes      | surface only | react only |
| **modules**  | NO  | surface only* | yes    | yes      | surface only | react only |
| **shared**   | NO  | NO            | yes    | yes      | surface only | react only |
| **platform** | NO  | NO            | NO     | yes      | surface only | react only |
| **packages** | NO  | NO            | NO     | NO       | own dir only | owned pkg  |

- "surface only" = the `index.ts` public API via `@/modules/<name>` / `@/packages/<name>`.
- `*` module→module: feature modules may depend on `session` and `data-access`; `session`
  and `data-access` never import feature modules; no module cycles.
- "react only": `react` / `react/jsx-runtime` are foundational everywhere UI-shaped;
  `react-dom/client` only in `src/main.tsx`.
- Relative imports are resolved before matching — `../../` escapes cannot bypass the matrix.

## Quick answers

- A module needs a browser API → add/extend a `src/platform` adapter, import that.
- A module needs Firestore → it doesn't; it needs a `data-access` contract.
- Two modules need the same component → move it to `src/shared/ui`.
- `shared` helper needs env config → via `src/platform/environment`'s typed `env`.
- A package facade needs a project type → it can't; invert (pass it in) or the type
  belongs beside the facade.
- Anything needs `src/app` → never; `app` is the top, composition only.

## Verification

```bash
npm run lint               # layer matrix + surfaces
npm run quality:circular   # madge: zero cycles in src/
```
