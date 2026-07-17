# Architecture decision records

Decisions behind the v1.6.0 module-first architecture. All records below: status
**Accepted**, 2026-07-16. Earlier decisions live in
[../decisions/active/](../decisions/active/ADR-001-capacitor-migration.md) (pre-1.6.0
numbering) and remain in force unless superseded here.

| ADR                                                   | Decision                                              |
| ----------------------------------------------------- | ----------------------------------------------------- |
| [0001](0001-module-first-architecture.md)             | Module-first layered source architecture              |
| [0002](0002-ui-only-components-and-hook-isolation.md) | UI-only components and hook isolation                 |
| [0003](0003-package-ownership.md)                     | One owner facade per npm dependency                   |
| [0004](0004-platform-boundary.md)                     | All environment access behind `src/platform`          |
| [0005](0005-data-access-module.md)                    | Cross-feature persistence lives in `data-access`      |
| [0006](0006-error-normalization.md)                   | Bilingual Firebase error table in `packages/firebase` |
| [0007](0007-testing-and-coverage-policy.md)           | E2E-first screens, 100% pure layers                   |
| [0008](0008-governance-and-agent-instructions.md)     | Versioned governance and agent instructions           |

Writing a new ADR: copy the section structure (Status / Context / Decision / Consequences /
Enforcement), take the next number, add it here and to
[../../memory/architectural-decisions.md](../../memory/architectural-decisions.md).
A "permanent exception" to a rule is an ADR; a bounded deviation is an exception document
([../../rules/19-exceptions-policy.md](../../rules/19-exceptions-policy.md)).
