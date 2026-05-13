# Technical Debt

Technical debt is the cost of earlier choices that make later change harder. The metaphor is useful only if we remember that debt is not automatically bad. Sometimes taking a shortcut is rational because the team is learning, time is limited, or the future is uncertain. The problem begins when the debt is invisible, unpriced, or allowed to compound until the system can no longer change safely.

In this part, the course moves from building a working baseline to understanding the pressure that baseline creates. The Construct project gives students a system that works under modest assumptions. Technical Debt asks what happens when those assumptions are no longer enough.

## Chapter purpose for the part

- Give students a vocabulary for the hidden costs of software decisions.
- Connect technical debt to development friction, not only messy code.
- Show why benchmarking and observability are tools for discovering reality.
- Prepare students for the Reconstruct project, where the first design is revisited under new constraints.

## Core claim

Technical debt is reduced optionality. A system with high debt may still run, pass tests, and satisfy users today, but it gives the team fewer good choices tomorrow.

Development ideas:

- Use the event tracking project as the recurring example while allowing groups to choose different themes and storage models.
- Ask what shortcuts were reasonable in Construct and what would become painful at scale.
- Distinguish debt from defects. A bug is wrong behavior. Debt is a design or process choice that makes future work harder.
- Distinguish deliberate debt from accidental debt.
- Show how AI-assisted development can produce debt quickly because it lowers the cost of generating code but does not automatically lower the cost of understanding it.

## Part outline

1. Friction
   - How debt is felt in daily development.
   - Where work slows down: setup, comprehension, tests, review, deployment, debugging.
2. Benchmarking and observability
   - How to measure the system instead of relying on guesses.
   - How load, latency, errors, logs, metrics, and traces reveal hidden assumptions.
3. Reality
   - What happens when a system leaves the controlled environment of the first project.
   - How users, data, failures, concurrency, and operational constraints expose weak design.

## Notes for further development

- Add a short story from a student project: a simple design that worked until a new requirement made it awkward.
- Include a table of "shortcut now" vs "future cost".
- Keep the tone balanced. The point is not to shame shortcuts, but to make trade-offs visible.
