---
id: KNOW-MISSING-REPORT
title: Missing Knowledge Report
type: audit
authority: canonical
status: active
owner: knowledge-owner
audience:
  - product
  - engineer
  - qa
  - operations
summary: Decisions that cannot be established from repository evidence and remain explicit release inputs.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and documentation gap analysis
contextTier: 2
generated: false
---

# Missing knowledge report

The following facts are intentionally not invented:

1. Production Firebase project ownership, regions, quotas, monitoring, and billing.
2. Approved account deletion and data-retention periods.
3. Legal privacy notice and terms accepted by product/legal owners.
4. Android and iOS application identifiers, signing identities, store accounts, and release channels.
5. Supported production currencies and whether prices include tax or service fees.
6. Whether orders will eventually be transmitted to restaurants, merchants, or payment providers.
7. Approved service-level objectives and support response targets.

These gaps do not block local product evaluation. They block a production release where the related capability applies and are recorded in the risk register rather than represented as established behavior.
