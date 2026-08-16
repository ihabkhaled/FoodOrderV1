# 23 — Context, memory, and evidence control

Agents must use the smallest fresh context that is sufficient for reliable execution. The
repository source, tests, active decisions, and security rules outrank generated summaries
or remembered claims.

## Layered context

Load context progressively:

1. `L0` — `AGENTS.md` and `.ai/BOOTSTRAP.md`.
2. `L1` — the task classification and context receipt from `knowledge:context`.
3. `L2` — the matching domain, rules, skills, and direct tests.
4. `L3` — exact owner source, direct dependencies, consumers, and contracts.
5. `L4` — deep architecture only when ownership, risk, or a blocker requires it.

Search for the likely owner before reading large files. Read the smallest relevant section,
est only as far as the active question requires, and do not repeatedly reconstruct facts
that remain fresh.

## Evidence gate

Before relying on a repository fact, locate evidence. Never invent files, functions, APIs,
scripts, environment variables, commands, tests, services, or architectural relationships.
When evidence is absent, say `Not confirmed` and either inspect the authoritative source or
avoid depending on the claim.

Classify uncertainty as critical, relevant, or low-impact. Investigate critical uncertainty
sufficiently, relevant uncertainty proportionally, and low-impact uncertainty only when it
can change the result. No expensive speculative branch may open without evidence that it
materially affects completion.

## Context refresh

When context grows large, preserve only:

- objective and Definition of Done;
- completed and remaining requirements;
- verified facts and source paths;
- decisions and their reasons;
- current blocker;
- deferred findings;
- next action.

Drop abandoned hypotheses, duplicate tool output, repeated explanation, and stale
speculation. Reload only changed or directly relevant sources. Source changes invalidate
older generated summaries.

## Durable memory

Promote information to `memory/` only when it is stable, repeatedly useful, architectural,
a durable decision, an enduring user preference, a recurring failure pattern, or expensive
to rediscover. Store conclusion, evidence, scope, replacement condition, and detection or
recovery guidance where relevant.

Do not store raw reasoning, hidden chain-of-thought, temporary debugging, one-off failures,
large command output, speculative conclusions, credentials, production records, or active
task noise. Temporary state belongs in generated/local task state, not durable memory.
Source truth wins over stale memory; update or retire the stale entry.

## Generated knowledge

Canonical sources live in `AGENTS.md`, `rules/`, `skills/`, `architecture/`, `context/`,
`memory/`, and `knowledge/`. `.ai/` is generated. Change the canonical owner, regenerate,
then validate references and generated artifacts. Do not create a second knowledge system
or manually synchronize duplicated rule copies.
