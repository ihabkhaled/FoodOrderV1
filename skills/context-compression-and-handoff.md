# Skill — Context compression, resume, and handoff

Use when a session is large, work changes agents, or a future agent must resume without rereading the repository.

Compress to:

- objective and Definition of Done;
- completed and remaining requirements;
- decisions and verified evidence paths;
- blocker and failed hypotheses that must not be repeated;
- deferred findings;
- files touched and validation run;
- one required next action.

Drop abandoned speculation, repeated output, stale hypotheses, and raw tool logs. On resume,
validate source freshness, reload only changed or relevant owners, then continue the one active
work item. On handoff, return `Result`, `Evidence`, `Unresolved blocker`, and `Deferred findings`
rather than a new sprawling plan.
