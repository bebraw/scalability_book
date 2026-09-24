# Challenge — Expose architectural assumptions

Challenge examines the architecture behind implementation A, the cost of changing it, and the assumptions that fail under production pressure.
Build implementation B afresh with a comparison-model single agent and compare its behavior and development effort with the baseline.

## From hidden assumptions to comparable evidence

The three chapters form one progression:

1. [How does web architecture shape scalability?](/chapters/architecture/) separates responsibilities from locations, traces how web placement choices accumulated, and turns one implementation A decision into an architecture hypothesis.
2. [How does development friction limit web projects?](/chapters/friction/) follows one browser-visible change across setup, code, contracts, validation, review, and deployment to expose where the project resists change.
3. [Which web application assumptions fail under pressure?](/chapters/reality/) connects documented production failures, application signals, degradation, and recovery to assumptions that local correctness left untested.

## Implementation B — Work Activity Tracker

Use the [Challenge specification](/project/challenge/) and [shared transfer policy](/project/#8-permitted-transfer-between-implementations).
Keep the common behavior, pressures, and reporting categories stable while testing a revised architecture hypothesis.
Record what you learned from A's public discussion and distinguish that practice effect from model or workflow differences where the evidence permits.

## Technical debt reduces optionality

Technical debt names earlier choices that make later change harder.
A shortcut can be rational while a team is learning or time is limited; the problem begins when its future cost stays invisible, unpriced, or allowed to compound.
A system with high debt may still run, pass tests, and satisfy users today while giving the team fewer safe choices tomorrow.

Architecture makes those commitments visible, friction reveals their daily cost, and production pressure shows which ones restrict recovery or growth.
Challenge therefore treats debt as one supporting lens for comparing the two implementations rather than as a synonym for defects or for every simple design.

### Field note — Codify the development system

Earlier in my agentic-development work, agents produced changes faster than I could evaluate them.
I have since codified recurring lessons in [Vibe Template](https://github.com/bebraw/vibe-template): initialization, architecture rules, specifications, decision records, instructions, and layered validation.
The [Kirjolab experience](/case-studies/kirjolab/) added earlier structural feedback when functional progress began hiding architectural confusion.

Build your own equivalent by turning repeated mistakes and useful practices into reviewable guidance and commands.
Revise those controls as the projects, models, and your judgment change.

> **Sustainability angle**
>
> Inefficient design can become sustainability debt.
> Unbounded logs, poor retention policies, N+1 queries, heavy dependencies, and wasteful background jobs may not break the system immediately, but they compound infrastructure cost and resource use over time.
