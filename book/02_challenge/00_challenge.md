# Challenge — Expose architectural assumptions

Technical debt is the cost of earlier choices that make later change harder.
The metaphor is useful only if we remember that debt is not automatically bad.
Sometimes taking a shortcut is rational because the team is learning, time is limited, or the future is uncertain.
The problem begins when the debt is invisible, unpriced, or allowed to compound until the system can no longer change safely.

In this part, the course challenges the baseline from three directions: architecture makes its hidden boundaries visible, friction exposes the cost of changing it, and production pressure reveals which assumptions no longer hold.
The [Challenge project brief](/project/challenge/) asks students to implement the same behavior afresh with a foundation-model single agent and compare implementation B with the local-model baseline.

Students challenge their understanding rather than modifying the earlier codebase.
Requirements and acceptance checks remain stable while the implementation and development setup provide a new architectural hypothesis.

## Chapter purpose for the part

- Give students a vocabulary for the hidden costs of software decisions.
- Use the public implementation A discussion and architecture reading to make design differences visible before implementation B.
- Connect technical debt to development friction, not only messy code.
- Reuse the benchmarking and observability protocol established for implementation A.
- Prepare students for implementation B, where the same required behavior is implemented afresh with a foundation model and compared with the local-model baseline.

## Core claim

Technical debt is reduced optionality.
A system with high debt may still run, pass tests, and satisfy users today, but it gives the team fewer good choices tomorrow.

> **Sustainability angle**
>
> Inefficient design can become sustainability debt.
> Unbounded logs, poor retention policies, N+1 queries, heavy dependencies, and wasteful background jobs may not break the system immediately, but they compound infrastructure cost and resource use over time.

Development ideas:

- Use the event tracking project as the recurring example while allowing groups to choose different themes and storage models.
- Ask what shortcuts were reasonable in implementation A and what would become painful at scale.
- Distinguish debt from defects.
  A bug is wrong behavior.
  Debt is a design or process choice that makes future work harder.
- Distinguish deliberate debt from accidental debt.
- Show how AI-assisted development can produce debt quickly because it lowers the cost of generating code but does not automatically lower the cost of understanding it.
- Treat implementation B as the foundation-model single-agent build.
  Ask what greater model capability changes, but also what it fails to change: unclear requirements, weak validation, poor architectural judgment, and human review limits can remain bottlenecks.

## Part outline

1. Architecture
   - Compare the different architectures produced from the common specification.
   - Use mostly reading and the public implementation A discussion to develop architectural vocabulary for implementation B.
2. Friction
   - How debt is felt in daily development.
   - Where work slows down: setup, comprehension, tests, review, deployment, debugging.
3. Reality
   - What happens when a system leaves the controlled environment of the first project.
   - How users, data, failures, concurrency, and operational constraints expose weak design.
