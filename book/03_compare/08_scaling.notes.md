## Chapter purpose

- Give students a practical vocabulary for scaling web applications.
- Analyze documented production cases without assuming their results transfer unchanged.
- Compare how implementations A, B, and C respond to the shared primary pressure under a comparable protocol.
- Apply formal scalability models to application and development-workflow decisions.
- Show that scaling choices have costs in complexity, consistency, operations, and development speed.
- Prepare the transition from application scaling to development-process fortification.

## Notes for further development

- Connect the end of the chapter to the recap: once architecture grows, scalability becomes a technical, organizational, and development-process concern.
- Repeat the shared primary pressure for all three implementations before recommending changes; identify further pressure scenarios as optional investigations within the phase budget.
  The chapter should compare how each architecture responds rather than assuming implementation B is the sole object of analysis.
- Keep the formal-model requirement tied to observed or explicitly proposed limits rather than accepting decorative calculations added after the design.
- Ask whether the fleet-generated implementation is architecturally more scalable or merely larger.
  Generated component count and infrastructure ambition are not evidence of scalability.
- Revise the event-pipeline artifact into a three-way comparison plus one justified target design.
  Students may select or synthesize the best ideas, but should label what is observed in code versus what is proposed.
- Include development-system trade-offs alongside runtime ones: local execution and data boundaries, measured model cost and rework, parallel throughput versus integration and review capacity.
- Obsidian candidate: `Clippings/_Processed/Durable Execution Solutions.md` could support concrete scaling trade-offs around queues, retries, timers, durable state, and workflow visibility.
  Use it to ask what new operational responsibilities appear when asynchronous processing is introduced.
- Obsidian candidate: `Clippings/_Processed/Correlation charts Connect the dots between site speed and business success.md` could support a "measure what matters" reminder: scaling work should name the user or operational outcome it improves, not only the infrastructure metric it moves.

## Drafting scaffold moved from reader content

- By this point in the course, students have produced three implementations, inspected their friction, measured their behavior, and seen how reality changes their assumptions.
- This chapter compares the shared primary-pressure evidence across all three architectures before synthesizing a justified target design; broader proposed responses remain explicitly labeled.
- It develops technical scaling techniques without turning them into a catalog of cloud products.
- Development idea: reuse the event tracking system and map each pressure to a possible response, regardless of whether the chosen theme is a conference, shop, workflow, game, or something else.

### Exercise ideas

- Students reconstruct one documented case as a chain of user experience, saturation boundary, evidence, intervention, reported outcome, limitation, and transferable principle.
- Students identify which statements in that case are source-reported facts, which are interpretations, and which are proposals for the tracker.
- Following the GitHub case, students measure repeated access and one user-facing latency distribution before proposing a cache; if the measured pressure is instead database work, they generate representative history, inspect the query plan, and test one query bound or index.
- Following the Spotify case, students mark the synchronous correctness boundary, identify deferrable work, and define the acceptance status, backlog-age, retry, terminal-failure, and recovery signals a queue would require.
- Following the Shopify case, students identify work that continues after a client disconnects or times out, then identify the local state and first shared dependency that additional application instances would stress.
- Students choose one of these transfers, preserve a baseline, apply the smallest justified response, and compare evidence before and after.
- Students choose two scaling techniques for a target design and explain why they did not choose three others.
- Students draw the event pipeline for all three implementations and for the proposed target design.
- Students identify the first metric that would reveal overload.
- Students explain one failure mode introduced by their own scaling design.
- Students name one plausible saturation boundary and demonstrate or describe a prepared recovery action that does not require inventing a new tool during the incident.
- Students use the waterbed lens to identify where a selected scaling technique displaced complexity.
