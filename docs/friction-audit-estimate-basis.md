# Friction audit estimate basis

The friction audit demo is a teaching model, not a forecasting tool. Its goal
is to make relative pressure visible: setup, comprehension, change, testing,
review, and rework do not shrink equally when an agent helps.

The default human-only numbers are small classroom-scale estimates for a
focused change to the course event tracker. Each process step has a base time,
then friction points add a small penalty:

- Setup: 1 minute per friction point.
- Comprehension: 2 minutes per friction point.
- Change: 2.5 minutes per friction point.
- Testing: 1.5 minutes per friction point.

The assistance multipliers are calibrated against published software
development productivity studies:

- Peng et al. found that GitHub Copilot users completed a constrained HTTP
  server task 55.8% faster than the control group.
- Becker et al. found that early-2025 AI tools made experienced open-source
  developers 19% slower on real tasks in mature projects.
- Zhang et al. report that Copilot is useful for generation, but integration,
  correctness checking, and project fit remain recurring challenges.

The demo therefore uses conservative multipliers instead of treating agents as
a uniform speed boost:

- Human only: no multiplier.
- Agent with weak project context: setup, comprehension, and testing are 5%
  slower; editing is 20% faster; rework risk increases.
- Agent with good instructions and tests: setup is 15% faster, comprehension is
  20% faster, editing is 35% faster, and testing is 25% faster; rework risk
  decreases.

These assumptions keep the weak-agent path close to human-only work instead of
making it magically fast. They also keep the harnessed-agent path below the
best-case Copilot benchmark because the demo includes locating code, verifying
behavior, and explaining the change, not just writing an implementation.

Sources:

- Peng et al., "The Impact of AI on Developer Productivity: Evidence from
  GitHub Copilot", 2023: https://arxiv.org/abs/2302.06590
- Becker et al., "Measuring the Impact of Early-2025 AI on Experienced
  Open-Source Developer Productivity", 2025: https://arxiv.org/abs/2507.09089
- Zhang et al., "A Study of the Development Practice of Using Copilot as an
  Assistant for Developers", 2023: https://arxiv.org/abs/2303.08733
