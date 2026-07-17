# Architectural decisions (log)

Index of durable decisions with their reasoning homes. Full records live in
[../architecture/adrs/](../architecture/adrs/README.md); this log exists so memory readers
see the decision landscape at a glance.

| Decision                                                                 | Record                                                                              | One-line why                                                                               |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Module-first layered architecture (app/modules/shared/platform/packages) | [ADR-0001](../architecture/adrs/0001-module-first-architecture.md)                  | Feature ownership + mechanically enforceable boundaries over the grown type-of-file layout |
| UI-only components; hooks isolated to hook files                         | [ADR-0002](../architecture/adrs/0002-ui-only-components-and-hook-isolation.md)      | 196 scattered hook calls made screens untestable and unmovable                             |
| One owner facade per npm dependency                                      | [ADR-0003](../architecture/adrs/0003-package-ownership.md)                          | Single audit/replacement point per vendor; unregistered deps rejected by lint              |
| All environment access behind `src/platform`                             | [ADR-0004](../architecture/adrs/0004-platform-boundary.md)                          | Three runtimes (browser, Android WebView, e2e) need one testable seam                      |
| Cross-feature persistence stays in `data-access` (EXC-1)                 | [ADR-0005](../architecture/adrs/0005-data-access-module.md)                         | Dual-backend cohesive gateway classes; no rewrite without characterization tests           |
| Firebase error table (en/ar) inside `packages/firebase` (EXC-4)          | [ADR-0006](../architecture/adrs/0006-error-normalization.md)                        | Shipped, tested bilingual mapping; re-keying is a behavior-affecting rewrite               |
| E2E-first for screens; 100% on pure layers (EXC-3)                       | [ADR-0007](../architecture/adrs/0007-testing-and-coverage-policy.md)                | Journeys catch integration breaks; pure logic is cheap to cover exhaustively               |
| Governance docs with versioned agent entrypoints                         | [ADR-0008](../architecture/adrs/0008-governance-and-agent-instructions.md)          | Multiple agents need one canonical, checkable source of truth                              |
| Capacitor over native rewrite                                            | [ADR-001 (legacy)](../architecture/decisions/active/ADR-001-capacitor-migration.md) | Pre-1.6.0 decision, still active                                                           |
| SemVer bump by prompt density                                            | [rules/versioning.md](../rules/versioning.md)                                       | Pre-1.6.0 rule, still active                                                               |

Standing pre-1.6.0 decisions that remain in force: no server-state/query library, no global
store library (React context + service singletons); local-device mode is a first-class
build-time fallback; `en`/`ar` hand-rolled catalogs with full RTL; Firebase config only via
env; `.ai/` generated knowledge system as the agent context mechanism.
