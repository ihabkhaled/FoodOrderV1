---
id: OPS-DEPLOY
title: Deployment Model
type: guide
authority: canonical
status: active
owner: platform-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Deployment Model for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Deployment model

Web: Vercel installs locked dependencies and runs `npm run build:web` to compile the app,
prerender localized public content, generate sitemap/RSS/robots artifacts, and validate
the deployable output. Repository quality checks belong to hooks and CI and are not
duplicated in Vercel's deployment build. After deployment, verify deep links, security
headers, the contact endpoint, auth/data flows, and observability.

Mobile: produce the same validated web build, run `cap sync`, build signed platform
artifacts, execute device smoke tests, distribute through controlled tracks, and retain
the previous store artifact/config for rollback.
