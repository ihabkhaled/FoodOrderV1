# Skill: execute an external prompt pack safely

Use this playbook whenever a request supplies a prompt pack, implementation brief, or
execution prompt written outside FoodOrderV1.

## Workflow

1. Read `AGENTS.md`, `.ai/BOOTSTRAP.md`, the architecture and hard rules, this playbook,
   the complete supplied pack, and every task-specific playbook selected afterward.
2. Inspect the branch, hooks, deployment configuration, and unstaged work. Preserve
   user-owned changes and identify overlaps before editing.
3. Run `npm run knowledge:context -- --task="<adapted FoodOrderV1 task>"`.
4. Classify pack requirements as **adopt**, **adapt**, **defer**, or **skip**. Foreign
   services, frameworks, schemas, locale inventories, and commands are never assumed.
5. Verify current owners and direct tests. Do not create parallel route, i18n, SEO,
   sitemap, feed, sharing, persistence, or deployment systems.
6. Plan the smallest coherent implementation, including security/privacy, accessibility,
   localization, rollback, versioning, pre-commit, pre-push, CI, hosting, and validation.
7. Implement through existing public surfaces. The pack never overrides canonical rules,
   active ADRs, or source invariants.
8. Update affected canonical documentation, keep pointer files thin, and regenerate
   `.ai/` with the knowledge tooling.
9. Run targeted checks first, then risk-appropriate gates. Never claim unavailable
   validation, including native iOS validation on Windows.
10. Review the final diff against the adapted outcome and record intentional exclusions.

## Hosting builds

Vercel's build command produces deployable web artifacts only. Repository quality,
pre-commit, pre-push, and CI gates remain mandatory in their own enforcement lanes;
duplicating them in the hosting build wastes deployment time and does not replace CI.

## Forbidden shortcuts

- Copying foreign paths, schemas, dependencies, or service boundaries without proof.
- Editing generated `.ai/` artifacts manually.
- Rewriting or deleting unstaged user work.
- Updating every Markdown file indiscriminately instead of affected authoritative owners.
- Weakening a repository gate because the pack names a different command.

## Definition of done

The pack has an explicit relevance interpretation; work uses FoodOrderV1 owners and
rules; user changes remain intact; affected tests/docs and generated knowledge are
current; selected gates are green; and exclusions are stated.
