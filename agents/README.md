---
id: AGENT-README
title: Reviewer Personas
type: agent
authority: canonical
status: active
owner: knowledge-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Reviewer persona checklists for FoodOrderV1 v1.6.0 module-first architecture.
scope:
  - repository
readWhen:
  - selected by task risk
lastVerified: 2026-07-16
verificationMethod: source and test inspection
generated: false
---

# Reviewer personas

Governance-Version: 1

Checklists for self-review before hand-off and for PR review. Select personas by what the
diff touches — never run all of them on a routine change. Every blocking finding cites the
file/line evidence and the rule it violates
([../rules/README.md](../rules/README.md)).

| Persona                                                        | Run when the diff touches                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [architecture-reviewer.md](architecture-reviewer.md)           | Any file in `src/` (layer placement, imports, surfaces)                               |
| [react-hooks-reviewer.md](react-hooks-reviewer.md)             | Components, containers, hooks, providers                                              |
| [capacitor-reviewer.md](capacitor-reviewer.md)                 | `src/platform`, `src/packages/capacitor-*`, `capacitor.config.ts`, `android/`, `ios/` |
| [security-reviewer.md](security-reviewer.md)                   | `firestore.rules`, auth, `functions/`, sharing, secrets, dependencies                 |
| [accessibility-reviewer.md](accessibility-reviewer.md)         | Any rendered UI                                                                       |
| [testing-reviewer.md](testing-reviewer.md)                     | Every behavior change                                                                 |
| [package-boundary-reviewer.md](package-boundary-reviewer.md)   | `package.json` deps, `src/packages/`, ownership registry                              |
| [type-safety-reviewer.md](type-safety-reviewer.md)             | Types, contracts, tsconfig, lint config                                               |
| [release-readiness-reviewer.md](release-readiness-reviewer.md) | Version bumps, release prep, CI workflow                                              |

Legacy personas from the pre-1.6.0 knowledge system (`architecture-guardian.md`,
`context-router.md`, `frontend-reviewer.md`, `release-reviewer.md`) are superseded by this
set and kept only for history.
