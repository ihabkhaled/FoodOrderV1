# 29 — Phase-aggregated release evidence

## Rule

**A multi-phase release branch MUST carry its own evidence as it grows.**

- `release-notes/vX.Y.Z.md` MUST be appended to in the **same commit** as each
  phase, never written retrospectively from the diff.
- The pull request description MUST be generated from that notes file with
  `gh pr ... --body-file`, so the two cannot disagree. Hand-editing the
  description is prohibited.
- The description MUST open with a phase table: phase, what shipped, evidence,
  commit.
- Every phase entry MUST carry a **measurement with a before and an after**
  where the change is measurable, and MUST name what it deliberately left out.
- Defects found while implementing a phase MUST be recorded in that phase's
  entry, including ones the author caused.
- A phase MUST NOT be described as green unless its gates were actually run;
  the command and its result are the evidence, not the intent.

## Motivation

Notes written at the end are written from the diff, which cannot remember the
reasoning, the rejected alternative, or the defect found on the way. The
pull request then arrives as forty files with a one-line summary, and the
reviewer's only option is to trust it.

Writing per phase also keeps the branch revertible in units that mean
something: a reader can see which phase changed the navigation and which
changed the wording, and revert one without the other.

## Prohibited

- Release notes composed after the fact from `git log`.
- A pull request description edited by hand rather than regenerated.
- "Improved X" without the number that shows it.
- Omitting a defect the author introduced and then fixed.

## Enforcement

`skills/aggregate-release-notes-and-pr.md` carries the procedure.
`tests/tooling/release-notes-phases.test.mjs` asserts that the notes file for
the current version exists, has a phase table, and that every phase heading it
declares has a matching entry.

## Related

[20-release-gates.md](20-release-gates.md),
[skills/write-release-notes.md](../skills/write-release-notes.md).
