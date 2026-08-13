# Skill — Verification controller

Use to choose sufficient proof without repetitive reassurance.

1. Map each acceptance condition to the smallest observable proof.
2. Run targeted tests while source is changing.
3. Expand to direct integration, component, browser, rules, native, or deployment evidence only when risk requires it.
4. Record whether proof is current and which change would invalidate it.
5. Classify failures as change-caused, pre-existing, environmental, flaky, or unknown.
6. Do not rerun a proven condition unless relevant code, requirements, environment, or evidence changed.
7. At finalization, run every mandatory repository gate once for the current head.
8. Report exact passed counts and any unexecuted proof honestly.

Verification is complete when every requirement and mandatory gate has valid evidence; then continue to completion instead of checking again.
