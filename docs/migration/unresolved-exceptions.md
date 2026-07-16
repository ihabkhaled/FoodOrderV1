# Unresolved Exceptions

Deliberate, documented deviations from the target architecture. Each has an
owner and a removal condition; none may silently expand.

## EXC-1: Cross-feature persistence gateways live in `src/modules/data-access`

- **Rule**: gateways belong to their owning feature module.
- **Reason**: `DataService` (profile + buckets + orders + dashboard) is one
  contract implemented by two cohesive dual-backend classes
  (Firestore/local) that share one storage schema and helper set. Splitting
  them per-feature would rewrite ~1,600 lines of working persistence logic
  the tests characterize only partially — forbidden by the migration rules
  ("do not rewrite working business logic without tests").
- **Mitigation**: `data-access` is a proper module with one public surface;
  feature modules depend on it one-way (no module cycles); contracts are
  interface-typed per service.
- **Owner**: repo owner. **Removal condition**: when per-feature
  characterization tests exist for the persistence layer, split the gateway
  classes per module.

## EXC-2: `@capacitor/app` / `@capacitor/keyboard` have registry entries but no owner modules

- **Reason**: both are native runtime dependencies (Capacitor requires them
  installed) with zero web-code import sites. An owner module would be an
  empty placeholder, which the architecture forbids.
- **Removal condition**: first web-code usage creates the owner module.

## EXC-3: Coverage instrumentation scope

- **Rule**: 95% global coverage.
- **Reason**: pre-migration coverage instruments the pure domain + local
  adapter layer only; pages/components are covered by 7 Playwright journeys
  instead of unit tests. Raising instrumented global coverage to 95% requires
  writing unit suites for every screen — out of scope for a
  behavior-preserving migration and tracked as follow-up work.
- **Mitigation**: pure layers hold a 100% target; every migrated module keeps
  its existing tests green; e2e journeys gate every PR.
- **Owner**: repo owner. **Removal condition**: screen-level unit suites
  added module by module post-1.6.0.

## EXC-4: Vendor error copy inside `src/packages/firebase`

- **Rule**: map errors to localization keys at the presentation boundary.
- **Reason**: the existing (tested, shipped) design maps Firebase error codes
  directly to localized `en`/`ar` copy in one table
  (`lib/firebaseError.ts`). Re-keying every error through the message catalog
  is a behavior-affecting rewrite with no user benefit in a bilingual app.
- **Removal condition**: if a third locale is added, convert the table to
  message keys.

## EXC-5: iOS validation not executed

- **Reason**: no macOS environment available to this migration; recorded
  honestly in native-security-audit.md instead of being claimed.
