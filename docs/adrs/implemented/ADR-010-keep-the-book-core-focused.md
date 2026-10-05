# ADR-010: Keep the book core focused

**Status:** Implemented

**Date:** 2026-10-05

## Context

The book serves course participants and independent readers who may read only selected chapters.
Detailed tool examples, optional exercises, course contribution policies, and repeated case studies can interrupt a chapter's main argument.
Course obligations also become harder to find when distributed through teaching prose.

## Decision

Keep the nine main chapters focused on their engineering argument and essential project checkpoints.
Move optional depth and specialized exercises to linked appendices, while retaining the explanation needed to understand a core claim in its chapter.
The Navigator exercise belongs in the workflow-evaluation appendix; the CAP proof and partition lab belong in the advanced web-boundaries appendix, linked from the core operational discussion.

Centralize course-wide guidance in the project introduction before the Common Contract and the three phase briefs.
Keep assistance records, external contribution policies, group/submission responsibilities, and course assessment instructions outside the main book reading path.
The common and phase contracts own deliverables; chapter artifacts contribute to that evidence rather than creating additional submissions.

Keep supporting case studies separate and give each a distinct contribution to the book's reasoning.
Combine the related Datadog material in the Temper case study rather than adding parallel cases for each article.
Drop the case study about developing this book itself.
Sharpen Kirjolab around behavior checks and delayed architectural feedback, and Slideotter around inspectable rendered artifacts and the gap between product breadth and evidence of repeated use.
Keep case claims bounded by their available evidence and link cases where their lesson helps the reader.

## Trigger

The instructor requested a simpler core, questioned the placement of course guidelines in Scalable Development, and reviewed the roles of the growing case-study collection.

## Consequences

**Positive:**

- Independent readers can follow the core without course administration interrupting it.
- Course participants have one entry point for shared project obligations.
- Optional depth and case evidence remain available where relevant.

**Negative:**

- Cross-links must preserve discoverability when material moves.
- Editorial review must distinguish necessary explanation from optional depth rather than simply shortening every chapter.

**Neutral:**

- Moving material to an appendix does not make a named phase deliverable optional.
- The PDF and website continue to include the supplementary material through the publication configuration.

## Alternatives considered

### Keep all depth and course policies inside the main chapters

This increases interruption and ties the book's reading flow to participation in one course.

### Create a new case study for every related article

This inflates the collection and separates evidence about the same tool and organization.

### Remove supporting material entirely

This loses useful verification detail and examples that interested readers can inspect after the core argument.

## Implementation and verification

[site.config.jsonc](../../../site.config.jsonc) distinguishes main chapters, appendices, and case studies.
The [project introduction](../../../specifications/00_introduction.md) precedes the [Common Contract](../../../specifications/00_common_project.md).
[Appendix A](../../../book/04_appendices/A_evaluating_agentic_workflows.md) contains Navigator; [Appendix C](../../../book/04_appendices/C_advanced_web_boundaries.md) contains the CAP proof and lab.
The consolidated [Temper](../../../case-studies/temper.md), revised [Kirjolab](../../../case-studies/kirjolab.md), and revised [Slideotter](../../../case-studies/slideotter.md) records establish the case-study changes.
The book's own case study is absent from the publication list.
Future moves should verify links and rendered publication order with the site build and validation commands.

## Historical evidence

- [2026-10-05: move supporting procedures from core chapters](https://github.com/bebraw/scalability_book/commit/4eff45945f15f274bc7e86f7b06152474aff3b7e).
- [2026-10-05: relocate Navigator](https://github.com/bebraw/scalability_book/commit/530e6c6ea2f2f461052e7bc17047d642ad7d691d) and [the CAP proof/lab](https://github.com/bebraw/scalability_book/commit/25d7daaeb4d35bd1274f03e14ca9a2f7d820a919).
- [2026-10-05: centralize course guidelines](https://github.com/bebraw/scalability_book/commit/7afd87b0c9b6ea4dbe14385b6a22efd5eda1ade5).
- [2026-10-05: consolidate Datadog evidence in Temper](https://github.com/bebraw/scalability_book/commit/04a10272075cedaf904bdb7cc88f67e7b01ef0b7).
- [2026-10-05: sharpen cases and remove the book retrospective](https://github.com/bebraw/scalability_book/commit/9dde48ff98455e24769627c2e4aefca89333d08f).
