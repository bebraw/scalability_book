## Chapter purpose for the part

- Give students a vocabulary for the hidden costs of software decisions.
- Use the public implementation A discussion and architecture reading to make design differences visible before implementation B.
- Connect technical debt to development friction, not only messy code.
- Reuse the benchmarking and observability protocol established for implementation A.
- Prepare students for implementation B, where the same required behavior is implemented afresh with a small model and compared with the large-model baseline.

## Notes for further development

### 5 ECTS scope guidance moved from reader content

The three numbered chapters in this part are the required Challenge reading.
Use a case study or appendix selectively when it supports the documented-case transfer, architecture hypothesis, pressure analysis, or a problem the group has actually observed.

The project ceiling is one fresh implementation B, one standardized friction audit, and a focused comparison under the shared primary pressure plus one revealing secondary pressure.
Students should recognize several response patterns but do not need to implement distributed versions of them during Challenge.
Keep optional features out when they would weaken comparability, operational evidence, or the cross-team audit.

- Add a short story from a student project: a simple design that worked until a new requirement made it awkward.
- Include a table of "shortcut now" vs "future cost".
- Keep the tone balanced.
  The point is not to shame shortcuts, but to make trade-offs visible.
- Add a clean-start rule and transfer-policy reminder.
  The small-model implementation should receive the common brief and permitted shared artifacts, but not silently inherit the large-model implementation.
- Introduce practice effects as a limitation: students now understand the domain better, so they must not attribute every improvement to the small model.
- Replace the old reflection prompt with: “What changed because the model changed, what changed because your team learned, and what evidence lets you distinguish the two?”
- Keep the architecture chapter suitable for independent reading.
  Use lecture time primarily for the implementation A presentations, comparison of concrete designs, and implementation B launch.
- Ensure implementation B still introduces new runtime pressure analytically or through a common benchmark even if the functional brief remains fixed.

## Drafting scaffold moved from reader content

Development ideas:

- Use the event tracking project as the recurring example while allowing groups to choose different themes and storage models.
- Ask what shortcuts were reasonable in implementation A and what would become painful at scale.
- Distinguish debt from defects.
  A bug is wrong behavior.
  Debt is a design or process choice that makes future work harder.
- Distinguish deliberate debt from accidental debt.
- Show how AI-assisted development can produce debt quickly because it lowers the cost of generating code but does not automatically lower the cost of understanding it.
- Treat implementation B as the small-model single-agent build.
  Ask what the new model configuration changes and what remains difficult: unclear requirements, weak validation, poor architectural judgment, and human review limits can remain bottlenecks.

### Part outline

1. Architecture
   - Compare the different architectures produced from the common specification.
   - Use mostly reading and the public implementation A discussion to develop architectural vocabulary for implementation B.
2. Friction
   - How debt is felt in daily development.
   - Where work slows down: setup, comprehension, tests, review, deployment, debugging.
3. Reality
   - What happens when a system leaves the controlled environment of the first project.
   - How users, data, failures, concurrency, and operational constraints expose weak design.
