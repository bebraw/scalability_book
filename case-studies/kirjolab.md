# Kirjolab – When code production scaled faster than architecture

[Kirjolab](https://github.com/bebraw/kirjolab) is a collaborative workspace for scientific writing.
It connects portable Markdown manuscripts with references, PDF annotations, evidence, and reviewable local-model suggestions.
I developed the project rapidly with Codex during July 2026.

The result was a technical success in an important sense: I reached a scope and level of integration that I could not have achieved alone in the same time.
The repository also needed substantial refactoring almost immediately.
That combination makes Kirjolab useful as a case study.
It shows both what a disciplined agentic development setup can enable and what happens when the rate of code production exceeds the rate at which the architecture is understood.

The commit counts below describe the shape of the history, not developer productivity.
A small mechanical commit and a difficult design decision are not comparable units of effort.

## Case at a glance

| Evidence                                  | Observation                                                     |
| ----------------------------------------- | --------------------------------------------------------------- |
| Development interval reviewed             | 10–30 July 2026                                                 |
| Repository history                        | 1,433 commits                                                   |
| Commit subjects beginning with `refactor` | 818, about 57% of the history                                   |
| TypeScript files                          | 14 in the initial template; 583 at the reviewed head            |
| TypeScript test files                     | 5 in the initial template; 265 at the reviewed head             |
| Build Week implementation range           | 332 commits, 439 files, 88,867 insertions, and 16,140 deletions |
| Most concentrated restructuring interval  | 696 of 707 commits from 25–28 July were named as refactors      |

The project did not begin with an empty prompt.
The initial commit came from a prepared development template with strict TypeScript, coverage checks, mutation testing, browser tests, affected-file checks, a pre-push gate, local CI, architecture decision records, feature specifications, and repository instructions for agents.
Eight minutes after the initial commit, the product architecture was documented.
The first scholarly workspace slice followed about an hour later.

## What went right

### The harness existed before the feature pressure

The most consequential early decision was to treat the project harness as part of the product.
Generated code had to pass deterministic checks rather than merely look plausible.
The initial harness already checked formatting, types, coverage, browser behavior, security-sensitive browser boundaries, and mutation resistance.
Later changes added more focused diagnostics and faster affected-file paths.

This did not guarantee good architecture, but it kept the system repairable.
When a responsibility was extracted or an external dependency replaced project-owned code, the existing tests could detect behavioral drift.
Rapid generation was therefore paired with rapid rejection of invalid changes.

### The product boundaries were clearer than the source boundaries

The early [architectural vision](https://github.com/bebraw/kirjolab/blob/main/VISION.md) defined several durable principles:

- portable Markdown and bibliography files remain the lasting artifacts;
- evidence, claims, and prose retain explicit relationships;
- derived views can be rebuilt;
- model output is a candidate rather than canonical state; and
- the researcher explicitly accepts, edits, or rejects model suggestions.

Those decisions survived extensive implementation.
Although the internal organization changed, the product did not need to reverse its core authority model.
This distinction matters.
An early architecture does not have to predict every module, but it should identify which information and decisions must remain trustworthy.

### Validation grew with the scope

Testing was not postponed until the end of the rapid phase.
The history shows tests being added alongside collaboration, PDF handling, offline persistence, structured reviews, imports, exports, and model operations.
Mutation coverage was raised to 82% on 13 July.
Exploratory browser reviews recorded findings before fixes, and the corrected workflows were checked again.

The project also used measured spikes instead of adopting dependencies on intuition.
A CodeMirror experiment checked collaboration, completion, Vim behavior, accessibility, offline use, long-document startup, and bundle cost.
It was kept out of production because important physical-device and accessibility evidence was still missing and the bundle cost was substantial.
A `unified-latex` experiment was rejected because it would not remove enough of Kirjolab's conversion policy and handwritten parsing responsibility.
The ability to say “not yet” was part of the technical success.

### The history preserves the learning

Small semantic commits, feature specifications, architecture decision records, review notes, and explicit supersession make the project unusually inspectable.
The [Build Week notes](https://github.com/bebraw/kirjolab/blob/main/docs/build-week-2026-submission.md) even distinguish the contest-period implementation from the earlier foundation.

This documentation supports a stronger account than “the agent was fast.”
It shows which constraints existed, which decisions remained human, what was tested, what was reconsidered, and where the implementation changed direction.

## Where rapid development created pressure

### Functional correctness did not guarantee navigability

The quality gates emphasized whether behavior remained correct.
They did not initially place equally strong limits on module ownership, fan-in, churn concentration, or directory growth.

By 25 July, `src/client/app.ts` had reached 12,495 lines and combined a large element registry with event binding, rendering, and feature orchestration.
The later [modularization RFC](https://github.com/bebraw/kirjolab/blob/main/docs/modularization-and-dependency-rfc-2026-07-29.md) identified several other mixed authorities:

- a 5,636-line document Durable Object covering collaboration, files, history, export, and persistence;
- a 2,766-line review-study Durable Object combining commands and SQLite projection;
- a 2,411-line reference-library Durable Object spanning several persistence lifecycles; and
- a 1,090-line reference-library contract with 82 dependents.

The application could pass its tests while becoming increasingly difficult to navigate.
This is a useful warning for agentic development: a generated test suite can constrain observable behavior without constraining the shape of the code that future agents will learn from.

### Scope expanded faster than consolidation

The original vertical slice connected evidence to prose.
Within days, the project also covered structured literature reviews, GitHub synchronization, LaTeX import, citation trails, collaboration, sharing, offline recovery, advanced PDF workflows, and production operations.

These were not random features.
They fit the larger product direction, and many were implemented carefully.
The problem was their combined arrival rate.
New capabilities accumulated before the previous ones had settled into clear ownership boundaries.
The architecture was learning from the implementation, but it was learning several steps behind it.

### The prepared template had a cost

The initial template supplied the practices that made rapid work safe.
It also began with 978 files and about 142,000 inserted lines, including vendored process material, skills, capability kits, and update infrastructure.
Most of that was not product code.

This is a real trade-off rather than a simple mistake.
Rich repository context gave agents explicit instructions and reusable workflows.
It also increased navigation cost, search noise, and the amount of project material that could enter a model's context.
I would keep the harness, but start from a more sharply pruned version of it.

### The evidence was mostly internal

At the reviewed point, GitHub showed one contributor, no pull requests or issues, direct work on an unprotected `main` branch, and no public GitHub Actions run history exposed through the repository API.
The repository contains strong local validation evidence, but little independent evidence about adoption, usability, production reliability, or realistic load.

Kirjolab therefore supports a bounded conclusion.
It demonstrates rapid implementation, disciplined local validation, and successful architectural recovery.
The history alone does not demonstrate product success or long-term maintainability.

## Refactoring was the revision phase

The project history changes character after the initial delivery push.
From 10–21 July there were 461 commits, mostly features, fixes, tests, and documentation.
On 22 July, 51 of 108 commits were already refactors.
From 25–28 July, 696 of 707 commits were named as refactors.

The work was not one undifferentiated rewrite.
It included:

- extracting presentation and workflow owners from the large client coordinator;
- splitting API and persistence responsibilities;
- replacing repeated handwritten validation with bounded schemas;
- separating pure PDF-analysis mechanics from browser and Worker adapters;
- narrowing the reference-library contracts;
- measuring dependency costs and deleting duplicated infrastructure; and
- finally organizing hundreds of flat source files by product capability.

On 30 July, [ADR-198](https://github.com/bebraw/kirjolab/blob/main/docs/adrs/implemented/ADR-198-organize-source-by-capability.md) recorded that `src/client/` held 312 files and `src/domain/` held 119 files at their roots.
The resulting migration moved them into shallow product-named directories without inventing package or runtime boundaries.

This is the “revise” step of the constrain, generate, validate, revise loop at repository scale.
Implementation exposed the actual domains and change patterns.
Refactoring converted that evidence into new constraints for subsequent work.
The expensive part was that the structural feedback arrived later than the functional feedback.

## What I would do differently

If I started Kirjolab again with the knowledge gained from the project, I would preserve the strict harness and core product model while changing the sequence.

1. **Begin with capability-oriented ownership.** I would establish thin composition roots and directories for authoring, references, PDFs, projects, review, and integrations before those capabilities accumulated hundreds of files.
2. **Hold the first release to one closed loop.** Evidence capture, a traceable claim, a reviewable model suggestion, and portable prose would form the initial product.
   Structured reviews and broad integrations would wait for evidence from that loop.
3. **Add structural feedback earlier.** File size, fan-in, churn concentration, flat-directory growth, and cross-capability dependencies would be reviewed alongside coverage and behavior.
4. **Prune the project template.** I would retain affected checks, mutation testing, local CI, ADRs, and specification rules while removing skills and capability material unrelated to the product.
5. **Create independent evidence.** Public CI results, representative research datasets, usability sessions, deployment signals, and before-and-after change-friction measurements would complement repository-owned tests.
6. **Use review checkpoints.** Even for a single-developer project, grouped pull requests or explicit architectural checkpoints would create opportunities to review the direction of a capability rather than only the correctness of individual commits.

## What Kirjolab teaches

Kirjolab did not fail because it needed refactoring.
Early implementation was also a way to discover the real product and its architecture.
The mistake would be to treat the first working structure as evidence that the development system could sustain the same pace indefinitely.

The case suggests four broader lessons:

- A strong harness can make extraordinary development speed technically useful.
- Functional gates and structural gates answer different questions.
- Agents amplify the patterns and ownership boundaries already present in a repository.
- Refactoring is most effective when its lessons become new project constraints rather than remaining a one-time cleanup.

The technical success was not that the first architecture was final.
It was that the project could move quickly, reveal where its assumptions failed, and use its validation system to turn that learning into a better structure.
