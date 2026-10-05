# Kirjolab – When code production scaled faster than architecture

[Kirjolab](https://github.com/bebraw/kirjolab) is a collaborative workspace for scientific writing.
It connects portable Markdown manuscripts with references, PDF annotations, evidence, and reviewable local-model suggestions.
I developed the project rapidly with Codex during July 2026.

With GPT-5.6, I revisited an idea combining features of [Zotero](https://www.zotero.org/), [Parsifal](https://www.parsifal.com.br/), and [Overleaf](https://www.overleaf.com/) and reached a working prototype within days.
Agents helped me build an integration I could not have achieved alone in the same time, but substantial refactoring followed almost immediately.
The central question is why strong behavioral checks kept the system repairable while its ownership and dependency boundaries became difficult to understand.

The commit counts below describe the shape of the history, not developer productivity.
A small mechanical commit and a difficult design decision are not comparable units of effort.

## Case at a glance

:ref[table:kirjolab-snapshot]{text="The table below"} records the reviewed interval and the concentration of later restructuring.

| Evidence                                  | Observation                                                     |
| ----------------------------------------- | --------------------------------------------------------------- |
| Development interval reviewed             | 10–30 July 2026                                                 |
| Repository history                        | 1,433 commits                                                   |
| Commit subjects beginning with `refactor` | 818, about 57% of the history                                   |
| TypeScript files                          | 14 in the initial template; 583 at the reviewed head            |
| TypeScript test files                     | 5 in the initial template; 265 at the reviewed head             |
| Build Week implementation range           | 332 commits, 439 files, 88,867 insertions, and 16,140 deletions |
| Most concentrated restructuring interval  | 696 of 707 commits from 25–28 July were named as refactors      |

::caption[Repository evidence from the reviewed Kirjolab snapshot.]
::label[table:kirjolab-snapshot]

The project began with a prepared template containing strict TypeScript, coverage and mutation checks, browser tests, affected-file checks, a pre-push gate, local CI, specifications, architecture decision records, and agent instructions.
The product architecture was documented eight minutes after the initial commit; the first scholarly workspace slice followed about an hour later.

## What the harness made possible

### The harness existed before the feature pressure

The [project harness](/concepts/#harness) checked types, coverage, browser behavior, security-sensitive boundaries, and mutation resistance as features arrived.
Existing tests could detect behavioral drift when responsibilities were extracted or dependencies replaced project-owned code.
That made extensive restructuring possible without relying only on a fresh reading of every change.

The early [architectural vision](https://github.com/bebraw/kirjolab/blob/main/VISION.md) also fixed durable product rules: portable manuscripts, traceable evidence, rebuildable derived views, and researcher acceptance of model suggestions.
Those rules survived changes to the internal organization.
The uncertainty concerned how code responsibilities should be divided as more capabilities arrived.

Specifications, [architecture decision records](/concepts/#decision-log), review notes, and the [Build Week account](https://github.com/bebraw/kirjolab/blob/main/docs/build-week-2026-submission.md) preserve the decisions and corrections behind the final implementation.

## Where architectural understanding fell behind

### Functional correctness did not guarantee navigability

The quality gates emphasized whether behavior remained correct.
They did not initially place equally strong limits on module ownership, fan-in, churn concentration, or directory growth.

By 25 July, `src/client/app.ts` had reached 12,495 lines and combined a large element registry with event binding, rendering, and feature orchestration.
The later [modularization RFC](https://github.com/bebraw/kirjolab/blob/main/docs/modularization-and-dependency-rfc-2026-07-29.md) identified several other mixed authorities:

- a 5,636-line document Durable Object covering collaboration, files, history, export, and persistence;
- a 2,766-line review-study Durable Object combining commands and SQLite projection;
- a 2,411-line reference-library Durable Object spanning several persistence lifecycles; and
- a 1,090-line reference-library contract with 82 dependents.

Passing tests did not tell a contributor where a responsibility belonged or how widely a contract change would propagate.
File size was a symptom; mixed ownership and dependency reach explained why the next change was becoming harder.

### Scope expanded faster than consolidation

The original vertical slice connected evidence to prose.
Within days, it also covered structured literature reviews, GitHub synchronization, LaTeX import, citation trails, collaboration, sharing, offline recovery, advanced PDF workflows, and production operations.
Each capability fit the product direction, but their combined arrival rate left too little time to consolidate ownership.
Implementation exposed the domains faster than the architecture absorbed them.

### The prepared template had a cost

The initial template also contained 978 files and about 142,000 inserted lines, including vendored process material, skills, capability kits, and update infrastructure.
Most of that was not product code.
Explicit instructions and reusable workflows supported validation while adding navigation cost and search noise.
Pruning unrelated material would reduce the context a contributor must understand before reaching the product code.

## Refactoring was the revision phase

The history shifts from 461 mostly feature, fix, test, and documentation commits on 10–21 July to 696 refactor-named commits out of 707 on 25–28 July.
The corrections addressed specific ownership problems:

- extracting presentation and workflow owners from the large client coordinator;
- splitting API and persistence responsibilities;
- separating pure PDF-analysis mechanics from browser and Worker adapters;
- narrowing the reference-library contracts; and
- organizing hundreds of flat source files by product capability.

On 30 July, [ADR-198](https://github.com/bebraw/kirjolab/blob/main/docs/adrs/implemented/ADR-198-organize-source-by-capability.md) recorded 312 files at the root of `src/client/` and 119 at the root of `src/domain/`.
The migration grouped them into shallow product-named directories without adding package or runtime boundaries.

This was the “revise” step of the [development loop](/concepts/#feedback-loop) at repository scale: observed change patterns became boundaries for later work.
The cost was that structural feedback arrived after substantial functional implementation.
I carried the lesson back to my template, combining [mutation testing](https://stryker-mutator.io/) with [cognitive-complexity analysis](https://fallow.tools/docs/explanations/health/).
One challenges whether tests detect behavioral changes; the other identifies code that is becoming difficult to reason about.

## What I would do differently

I would establish ownership boundaries and review the cost of a representative next change before adding another broad capability.
Separating manuscript ownership from reusable source knowledge gives one concrete example.

An external knowledge base would own source records, relationships among sources, and annotations.
Annotations would normally belong to their creator, with explicit sharing.
The same researched material could support [Slideotter](/case-studies/slideotter/) without either product owning the other's workflow.

Every imported PDF would be an immutable, uniquely identified document.
A collection could reveal related drafts or editions while existing references continue to identify the document originally reviewed.
Kirjolab would own manuscripts, manuscript-specific claims, evidence links, prose, and review state.
An evidence link would pin a claim to an exact document and reviewed annotation revision.
Replacing either would require explicit review.

{{ import "site/includes/shared-knowledge-boundary-figure.html" }}

That proposed split should justify itself through changes: can a source revision, manuscript edit, or presentation change be explained and implemented within its declared owner?

I would also change the development controls:

1. **Add structural feedback alongside behavior checks.** Review file size, fan-in, churn, and cross-capability dependencies as signals for investigation.
2. **Probe the next change.** Trace one representative workflow, identify its owners, and explain the contracts it crosses before expanding scope.
3. **Prune the harness.** Keep checks and instructions that protect this product; remove unrelated template capabilities and obsolete guidance.
4. **Revisit boundaries after implementation.** Use newly observed change patterns to correct the ownership model before the next expansion.

## What the evidence supports

At the reviewed point, the repository had one contributor and strong local validation evidence, with little independent evidence about adoption, usability, production reliability, or realistic load.
The history supports an account of implementation and architectural recovery.
It does not establish that the revised boundaries will remain maintainable or that the product has succeeded in use.
