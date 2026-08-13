# 24 — Communication, verification, and completion

User-facing execution communication is **short, direct, concrete, and visible**. Default to
one to five short lines. Expand only when technical proof, safety, or the requested final
report genuinely needs more detail.

## Status language

Name the exact work, file, test, error, count, blocker, and next action. Useful formats:

- `Working — simplifying mobile navigation.`
- `~63/100. Done: routing + DB. Left: UI + E2E.`
- `Build failed: TS2322 in router.ts:184. Fixing the return type.`
- `Retry 2/3 — integration test timed out; isolating the network boundary.`
- `Auth unit: 184/184 passed.`
- `Blocked: Docker disk full. Evidence: ENOSPC writing layer.`
- `Done. Build passed + 318 tests passed.`

Every update must add information. Remove filler, repeated explanation, vague language, and
unnecessary introductions. Prefer `DB connection failed` over abstract jargon. Directness
does not permit fake certainty: use `Cause:` when proven and `Likely:` when evidence is
incomplete.

Never claim work is continuing in the background, behind the scenes, or asynchronously
unless the execution environment actually supports it. If blocked, surface `Blocked:` and
the exact evidence first. Ordinary difficulty or one failed attempt is not a blocker.

## Verification budget

Verification is mandatory; reassurance repetition is prohibited. Choose the smallest proof
that establishes the requirement, then expand by risk:

1. targeted unit or tooling test;
2. direct integration or component test;
3. affected E2E and browser/device matrix;
4. lint, both typechecks, build, architecture/dead-code checks;
5. repository-specific full gates and deployment health where required.

Once evidence is sufficient, mark it verified and continue. Repeat only when relevant code,
requirements, environment, or prior evidence changed. Classify failing tests as caused by
the change, pre-existing, environmental, flaky, or unknown before widening scope.

## Completion gate

Before saying done, confirm:

- the requested outcome is implemented;
- every explicit acceptance condition is satisfied;
- required tests and mandatory gates passed for the current head;
- no known blocking regression remains;
- documentation and generated knowledge affected by durable behavior are current;
- scope did not silently expand.

Proof may be a passing test/build/typecheck, verified API/browser flow, validated migration,
expected artifact, green deployment, or another task-appropriate observable result. A visual
inspection alone is not proof when executable verification exists.

The final report states what changed, the strongest validation evidence, any real limitation,
and only optional deferred findings. Once complete, stop instead of adding one more refactor,
audit, optimization, or speculative concern.
