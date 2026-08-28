## Chapter purpose

- Give students a practical vocabulary for scaling web applications.
- Analyze documented production cases without assuming their results transfer unchanged.
- Compare how implementations A, B, and C respond to the same scaling pressures.
- Apply formal scalability models to application and development-workflow decisions.
- Show that scaling choices have costs in complexity, consistency, operations, and development speed.
- Prepare the transition from application scaling to development-process fortification.

## Notes for further development

- Connect the end of the chapter to the recap: once architecture grows, scalability becomes a technical, organizational, and development-process concern.
- Apply the same pressure set to all three implementations before recommending changes.
  The chapter should compare how each architecture responds rather than assuming implementation B is the sole object of analysis.
- Keep the formal-model requirement tied to observed or explicitly proposed limits rather than accepting decorative calculations added after the design.
- Ask whether the fleet-generated implementation is architecturally more scalable or merely larger.
  Generated component count and infrastructure ambition are not evidence of scalability.
- Revise the event-pipeline artifact into a three-way comparison plus one justified target design.
  Students may select or synthesize the best ideas, but should label what is observed in code versus what is proposed.
- Include development-system trade-offs alongside runtime ones: local privacy versus capability, foundation-model cost versus reduced rework, parallel throughput versus integration and review capacity.
- Obsidian candidate: `Clippings/_Processed/Durable Execution Solutions.md` could support concrete scaling trade-offs around queues, retries, timers, durable state, and workflow visibility.
  Use it to ask what new operational responsibilities appear when asynchronous processing is introduced.
- Obsidian candidate: `Clippings/_Processed/Correlation charts Connect the dots between site speed and business success.md` could support a "measure what matters" reminder: scaling work should name the user or operational outcome it improves, not only the infrastructure metric it moves.
