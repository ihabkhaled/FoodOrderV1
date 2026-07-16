# Context maps

Governance-Version: 1

Orientation maps for the v1.6.0 module-first architecture. The `src/` migration is in
flight: these maps describe the **target layout, which is the mechanically enforced end
state** (the ESLint architecture plugin runs at error severity on all
`src/{app,modules,shared,platform,packages}` paths from the first migrated file). Where a
map names a legacy path, it is labeled as such; live migration progress is tracked in
[../docs/migration/module-migration-status.md](../docs/migration/module-migration-status.md).

| Map                                                        | Answers                                      |
| ---------------------------------------------------------- | -------------------------------------------- |
| [architecture-map.md](architecture-map.md)                 | What lives where (full tree)                 |
| [dependency-direction.md](dependency-direction.md)         | Who may import whom                          |
| [module-anatomy.md](module-anatomy.md)                     | Inside one feature module                    |
| [package-ownership.md](package-ownership.md)               | Which facade owns which dependency           |
| [capacitor-capability-map.md](capacitor-capability-map.md) | Native capabilities and their seams          |
| [routing-map.md](routing-map.md)                           | Every route and its owning module            |
| [state-ownership-map.md](state-ownership-map.md)           | Where each kind of state lives               |
| [error-flow-map.md](error-flow-map.md)                     | How errors travel to the user                |
| [data-boundary-map.md](data-boundary-map.md)               | Cloud/local persistence and trust boundaries |
| [test-strategy-map.md](test-strategy-map.md)               | Which test level covers what                 |

Older orientation docs from the pre-1.6.0 knowledge system (`00-start-here.md`,
`project-summary.md`, `task-router.md`, `common-change-paths.md`, `current-known-risks.md`)
describe the legacy layout; where they conflict with these maps, these maps and
[../AGENTS.md](../AGENTS.md) win.
