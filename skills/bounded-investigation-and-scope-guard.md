# Skill — Bounded investigation and scope guard

Use when a task requires research, debugging, architecture inspection, or a newly discovered branch.

Define before investigating:

- question to answer;
- evidence sought and authoritative source;
- maximum depth and same-strategy attempts;
- decision the evidence will enable;
- stop condition.

Classify discoveries:

- `BLOCKER` — completion is impossible without it;
- `REQUIRED` — correctness, security, explicit scope, data safety, regression prevention, or a mandatory gate needs it;
- `OPTIONAL` — useful but not necessary now;
- `UNRELATED` — outside the task.

Only blocker/required work interrupts. Record optional/unrelated work with evidence and impact,
then return to the parent task. At nesting depth `3`, stop expansion, restate the parent,
solve minimally if blocking, otherwise park the branch.
