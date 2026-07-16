# ADR-0008: Governance and agent instructions

- Status: Accepted
- Date: 2026-07-16

## Context

Multiple AI coding agents (Claude Code, Copilot, Cursor, and the repo's knowledge-driven
flow via `CLAUDE.md`/`CODEX.md`/`GEMINI.md`) plus human contributors work on this repo
concurrently. Before v1.6.0, agent instructions existed only as the knowledge-system entry
steps; the module-first architecture adds a large body of rules that every tool must apply
identically. Divergent per-tool instructions drift and contradict.

## Decision

One canonical source of truth: **`AGENTS.md`** (identity, reading order, architecture
summary, rules digest, task-to-skill routing, validation, definition of done, policies).
All other entry points — `CLAUDE.md` (which keeps the CI-gated knowledge-system workflow
unchanged), `.github/copilot-instructions.md`, `.cursorrules` — are thin digests pointing
to it. Supporting corpus: `rules/` (numbered enforceable rules), `skills/` (task
playbooks), `agents/` (reviewer personas), `context/` (repo maps), `memory/` (durable
lessons), `architecture/` + ADRs, and `docs/exceptions/` (deviation process).

Every entry point carries the marker `Governance-Version: 1`; the zero-dependency script
`scripts/check-agent-docs.mjs` fails unless all four entry points exist with the marker,
AGENTS.md links to `architecture/README.md` and `rules/00-non-negotiable-rules.md`, and
CLAUDE.md references AGENTS.md. Governance docs are hand-written canonical sources for the
generated `.ai/` knowledge (never the reverse).

## Consequences

- Instruction changes happen once and propagate by reference; digests stay short enough
  that tools with small instruction windows still get the hard rules.
- The version marker makes stale copies detectable; bumping to `Governance-Version: 2`
  is itself a governed change (new ADR or amendment here).
- Docs added: agents must keep them truthful (documentation-update policy in AGENTS.md)
  and rebuild the knowledge index (`npm run knowledge:build:incremental`).

## Enforcement

`node scripts/check-agent-docs.mjs` (wired into validation by the release orchestrator);
`npm run knowledge:validate` (unique doc ids, link integrity); release-readiness reviewer
checks governance integrity before shipping.
