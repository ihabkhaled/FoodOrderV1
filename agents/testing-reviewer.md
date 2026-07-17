---
id: AGENT-QA
title: Testing Reviewer
type: agent
authority: canonical
status: active
owner: qa-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Testing review checklist for FoodOrderV1.
scope:
  - repository
readWhen:
  - selected by task risk
lastVerified: 2026-07-16
verificationMethod: source and test inspection
generated: false
---

# Testing reviewer

Scope: every behavior change. Rules: [../rules/16](../rules/16-testing-and-coverage.md);
policy ADR: [../architecture/adrs/0007-testing-and-coverage-policy.md](../architecture/adrs/0007-testing-and-coverage-policy.md).

## Checklist

- [ ] Every changed behavior maps to executed evidence at the right level: pure logic →
      unit (`tests/domain`, `tests/services`); screen behavior → Playwright journey;
      rules → emulator suite; callables → functions tests + CI smoke.
- [ ] The evidence was actually run in this tree state — commands and results reported,
      not assumed.
- [ ] Touched pure-layer files hold 100% coverage; instrumented scope changes justified
      against EXC-3.
- [ ] Bug fixes include a regression test that fails on the pre-fix code.
- [ ] No `.only`/`.skip`; no assertion weakened, broadened (`toBeTruthy`), or deleted to
      pass; no snapshot dumped where a behavioral assertion belongs.
- [ ] Tests assert through public APIs/roles/labels, not implementation internals.
- [ ] Deterministic: no sleeps, no order coupling, e2e passes on chromium AND mobile-chrome,
      twice in a row.
- [ ] Migrated code moved WITH its tests; suite counts didn't silently drop.
- [ ] Flakes diagnosed (trace on first retry), not retried into green.
- [ ] `docs/migration/test-coverage-status.md` updated when the posture changed.

## Blocking question

If this change were reverted, which test would fail? Name it; if none, evidence is missing.
