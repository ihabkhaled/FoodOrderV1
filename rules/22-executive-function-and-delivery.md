# 22 — AI executive function and delivery

This rule controls how coding agents plan, execute, recover, verify, and stop. It applies
before repository inspection, planning, auditing, editing, testing, review, or delegation.
Repository-specific correctness, security, and architecture rules remain authoritative.

## Core principle

**Activity is not progress.** Progress is measurable movement toward the requested outcome
and its finite Definition of Done. Reading, reasoning, tool use, coding, refactoring, and
repeated testing count only when they advance a requirement, remove a blocker, produce a
deliverable, or establish required proof.

## Pre-action gate

Before substantial work, record a compact execution state:

- primary objective and observable success condition;
- minimum Definition of Done;
- included and excluded scope;
- one active work item and the next meaningful deliverable;
- actual blocker, or `none`;
- nesting depth, same-strategy retry count, critic round, and verification state.

Do not turn this state into a long self-reflection. Executive control loads before planning;
planning without it can itself become analysis paralysis.

## Bounded execution

Default limits:

- active work items: `1`;
- nested investigation depth: `3`;
- same-strategy attempts: `3`;
- critic/fix rounds: `2` (`3` only for genuinely high-risk work);
- full replans without major new evidence: `2`;
- delegated-agent depth: `2`;
- stalled progress cycles before reset: `4`.

A retry must add a new hypothesis, evidence source, isolation method, abstraction level, or
strategy. Rephrasing the same command is not novelty. After three same-strategy failures,
change strategy or report the exact blocker.

## Scope guard

Classify every material discovery as `BLOCKER`, `REQUIRED`, `OPTIONAL`, or `UNRELATED`.
Only blockers and required work may interrupt the current item. Record optional/unrelated
findings in the task parking lot and return to the objective. A local request is not
permission to redesign the repository.

Refactoring and optimization require evidence that they are needed for correctness,
security, the requested behavior, regression prevention, or maintainability of the changed
area. Speculative elegance and premature optimization are deferred.

## Drift and loop detection

Trigger recovery when work shows repeated commands, repeated file reads, the same error,
edit/revert cycles, planning loops, critic loops, context reload loops, approach A/B
oscillation, growing investigation with unchanged acceptance progress, or work continuing
after the Definition of Done is satisfied.

Recovery protocol:

1. Stop the current branch.
2. Restate objective, Definition of Done, completed work, remaining work, and actual blocker.
3. Classify the branch that caused drift.
4. Remove speculative branches and reduce the search space.
5. Choose the shortest materially different action that can advance completion.
6. Resume one work item, or report `Blocked: <exact reason>. Evidence: <proof>.`

## Delivery loop

Use: understand enough → implement → targeted verification → meaningful checkpoint → final
required gates → stop. Run the smallest relevant test while changing code; expand to the
risk-appropriate repository gates at the feature fixed point. Do not rerun already-valid
proof unless relevant code, requirements, or evidence changed.

## Termination

When the objective and Definition of Done are proven complete, stop. Record optional
follow-ups without implementing them. Correct, complete, and verified beats theoretically
perfect.
