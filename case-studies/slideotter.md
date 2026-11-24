# Slideotter – Learning faster than the product converged

[Slideotter](https://github.com/bebraw/slideotter) is a local, structured workbench for creating and reviewing presentations with language models.
I began building it with coding agents in April 2026, before I started Kirjolab.
By June I could check whether a slide clipped its text in the exported PDF, yet I still had little evidence about which authoring task people would come back to do.
In August the studio gained a more specific use.
A presenter could turn a research paper into a talk with a time limit.

## Case at a glance

:ref[table:slideotter-snapshot]{text="The table below"} distinguishes the [24 June studio](https://github.com/bebraw/slideotter/tree/ab84d4ff679d485640c1774d20b86ad5a650d5a8) from the [26 August implementation](https://github.com/bebraw/slideotter/tree/6845b401eaa3f30861c771839a7e2bb2aca69bc5), the latest public main-branch revision at the November 2026 review.

| Evidence              | Observation                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| Initial build         | 19 April–24 June 2026, including local browser, desktop, and cloud delivery |
| August addition       | Reviewed paper import and timed outlines in the local studio                |
| Public product status | The August README describes the studio as alpha                             |

::caption[Repository evidence from the reviewed Slideotter snapshot.]
::label[table:slideotter-snapshot]

## Validate the rendered artifact

The first generator produced PowerPoint files.
Within a week the project had switched to [PDF generation](https://github.com/bebraw/slideotter/commit/1c52f32b9c356523dbe6bde4095510efad529dd1) and started a browser studio.
Preview, export, and validation later came to share one DOM renderer.

If the preview and export wrap a heading differently, approving the preview tells me little about the PDF my audience will see.
In the [studio architecture](https://github.com/bebraw/slideotter/blob/ab84d4ff679d485640c1774d20b86ad5a650d5a8/docs/ARCHITECTURE.md), the model proposes a change to a structured slide, the DOM runtime renders it, and the server writes the change when the author applies it.

The studio checks for overlap, clipping, margins, and text fit.
The [repository instructions](https://github.com/bebraw/slideotter/blob/ab84d4ff679d485640c1774d20b86ad5a650d5a8/AGENTS.md) ask contributors to inspect visual changes in the rendered deck.
A slide can pass every geometry check and still give more room to a minor result than to the paper's main finding.
That is a decision for the author at the [acceptance step](/concepts/#acceptance-criteria).

## Capability breadth arrived before a stable first use

In the first month I explored outline and theme generation, slide variants, media workflows and two export formats.
Each option added fixtures or renderings to maintain before I knew which workflow someone would use for a second deck.
The June [roadmap](https://github.com/bebraw/slideotter/blob/ab84d4ff679d485640c1774d20b86ad5a650d5a8/ROADMAP.md) made real studio use the basis for choosing further work.

## Packaging and hosting multiplied the system boundaries

Local filesystem use, a command-line package, a browser studio, a macOS wrapper, and a cloud deployment each introduce different storage, authentication, rendering, and release requirements.
Supporting them together broadened the operating model before one delivery path had settled.

In June, the [cloud setup guide](https://github.com/bebraw/slideotter/blob/ab84d4ff679d485640c1774d20b86ad5a650d5a8/docs/GETTING_STARTED.md#current-limits) identified production workspace authentication, real queued generation and export, and Durable Object serialization as incomplete.
The Electron path also needed production packaging work.
A functioning authoring workflow and a dependable delivery path required different evidence.

## What transferred to Kirjolab

The distinction between an agent's candidate and an author's approved revision carried over to [Kirjolab](/case-studies/kirjolab/).
By August, code was moving in the other direction as well.
Slideotter uses [Kirjolab's paper-import package](https://github.com/bebraw/slideotter/blob/6845b401eaa3f30861c771839a7e2bb2aca69bc5/studio/server/services/paper-import/kirjolab-adapter.ts), pinned at version 0.1.3, to inspect a LaTeX archive or extract text from a PDF.
The studio keeps the reviewed sources, outline and slides in its own workspace.

One [workflow test](https://github.com/bebraw/slideotter/blob/6845b401eaa3f30861c771839a7e2bb2aca69bc5/tests/paper-workflow.test.ts) follows a paper from import to a timed outline.
The author approves a digest of the paper, and the studio rejects it if its recorded source fingerprint no longer matches the paper.
For a 20-minute talk, the test reserves 2½ minutes and allocates the remaining 17½ minutes across four planned slides.
The presenter still has to rehearse to find out whether those slides fit the time.

## What I would do differently

I would have started with the local studio and a real speaking deadline before adding desktop or cloud delivery.
The August [paper-to-talk workflow](https://github.com/bebraw/slideotter/blob/6845b401eaa3f30861c771839a7e2bb2aca69bc5/docs/adr/implemented/0065-timed-paper-to-presentation-creation.md) gives me a way to test that choice.
I would watch where a presenter edits the approved outline after rehearsal and whether they come back with a second paper.

Sharing a live research collection would be a further step beyond using the same importer.
Under the [design discussed in the Kirjolab case](/case-studies/kirjolab/#what-i-would-do-differently), the studio could reference a passage kept elsewhere while continuing to own its slides and their approval.

I would try keeping a link to the source of a copied result, as Denicek does in its [copied-formula example](https://tomasp.net/denicek/#chapter6).
Suppose a benchmark table gives the 95th percentile for search latency as 800 ms, and an author writes “95% of searches finished within 0.8 seconds” on a slide.
If the source figure is corrected to 600 ms, the studio could flag that sentence on the slide and show the corrected table cell beside it.
The author could change 0.8 to 0.6, keep the wording chosen for the audience, and approve the revised slide.

## What Slideotter teaches

The studio can check whether a slide fits, whether a plan has spent its time budget, and whether the presenter approved an interpretation of the current paper.
To decide what to develop next, I would also need to know what survived rehearsal, what the presenter rewrote, and which parts of the workflow they used again.
