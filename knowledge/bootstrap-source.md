---
id: KNOW-BOOTSTRAP-SOURCE
title: Bootstrap Source
type: guide
authority: canonical
status: active
owner: knowledge-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Small always-loaded execution and repository bootstrap for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-08-14
verificationMethod: source, routing, rules, and test inspection
contextTier: 0
generated: false
---

# FoodOrderV1 AI bootstrap

FoodOrderV1 / Gama3 Orderak is a mobile-first React, TypeScript, Vite, Firebase, and Capacitor application for reusable shared menus, group food choices, order finalization, status tracking, notifications, repeat ordering, and fair receipt breakdowns.

## Load before planning

1. Read `AGENTS.md` and this bootstrap.
2. Lock the primary objective, observable success condition, finite Definition of Done, included scope, and out-of-scope work.
3. Select one active work item and the next meaningful deliverable.
4. Run `npm run knowledge:context -- --task="<exact task>"`.
5. Read only the returned domain owners, direct tests, rules, and skills; expand context only when evidence or risk requires it.
6. Follow `rules/00-non-negotiable-rules.md` and rules `22`–`24`.

Activity is not progress. Progress is measurable movement toward the requested outcome and Definition of Done.

## Current architecture

- `src/app/` owns bootstrap, providers, route composition, and the authenticated shell.
- `src/modules/<feature>/` owns feature behavior, UI, hooks, routes, data contracts, and tests exposed through the module public surface.
- `src/shared/` owns genuinely cross-feature UI and utilities.
- `src/platform/` owns browser, Capacitor, storage, environment, and device boundaries.
- `src/packages/` owns third-party package facades.
- `functions/src/` owns Firebase callable and trigger behavior.
- `tests/` owns domain, component, tooling, E2E, and Firestore emulator evidence.

Do not use deleted legacy ownership such as `src/pages`, `src/components`, `src/state`, `src/services`, or `src/lib`. Feature routing is derived from tracked `src/modules/*` by `scripts/knowledge/routing.mjs`; generated summaries are not source truth.

UI reaches persistence and device capabilities through the owning module contracts and platform/package facades. Active decisions, source, and executable tests outrank generated context or memory. `.ai/` is generated; change canonical owners, regenerate, and validate.

## Executive controls

Defaults: one active work item, nesting depth `3`, same-strategy attempts `3`, critic rounds `2`, full replans `2`, delegation depth `2`, and attention reset after `4` stalled cycles. A retry must add a new hypothesis, evidence source, isolation method, layer, or strategy.

Classify discoveries as `BLOCKER`, `REQUIRED`, `OPTIONAL`, or `UNRELATED`. Only blockers and required work interrupt. Park optional or unrelated findings and return to delivery. Detect repeated commands, reads, errors, edit/revert cycles, replan loops, critic loops, context reload loops, strategy oscillation, and completion avoidance; use `skills/attention-and-loop-recovery.md` when triggered.

## Evidence, validation, and completion

Never invent repository facts. Search for the owner, read the smallest relevant source, establish evidence, then act. Run targeted tests while changing code; expand to integration, affected E2E, lint, both typechecks, build, rules/native checks, and repository gates according to risk. Do not repeat proof unless relevant code, requirements, environment, or evidence changed.

Before saying done, prove the requested behavior, explicit acceptance conditions, mandatory gates, and absence of known blocking regression for the current head. Update only durable canonical documentation. Stop when the Definition of Done is satisfied.

## Communication

Default updates are one to five short lines: exact work, exact error or blocker, proof, and next action. Remove filler and repetition. Surface blockers first.
