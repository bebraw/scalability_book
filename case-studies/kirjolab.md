# Kirjolab – When code production scaled faster than architecture

[Kirjolab](https://github.com/bebraw/kirjolab) is a collaborative workspace for scientific writing.
It connects portable Markdown manuscripts with references, PDF annotations, evidence, and reviewable local-model suggestions.
I developed the project rapidly with Codex during July 2026.

With GPT-5.6, I revisited an idea combining features of [Zotero](https://www.zotero.org/), [Parsifal](https://www.parsifal.com.br/), and [Overleaf](https://www.overleaf.com/) and reached a working prototype within days.
Agents helped me build an integration I could not have achieved alone in the same time.
Weeks later, I could still run a browser test to check that a writer could edit a manuscript.
Finding the code responsible for that edit had become much harder.

## Case at a glance

The [30 July 2026 source snapshot](https://github.com/bebraw/kirjolab/tree/02141653d503dbf78b0acaf2c4bae67ddd8752b6) records the initial build and refactoring summarized in :ref[table:kirjolab-snapshot]{text="the table below"}.
An August decision and the [23 November source snapshot](https://github.com/bebraw/kirjolab/tree/403cd8109529822d20b481b639afe499099425a3) show what happened to one of the proposed boundaries.

| Evidence                      | Observation                                                     |
| ----------------------------- | --------------------------------------------------------------- |
| Development interval reviewed | 10–30 July 2026                                                 |
| Development controls          | Prepared harness with behavioral checks and decision records    |
| Product status at review      | Working prototype followed by major architectural consolidation |

::caption[Repository evidence from the reviewed Kirjolab snapshot.]
::label[table:kirjolab-snapshot]

## The harness existed before the feature pressure

A prepared [project harness](/concepts/#harness) gave me strict TypeScript, browser tests, coverage and mutation checks, and a pre-push gate from the start.
When I moved code out of the editor coordinator, I could run the same browser journeys against the new arrangement.
Those checks gave me a way to find behavior I had broken during the move.

The product rules were clear early on.
Manuscripts had to stay portable, a writer had to be able to trace a claim to its evidence, and only the researcher could accept a model's suggestion.
I kept those rules in the [architectural vision](https://github.com/bebraw/kirjolab/blob/02141653d503dbf78b0acaf2c4bae67ddd8752b6/VISION.md) and recorded changes in [architecture decision records](/concepts/#decision-log).
The [Build Week account](https://github.com/bebraw/kirjolab/blob/02141653d503dbf78b0acaf2c4bae67ddd8752b6/docs/build-week-2026-submission.md) traces the decisions behind the prototype.

## Where architectural understanding fell behind

By 25 July, `src/client/app.ts` had reached 12,495 lines.
Finding the owner of an editor action meant tracing the element registry, event bindings, rendering, and feature orchestration through one file. [July diagnostic notes](https://github.com/bebraw/kirjolab/blob/02141653d503dbf78b0acaf2c4bae67ddd8752b6/docs/dependency-reduction-notes-2026-07-25.md)

The reference library exposed a different problem.
Its shared contract was 1,090 lines long and had 82 dependents.
A contributor changing how the library represented a PDF had to find which of those consumers relied on that part of the contract.
A passing editor test could tell the contributor whether the editing journey still worked, but it gave little guidance on where to start looking. [July modularization RFC](https://github.com/bebraw/kirjolab/blob/02141653d503dbf78b0acaf2c4bae67ddd8752b6/docs/modularization-and-dependency-rfc-2026-07-29.md)

In the same few weeks, I added structured literature reviews, GitHub synchronization, and LaTeX import to a prototype originally built to connect evidence to prose.
The template supplied workflows for testing each addition, alongside instructions and skills unrelated to the feature at hand.
Searching for the owner of a feature also meant sorting through that inherited material.

## Refactoring was the revision phase

From 25 to 28 July, work shifted toward extracting workflows from the client coordinator, separating PDF analysis from the browser and Worker code that called it, and narrowing the reference-library contracts.
On 30 July the client and domain files moved into directories named for the capabilities they served.
A contributor could now start in the directory for a feature.
The application still ran as before. [ADR-198 on source organization](https://github.com/bebraw/kirjolab/blob/02141653d503dbf78b0acaf2c4bae67ddd8752b6/docs/adrs/implemented/ADR-198-organize-source-by-capability.md)

I brought this part of the [development loop](/concepts/#feedback-loop) back into my template. [Mutation testing](https://stryker-mutator.io/) checks whether a test catches a change in behavior.
I added [cognitive-complexity analysis](https://fallow.tools/docs/explanations/health/) to point me toward code a contributor may struggle to follow while the feature still works.

## What I would do differently

Looking back at the July prototype, I would give reusable research material an owner outside the manuscript.
A writer and a presenter might use the same paper while making different claims about it.
In that design, an evidence link would identify the exact document and annotation revision the author reviewed.
A later edition could sit alongside it, and the author could decide whether to update the claim.
The figure shows that proposal.

{{ import "site/includes/shared-knowledge-boundary-figure.html" }}

On 24 August Kirjolab introduced a separately deployable Research Corpus service for source identity, original files, provenance, and extraction results.
Manuscripts, claims, and review decisions stayed with Kirjolab.
By the November snapshot, an upload through the new service and one through the existing library route called the same PDF intake operation.
Both used the existing library and storage, so adding a client interface did not require copying every researcher's files or reconciling competing writes. [Research Corpus decision](https://github.com/bebraw/kirjolab/blob/403cd8109529822d20b481b639afe499099425a3/docs/adrs/implemented/ADR-227-extract-research-corpus-service.md) · [PDF intake implementation](https://github.com/bebraw/kirjolab/blob/403cd8109529822d20b481b639afe499099425a3/src/library-pdf-ingest.ts)

[Slideotter](/case-studies/slideotter/) found a smaller piece it could reuse.
It uses Kirjolab's paper-import package to inspect a LaTeX archive or extract text from a PDF, lets the presenter review the import, and saves confirmed material with the presentation.
That workflow shares parsing code.
Each product still keeps its own project records, and a live corpus shared between them remains a proposal. [Slideotter's import adapter](https://github.com/bebraw/slideotter/blob/6845b401eaa3f30861c771839a7e2bb2aca69bc5/studio/server/services/paper-import/kirjolab-adapter.ts) · [Paper-import decision](https://github.com/bebraw/slideotter/blob/6845b401eaa3f30861c771839a7e2bb2aca69bc5/docs/adr/implemented/0064-reviewed-latex-and-pdf-paper-import.md)

If I were starting again, I would rehearse one likely change before adding the next capability.
Suppose a PDF arrives in a new edition.
Who can register it, which claim still points to the old one, and whose approval would move the link?
The answers give me a reason to keep two responsibilities together or move one out.

The repositories let us trace where such a change would go.
Measuring what the new boundaries save would take evidence from the maintainers who use them.
