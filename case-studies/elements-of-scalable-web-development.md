# Elements of Scalable Web Development – When a book became a web project

[Elements of Scalable Web Development](https://github.com/bebraw/scalability_book) began as a course outline and a set of Markdown chapters.
It became a static website, local authoring environment, feedback service, collection of interactive labs, PDF book, and set of lecture decks.
I developed the manuscript and publishing system together through iterative work with coding agents.

This makes the book a useful case study in its own subject.
It is a web project whose application behavior, development system, and human–agent workflow evolved together.
Agent assistance made producing candidate text and code fast, but it did not make the educational argument, source interpretation, or visual judgment automatic.
As the project grew, coherence and [review](/concepts/#review-budget) became the binding constraints.

The repository supports analysis of what changed and which checks were added.
It does not preserve a complete division between human- and agent-produced work or provide a controlled evaluation of productivity or learning outcomes.
The account of the collaboration is therefore my author perspective, bounded by repository evidence.

## Case at a glance

The figures below refer to the pinned [6a3e43b snapshot](https://github.com/bebraw/scalability_book/tree/6a3e43bf635e6872fba4f8ca486bb995fc17cfba), immediately before this case study was added.

| Evidence                    | Observation                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| Development interval        | 16 January–1 September 2026                                                                        |
| Repository history          | 379 commits                                                                                        |
| Git author records          | 374 commits by the author and five by automation                                                   |
| Published book structure    | Introduction, nine chapters, six appendices, and five existing case studies                        |
| Validated static output     | 32 HTML pages                                                                                      |
| Reader and teaching outputs | Web edition, book PDF, nine lecture decks and PDFs, interactive labs, and downloadable exercises   |
| Development interfaces      | Local Markdown editor, live rebuild, browser preview, and optional paragraph-level reader feedback |
| Validation layers           | Type checking, unit tests, browser tests, HTML validation, and visual inspection                   |

Commit counts describe repository activity rather than productivity.
The Git author field records who committed a change, not whether every sentence or line of code was drafted by a person or an agent.

## The project grew through layers

### A course model came before the publishing system

The [initial commit](https://github.com/bebraw/scalability_book/commit/be82cf40fbc020d221c446fe6a2d8d3aaf00e09e) contained only a README.
The next step created [nine empty chapter files](https://github.com/bebraw/scalability_book/commit/feca757bf13c63a0a20409e7d6b21408c85ea215), and the first substantial course specification and chapter arrived in February through [one bounded project definition](https://github.com/bebraw/scalability_book/commit/277c96b56b4bb6d6ec8483bdd4c0d67e8980de2c).

That order mattered.
The repository began with questions about course structure, workload, and what readers should build rather than with a preferred website stack.
The later software had a product boundary to serve: make a changing course book readable, teachable, and maintainable.

### The website became an authoring environment

The [first website build](https://github.com/bebraw/scalability_book/commit/bc417609c7fb9d8a6bb5afcf14e462f70fd98177) arrived in May.
It introduced the static build, site configuration, navigation, themes, and the basic reading interface.
The system then gained reusable templates, a local Markdown editor, automatic rebuilds, and a [paragraph-level feedback workflow](https://github.com/bebraw/scalability_book/commit/6f12e0fb993775b81c3014baad10219e9b5ed10c).

The authoring loop therefore moved inside the web project.
Markdown remained the durable manuscript, while the local site exposed the rendered context in which wording, navigation, tables, demos, and responsive layout could be judged.
The deployed edition stayed read-only apart from its bounded feedback interface; source mutation remained a local development capability.

### Content and software began to co-evolve

By July, the book contained interactive teaching tools rather than only prose and static figures.
A major [interactive-demo expansion](https://github.com/bebraw/scalability_book/commit/dcc1d256665883e132ce620d0dd90f2b36663fe4) added formal-law, performance, and development-loop demonstrations together with browser tests.
The Markdown pipeline later [adopted ScholarMark](https://github.com/bebraw/scalability_book/commit/57ce0bf884bc54ac0b74aa642634fdb169f15ecb) so citations, references, captions, numbering, and safe host extensions could share one semantic renderer.

The project also expanded beyond the website.
Case studies became their own publishing collection, and August added a [reproducible PDF edition](https://github.com/bebraw/scalability_book/commit/0157af6f0d0cbdb00ea53501a3fc9eeda18696d5) plus [nine lecture decks and PDF exports](https://github.com/bebraw/scalability_book/commit/db48d959eea91af6aed1647162e91f29716dd0b0).
One manuscript now had several reader and teaching surfaces with related but different layout requirements.

## What worked

### One repository kept the layers inspectable

The manuscript, site templates, interactive components, tests, bibliography, project specifications, lecture sources, and generated editions share one history.
That arrangement makes a content change capable of carrying its own implementation and validation changes.
A new diagram can arrive with geometry checks; a new case study can update navigation, PDF contents, and browser tests in the same reviewable unit.

The repository also acts as project memory.
Commit history preserves corrections and reversals that the finished site would otherwise hide.
The evidence is imperfect, but it is more durable than relying on one agent session or the author's recollection of why a section changed.

### Local validation made fast iteration usable

The build checks more than whether Markdown becomes HTML.
It rejects unknown citations, preserves semantic table and figure references, type-checks the publishing code, validates generated pages, and exercises reader behavior with Playwright.
The local preview adds browser inspection to that deterministic loop.

The [pedagogical-diagram change](https://github.com/bebraw/scalability_book/commit/7273aff53dcb6c3c1d56d684b394060cbf894e99) is a concrete example.
Visual review exposed text escaping its boxes, awkward caption width, and a diagram that overflowed its case-study column.
The correction added shared rendering infrastructure and browser checks for text containment, node overlap, caption width, and page overflow.
The first visual defect became a reusable constraint for later graphics.

### Editorial complaints could become durable changes

Many useful revisions began as qualitative judgments: a claim felt inaccurate, a paragraph was hard to follow, a table repeated itself, or a layout looked unbalanced.
Those complaints were not defects an automated check could discover reliably on its own.
Once identified, however, an agent could trace the relevant source and implementation, propose a bounded correction, and sometimes encode part of the lesson as a test.

Recent commits show several forms of this [loop](/concepts/#feedback-loop):

- [citation scope was corrected across chapters](https://github.com/bebraw/scalability_book/commit/c167420a57d1f3b48478054e28532f6c22976fa7);
- [a repetitive evidence matrix was collapsed](https://github.com/bebraw/scalability_book/commit/fdc3aaaa89aafda88b16db03e27cfa0cbb9f38ba);
- [dense project instructions were converted into explicit procedures](https://github.com/bebraw/scalability_book/commit/ae838085f239850199e078d7627c5a89e1587e79); and
- [an uneven appendix grid became two rows of three](https://github.com/bebraw/scalability_book/commit/6a3e43bf635e6872fba4f8ca486bb995fc17cfba), with a browser test preserving that geometry.

The agent accelerated investigation and execution.
The initiating judgment—that something was inaccurate, unclear, repetitive, or visually wrong—still came from a person responsible for the book.

## Where speed created pressure

### Coherence became the bottleneck

Agents could produce paragraphs, examples, demos, tests, and site features faster than I could judge the whole result.
That speed was valuable when the direction was clear.
It also made it easy for locally reasonable additions to accumulate into repeated explanations, overloaded sections, or an argument whose priorities were no longer obvious.

The resulting risk was speed blindness.
Finishing another plausible change could feel like progress even when the higher-value action was to compare chapters, remove material, question a source, or stop and rebuild context from the repository.
The project required repeated passes from local correctness toward book-wide coherence.

### Text and code required different evidence

A type check can reject an invalid interface, and a browser test can detect overflow or a broken link.
Neither can determine whether a chapter teaches the right idea at the right moment.
A citation parser can prove that a bibliography key exists without proving that the source supports the surrounding sentence.
A generated slide can contain relevant information while still being a weak presentation.

The project therefore needed two related [acceptance systems](/concepts/#acceptance-criteria).
Executable checks constrained properties that could be stated mechanically.
Editorial review judged meaning, emphasis, progression, source interpretation, and fit for the intended readers.
Automating the first system made the second more important rather than obsolete.

### The agentic workflow was not evaluated independently

The repository does not contain a controlled comparison of authoring with and without agents.
It does not consistently record model versions, prompts, rejected drafts, review time, or how much context had to be rebuilt for each task.
Commit history shows accepted changes, not the full cost of arriving at them.

The feedback system has a similar limit.
Its existence demonstrates a technical path for reader comments and local editorial response, but it does not establish that readers used it or that it improved learning.
Likewise, passing tests establish only their declared properties.
The case supports claims about an inspectable publishing workflow, not causal claims about author productivity or educational effectiveness.

## The book exposes three connected loops

| Loop                    | How it appears in the project                                                       | Evidence used to close it                                                    |
| ----------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Application scalability | Static routes, navigation, themes, diagrams, demos, feedback, and responsive layout | Generated-page validation, browser journeys, geometry checks, and inspection |
| Development scalability | Markdown, bibliography, templates, build scripts, PDFs, decks, and project history  | Reproducible commands, type and unit checks, diffs, and commit history       |
| Agentic development     | Human direction, agent implementation and review, correction, and acceptance        | Reviewed changes and interventions; no separate controlled agent evaluation  |

The loops constrain one another.
A pedagogical decision can require a new interactive component.
That component expands the publishing and testing system.
The new system makes another kind of explanation possible but also increases the surface that must remain understandable and correct.

This is why the book itself fits the argument of [Chapter 9](/chapters/recap/).
Scaling meant preserving usefulness while manuscript scope, delivery formats, visual expectations, source requirements, and development speed changed.
It did not mean maximizing any one of them.

## What I would do differently

I would preserve the Markdown manuscript, static delivery, local-first validation, and direct control over the educational vision.
I would establish several supporting boundaries earlier:

1. **Map the argument before expanding it.** Give every chapter, case, demo, and appendix an explicit role in the final progression so a new addition must replace, deepen, or connect rather than merely repeat.
2. **Track claims and evidence deliberately.** Keep source facts, author interpretation, and proposed transfer separate from the start, with stable links from manuscript claims to reviewed evidence.
3. **Add editorial diagnostics early.** Use heuristics to flag unusually long requirement blocks, repeated table cells, duplicated explanations, and unreferenced sections for review without pretending that a linter can judge pedagogy.
4. **Define the visual system before multiplying diagrams.** Reusable geometry, typography, caption, mobile-overflow, and contrast rules should precede the full illustration pass.
5. **Preserve more workflow evidence.** Record a small representative set of prompts, model and harness versions, rejected proposals, review interventions, and correction time so later claims about agentic development have firmer support.
6. **Separate manuscript ownership from reusable source knowledge.** The repository should own the book's argument and prose, while a versioned knowledge base could hold reusable documents, annotations, and relationships that other manuscripts or presentation systems can share.

These changes would direct production toward a coherent learning experience and expose correction costs earlier.

## What the book project teaches

The manuscript and publishing system made editorial judgment the limiting resource.
One repository helped connect text, software, validation, and history, but checks on one could not establish the quality of another.
The development system is useful when it helps a future revision recover the argument, inspect its evidence, and correct the result.
