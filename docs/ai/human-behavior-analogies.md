# Human-behavior analogies for coding-agent failure modes

Terms such as “ADHD-like,” “OCD-like,” overthinking, and perfectionism are explanatory analogies only. They are not diagnoses, and an AI does not literally develop a psychiatric disorder. Runtime rules use engineering language.

| Human-readable analogy | Engineering behavior | Control |
|---|---|---|
| ADHD-like distraction | attention drift, task switching, priority loss | goal lock, WIP 1, scope classification, attention reset |
| OCD-like checking | compulsive verification, repeated reassurance | smallest sufficient proof, verification budget, verified-state reuse |
| Overthinking | analysis paralysis, speculative branch expansion | bounded investigation, evidence gate, nesting limit |
| Recursive “inception” | task decomposition or investigation inside itself | nesting depth 3, return-to-parent protocol |
| Perfectionism | infinite refinement and completion avoidance | finite Definition of Done, critic budget, termination rule |
| Indecision | strategy oscillation without new evidence | freeze alternatives, compare evidence, select objective criteria |

Avoid forcing unrelated clinical labels onto agent behavior. Describe observable signals, likely causes, prevention, and recovery with precise engineering terms.
