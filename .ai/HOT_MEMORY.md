<!-- GENERATED: scripts/knowledge/cli.mjs; DO NOT EDIT -->
# Hot memory

- The destination is a clean Capacitor rewrite; React Native source is not part of the active architecture.
- Original `inputValues: string[]` buckets can be migrated, but original records contain no prices, descriptions, order history, or lifecycle state.
- `MyOrdersScreen` in the original prototype duplicated buckets and was not a real order feature; FoodOrderV1 implements a separate order model.
- Local-device mode is deliberately functional for development but is not secure cross-device identity.
- Production Firebase provisioning, data retention/deletion approval, and native store signing remain unresolved deployment work.
