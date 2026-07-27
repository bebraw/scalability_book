# Challenge

Technical debt is the cost of earlier choices that make later change harder. The metaphor is useful only if we remember that debt is not automatically bad. Sometimes taking a shortcut is rational because the team is learning, time is limited, or the future is uncertain. The problem begins when the debt is invisible, unpriced, or allowed to compound until the system can no longer change safely.

In this part, the course challenges the baseline from three directions: architecture makes its hidden boundaries visible, friction exposes the cost of changing it, and production pressure reveals which assumptions no longer hold. The [Reconstruct project brief](/project/reconstruct/) asks students to implement the same behavior afresh with a foundation-model single agent and compare implementation B with the local-model baseline.

Students reconstruct their understanding, not the earlier codebase. Requirements and acceptance checks remain stable while the implementation and development setup provide a new architectural hypothesis.

## Chapter purpose for the part

- Give students a vocabulary for the hidden costs of software decisions.
- Use the public Construct discussion and architecture reading to make design differences visible before implementation B.
- Connect technical debt to development friction, not only messy code.
- Reuse the benchmarking and observability protocol established during Construct.
- Prepare students for the Reconstruct project, where the same required behavior is implemented afresh with a foundation model and compared with the local-model baseline.

## Core claim

Technical debt is reduced optionality. A system with high debt may still run, pass tests, and satisfy users today, but it gives the team fewer good choices tomorrow.

> **Sustainability angle**
>
> Inefficient design can become sustainability debt. Unbounded logs, poor retention policies, N+1 queries, heavy dependencies, and wasteful background jobs may not break the system immediately, but they compound infrastructure cost and resource use over time.

Development ideas:

- Use the event tracking project as the recurring example while allowing groups to choose different themes and storage models.
- Ask what shortcuts were reasonable in Construct and what would become painful at scale.
- Distinguish debt from defects. A bug is wrong behavior. Debt is a design or process choice that makes future work harder.
- Distinguish deliberate debt from accidental debt.
- Show how AI-assisted development can produce debt quickly because it lowers the cost of generating code but does not automatically lower the cost of understanding it.
- Treat Reconstruct as the foundation-model single-agent phase. Ask what greater model capability changes, but also what it fails to change: unclear requirements, weak validation, poor architectural judgment, and human review limits can remain bottlenecks.

## Part outline

1. Architecture
   - Compare the different architectures produced from the common specification.
   - Use mostly reading and the public Construct discussion to develop architectural vocabulary for implementation B.
2. Friction
   - How debt is felt in daily development.
   - Where work slows down: setup, comprehension, tests, review, deployment, debugging.
3. Reality
   - What happens when a system leaves the controlled environment of the first project.
   - How users, data, failures, concurrency, and operational constraints expose weak design.

## Notes for further development

- Add a short story from a student project: a simple design that worked until a new requirement made it awkward.
- Include a table of "shortcut now" vs "future cost".
- Keep the tone balanced. The point is not to shame shortcuts, but to make trade-offs visible.
- Rewrite the part introduction so “reconstruct” means rebuilding from the same contract, not editing implementation A. Preserve technical-debt teaching by comparing debt profiles and asking which shortcuts recur even when generation becomes easier.
- Add a clean-start rule and transfer-policy reminder. The foundation-model implementation should receive the common brief and permitted shared artifacts, but not silently inherit the local implementation.
- Introduce practice effects as a limitation: students now understand the domain better, so they must not attribute every improvement to the foundation model.
- Replace the old reflection prompt with: “What changed because the model changed, what changed because your team learned, and what evidence lets you distinguish the two?”
- Keep the architecture chapter suitable for independent reading. Use lecture time primarily for the Construct presentations, comparison of concrete designs, and the Reconstruct launch.
- Ensure Reconstruct still introduces new runtime pressure analytically or through a common benchmark even if the functional brief remains fixed.
