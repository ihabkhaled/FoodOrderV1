# AI executive failure modes

| Mode | Signals | Prevention | Recovery |
|---|---|---|---|
| Attention or goal drift | unrelated work becomes active | objective lock, WIP 1 | classify and park; return to objective |
| Scope drift | local request becomes redesign | finite scope and refactor gate | keep only blocker/required work |
| Recursive investigation | nested questions keep opening | depth 3 and bounded question | return to parent; isolate smallest blocker |
| Analysis paralysis | reasoning grows without execution | next deliverable and stop condition | choose shortest evidence-producing action |
| Retry/tool loop | equivalent command or strategy repeats | retry budget and novelty requirement | change hypothesis, layer, or evidence source |
| Test/fix loop | edit, test, revert with unchanged outcome | classify failure and preserve evidence | reduce to smallest reproduction; change strategy |
| Critic loop | optional refinements repeatedly reopen work | critic budget 2 | classify remaining findings; complete |
| Context reload loop | same sources and architecture reread | freshness tracking and compressed state | reuse fresh facts; reload changed owners only |
| Strategy oscillation | approach A/B alternates without evidence | explicit decision criteria | freeze both, compare proof, select one |
| Livelock | high activity, no acceptance progress | progress ledger and stalled-cycle threshold | attention reset after four stalled cycles |
| Evidence-free exploration | hypothetical branches multiply | evidence gate | close branches without material proof |
| Repository hallucination | files or behavior asserted without source | search before claim | mark unconfirmed; inspect authoritative owner |
| Completion avoidance | Definition of Done is true but work expands | termination rule | record optional work and stop |

Operational thresholds and state transitions are defined in `knowledge/executive-function/` and generated into `.ai/executive-function/`.
