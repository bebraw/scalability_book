# Challenge — Expose architectural assumptions

Technical debt is the cost of earlier choices that make later change harder.
The metaphor is useful only if we remember that debt is not automatically bad.
Sometimes taking a shortcut is rational because the team is learning, time is limited, or the future is uncertain.
The problem begins when the debt is invisible, unpriced, or allowed to compound until the system can no longer change safely.

In this part, the course challenges the baseline from three directions: architecture makes its hidden boundaries visible, friction exposes the cost of changing it, and production pressure reveals which assumptions no longer hold.
The [Challenge project brief](/project/challenge/) asks students to implement the same behavior afresh with a foundation-model single agent and compare implementation B with the local-model baseline.

Students challenge their understanding rather than modifying the earlier codebase.
Requirements and acceptance checks remain stable while the implementation and development setup provide a new architectural hypothesis.

## Core claim

Technical debt is reduced optionality.
A system with high debt may still run, pass tests, and satisfy users today, but it gives the team fewer good choices tomorrow.

> **Sustainability angle**
>
> Inefficient design can become sustainability debt.
> Unbounded logs, poor retention policies, N+1 queries, heavy dependencies, and wasteful background jobs may not break the system immediately, but they compound infrastructure cost and resource use over time.
