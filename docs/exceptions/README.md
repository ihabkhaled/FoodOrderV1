# Exceptions

Governance-Version: 1

Process and template for documented deviations from the architecture rules. Policy:
[../../rules/19-exceptions-policy.md](../../rules/19-exceptions-policy.md). The founding
principle stands above every exception:

> When a rule fails, the code is in the wrong layer. Move or redesign the code. Do not
> disable the rule.

An exception is the rare case where moving/redesigning is genuinely worse — and it exists
only once it is written down here (or, for the migration set, in
[../migration/unresolved-exceptions.md](../migration/unresolved-exceptions.md)).

## Active exceptions

The v1.6.0 migration set lives in
[../migration/unresolved-exceptions.md](../migration/unresolved-exceptions.md):

| ID    | Deviation                                                                    | Removal condition                                                     |
| ----- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| EXC-1 | Cross-feature persistence gateways live in `src/modules/data-access`         | Per-feature characterization tests for the persistence layer          |
| EXC-2 | `@capacitor/app` / `@capacitor/keyboard`: registry entries, no owner modules | First web-code usage creates the owner module                         |
| EXC-3 | Coverage instrumentation scoped to pure layers; screens covered by e2e       | Screen-level unit suites added module by module post-1.6.0            |
| EXC-4 | Bilingual vendor error copy inside `src/packages/firebase`                   | A third locale converts the table to message keys                     |
| EXC-5 | iOS validation not executed                                                  | macOS environment: `cap sync ios` + Xcode audit before an iOS release |

New exceptions (post-migration) are added to THIS directory as `EXC-<n>-<slug>.md`,
numbered after EXC-5.

## Process

1. Exhaust the compliant designs first (move down a layer, extract hook/helper, add a
   facade, split the file) — see
   [../../skills/document-exception.md](../../skills/document-exception.md).
2. Write the exception using the template below; take the next free EXC number.
3. Reference the EXC ID in a comment at the covered code site and from any related
   rule/context doc; any mechanical carve-out in `eslint.config.js` must cite the ID.
4. Get it reviewed in the same PR as the deviation — it is a governance change.
5. Run `npm run knowledge:build:incremental && npm run knowledge:validate`.
6. Exceptions are audited at review ([../../rules/21-review-checklist.md](../../rules/21-review-checklist.md))
   and release readiness; scope creep is a blocking finding. When the removal condition is
   met, remove the deviation and mark the document superseded.

## Template

```markdown
## EXC-<n>: <one-line deviation>

- **Rule**: <the rule this deviates from, with a link into rules/>
- **Reason**: <why the compliant design is genuinely worse here — cost, risk to working
  tested code, missing environment. Be concrete; cite files and numbers.>
- **Mitigation**: <what bounds the damage: surfaces, one-way deps, tests, single audit
  point — and the command that proves it (lint/madge/coverage).>
- **Owner**: <the single accountable person/role>
- **Removal condition**: <the concrete, testable event that ends this exception>
```

An exception excuses exactly one named rule for exactly the files it lists — nothing else.
