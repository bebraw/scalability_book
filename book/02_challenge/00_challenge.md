# Challenge — Expose architectural assumptions

Implementation A established a bounded baseline, not an architecture assumed to be correct.
Challenge asks which hidden boundaries made that application work, what it costs to change them, and which assumptions fail when the application leaves its controlled starting conditions.
The result is a second implementation and evidence package that can be compared with the baseline rather than a revision of the same codebase.

## From hidden assumptions to comparable evidence

The three chapters form one progression:

1. [How does web architecture shape scalability?](/chapters/architecture/) separates responsibilities from locations, traces how web placement choices accumulated, and turns one implementation A decision into an architecture hypothesis.
2. [How does development friction limit web projects?](/chapters/friction/) follows one browser-visible change across setup, code, contracts, validation, review, and deployment to expose where the project resists change.
3. [Which web application assumptions fail under pressure?](/chapters/reality/) connects documented production failures, application signals, degradation, and recovery to assumptions that local correctness left untested.

By the end of Challenge, implementation B should preserve the common required behavior while expressing a fresh architecture and a declared foundation-model single-agent workflow.
Its measurements and development evidence should remain comparable with implementation A, while its differences become hypotheses to examine rather than improvements attributed automatically to the model.

## Implementation B — Work Activity Tracker

The [Challenge project specification](/project/challenge/) defines the second fresh implementation.
Requirements, permitted acceptance material, shared pressures, and reporting categories remain stable.
Application code and implementation-specific tests do not carry forward, and neither the earlier architecture nor its development history becomes the default.
The exact transfer policy remains defined by the project brief.

You enter Challenge with greater familiarity with the domain than you had during Establish.
That practice effect is part of the comparison: record what changed, distinguish model and workflow differences from team learning where the evidence permits it, and leave the explanation unresolved when it does not.
Use implementation A and its public discussion as evidence about earlier choices, not as a repository to improve incrementally.

## Technical debt reduces optionality

Technical debt names earlier choices that make later change harder.
A shortcut can be rational while a team is learning or time is limited; the problem begins when its future cost stays invisible, unpriced, or allowed to compound.
A system with high debt may still run, pass tests, and satisfy users today while giving the team fewer safe choices tomorrow.

Architecture makes those commitments visible, friction reveals their daily cost, and production pressure shows which ones restrict recovery or growth.
Challenge therefore treats debt as one supporting lens for comparing the two implementations rather than as a synonym for defects or for every simple design.

### Field note — Codify the development system

Earlier in my agentic-development work, speed blindness was a significant source of debt.
Agents could produce changes faster than I could evaluate them, while I was still learning how to structure their work.
Models have improved since then, but so has my ability to build an effective development system around them.

[Vibe Template](https://github.com/bebraw/vibe-template) captures that experience in a codified form.
Its lasting value is not the starter application.
It is the accumulated judgment expressed through project initialization, architecture rules, specifications, decision records, agent instructions, review practices, and layered validation.
I can begin a project from a development system I understand and then prune or adapt it to the actual need.

Some of its controls came from mistakes in downstream projects.
For example, the experience documented in the [Kirjolab case study](/case-studies/kirjolab/) led me to add earlier structural feedback so that functional progress does not hide growing architectural confusion.

I encourage you to develop your own equivalent over time.
Notice which practices repeatedly help or fail, codify that learning in reviewable artifacts and commands, and revise the system as your judgment, projects, and models change.
The goal is not to copy my template.
It is to stop relearning the same development lessons from scratch.

> **Sustainability angle**
>
> Inefficient design can become sustainability debt.
> Unbounded logs, poor retention policies, N+1 queries, heavy dependencies, and wasteful background jobs may not break the system immediately, but they compound infrastructure cost and resource use over time.
