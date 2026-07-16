# Rules index

Numbered, enforceable rules for the v1.6.0 module-first architecture. Each document states
Rule / Motivation / Required / Forbidden / Enforcement / Definition of done. Start with the
non-negotiables; the rest are per-concern deep dives. Canonical agent entry:
[../AGENTS.md](../AGENTS.md).

| #   | Document                                                                                   | Concern                            |
| --- | ------------------------------------------------------------------------------------------ | ---------------------------------- |
| 00  | [00-non-negotiable-rules.md](00-non-negotiable-rules.md)                                   | The 35 hard rules                  |
| 01  | [01-architecture-and-dependency-direction.md](01-architecture-and-dependency-direction.md) | Layers and one-way imports         |
| 02  | [02-feature-modules.md](02-feature-modules.md)                                             | Module anatomy and public surfaces |
| 03  | [03-components.md](03-components.md)                                                       | UI-only components                 |
| 04  | [04-containers.md](04-containers.md)                                                       | Containers and orchestration       |
| 05  | [05-hooks-and-effects.md](05-hooks-and-effects.md)                                         | Hook isolation                     |
| 06  | [06-services-and-gateways.md](06-services-and-gateways.md)                                 | Services, gateways, dual backends  |
| 07  | [07-types-interfaces-enums-constants.md](07-types-interfaces-enums-constants.md)           | Type artifacts                     |
| 08  | [08-package-ownership.md](08-package-ownership.md)                                         | Vendor facade ownership            |
| 09  | [09-capacitor-platform-boundaries.md](09-capacitor-platform-boundaries.md)                 | Native/browser boundary            |
| 10  | [10-routing.md](10-routing.md)                                                             | Route constants and navigation     |
| 11  | [11-state-management.md](11-state-management.md)                                           | Session context + services         |
| 12  | [12-error-handling.md](12-error-handling.md)                                               | Error normalization and surfacing  |
| 13  | [13-security.md](13-security.md)                                                           | Auth, rules, secrets, privacy      |
| 14  | [14-accessibility.md](14-accessibility.md)                                                 | a11y floor                         |
| 15  | [15-internationalization.md](15-internationalization.md)                                   | en/ar catalogs, RTL                |
| 16  | [16-testing-and-coverage.md](16-testing-and-coverage.md)                                   | Test strategy and coverage         |
| 17  | [17-eslint-typescript.md](17-eslint-typescript.md)                                         | Lint and dual typecheck            |
| 18  | [18-file-naming.md](18-file-naming.md)                                                     | kebab-case + suffixes              |
| 19  | [19-exceptions-policy.md](19-exceptions-policy.md)                                         | Documented deviations              |
| 20  | [20-release-gates.md](20-release-gates.md)                                                 | CI gates and releases              |
| 21  | [21-review-checklist.md](21-review-checklist.md)                                           | Mechanical review pass             |
| —   | [versioning.md](versioning.md)                                                             | Version bump rule (pre-existing)   |

When a rule fails, the code is in the wrong layer. Move or redesign the code. Do not
disable the rule. Deviations require a written exception:
[19-exceptions-policy.md](19-exceptions-policy.md).
