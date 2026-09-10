# Skill: aggregate release notes and the pull request, phase by phase

Use on any multi-phase release branch: after **every** phase commit, before
starting the next phase.

## Required reading

- [../rules/29-phase-aggregated-release-evidence.md](../rules/29-phase-aggregated-release-evidence.md)
- [write-release-notes.md](write-release-notes.md)
- [../rules/20-release-gates.md](../rules/20-release-gates.md)

## Why phase by phase

Release notes written at the end are written from the diff, and a diff cannot
remember why a decision was taken or what was rejected. Writing them as each
phase lands keeps the reasoning that was in your head at the time, and keeps
the pull request reviewable while it grows instead of presenting a reviewer
with forty files at once.

## The loop, once per phase

1. **Land the phase commit** with its gates green.
2. **Append the phase to `release-notes/vX.Y.Z.md`** under `## Highlights`, as
   one bullet per user-visible outcome. State the measurement, not the effort:
   "nav labels 10.56px to 13.12px", not "improved legibility".
3. **Record the defects the phase found** under `## Fixed`. A phase that found
   nothing says so; a phase that found something and hides it is worse than one
   that found nothing.
4. **Open the pull request on the first phase**, then update its description on
   every later phase:

   ```bash
   # first phase only
   gh pr create --base main --head "$(git branch --show-current)" \
     --title "vX.Y.Z — <what a user gets>" --body-file release-notes/vX.Y.Z.md

   # every later phase
   gh pr edit <number> --body-file release-notes/vX.Y.Z.md
   ```

   The notes file is the single source; the description is generated from it so
   the two cannot disagree.
5. **Keep a phase table at the top of the description** — phase, what shipped,
   evidence, commit. A reviewer reads that table to decide where to look.
6. **Update `CHANGELOG.md`** in the same commit, one line per phase.

## What a phase entry must contain

- The user-visible change, in the words a user would use.
- The measurement that proves it, with before and after.
- The decision behind it when a different choice was available, and why the
  other was rejected.
- Anything the phase deliberately did **not** do, so a reviewer does not read
  the omission as an oversight.

## Traps

- Do not describe a phase you have not gated. "Green" in the notes must mean a
  command was run and passed.
- Do not let the pull request description drift from the notes file: always
  regenerate with `--body-file`, never hand-edit the description.
- Do not collapse phases when summarising later. A reader wants to know which
  change did what, especially when reverting one of them.
