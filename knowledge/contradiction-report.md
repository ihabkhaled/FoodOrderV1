---
id: KNOW-CONTRADICTION-REPORT
title: Initial Contradiction Report
type: audit
authority: canonical
status: active
owner: knowledge-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Contradictions found during migration and how active truth was established.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source comparison and generated contradiction scan
contextTier: 2
generated: false
---

# Initial contradiction report

## Resolved

- **“My Orders” versus implemented behavior:** navigation implied persisted order history, while its screen read the bucket collection. Active truth in FoodOrderV1 is a dedicated order entity, order collection, detail view, statuses, repetition, and deletion.
- **Food-ordering name versus marketplace behavior:** no restaurant, delivery, payment, or merchant contract existed. The implemented product remains a personal/group reusable ordering organizer and does not claim marketplace fulfillment.
- **React Native versus requested platform:** React Native platform code was removed from the target repository. Capacitor wraps a React web application and owns native integration.

## Active unresolved contradictions

None were detected between active canonical documents, package versions, and generated manifests. Product decisions listed in the missing-knowledge report are unknowns, not contradictions.
