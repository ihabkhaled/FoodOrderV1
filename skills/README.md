# Skills index

Task playbooks for FoodOrderV1. Pick the one matching your task (routing table in
[../AGENTS.md](../AGENTS.md)), read its required reading, and follow the steps. Each
playbook assumes you already ran the knowledge flow
(`npm run knowledge:context -- --task="..."`).

| Skill                                                        | Use when                                            |
| ------------------------------------------------------------ | --------------------------------------------------- |
| [create-feature-module.md](create-feature-module.md)         | A new feature needs its own `src/modules/<name>`    |
| [create-component.md](create-component.md)                   | New UI-only component                               |
| [create-container.md](create-container.md)                   | New screen/panel orchestration                      |
| [create-hook.md](create-hook.md)                             | New view-model or behavior hook                     |
| [create-service-or-gateway.md](create-service-or-gateway.md) | New persistence/integration behavior                |
| [add-route.md](add-route.md)                                 | New route or path change                            |
| [add-capacitor-plugin.md](add-capacitor-plugin.md)           | New native capability                               |
| [create-package-owner.md](create-package-owner.md)           | Any new npm dependency for app code                 |
| [add-i18n-key.md](add-i18n-key.md)                           | New or changed user-visible copy                    |
| [write-unit-tests.md](write-unit-tests.md)                   | Unit/integration coverage                           |
| [write-e2e-tests.md](write-e2e-tests.md)                     | Playwright journey coverage                         |
| [refactor-legacy-component.md](refactor-legacy-component.md) | Migrating legacy `src/` files into the layered tree |
| [fix-eslint-typecheck.md](fix-eslint-typecheck.md)           | Lint or typecheck failures                          |
| [document-exception.md](document-exception.md)               | A rule genuinely cannot hold                        |
| [final-validation.md](final-validation.md)                   | Pre-merge / pre-release full pass                   |
| [versioning/SKILL.md](versioning/SKILL.md)                   | Version bump and release (pre-existing)             |

Universal forbidden shortcuts: disabling `architecture/*` rules, skipping tests, hand-editing
`.ai/`, bypassing husky hooks, claiming unexecuted validation.
