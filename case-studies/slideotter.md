# Slideotter – Learning faster than the product converged

[Slideotter](https://github.com/bebraw/slideotter) is a local, structured workbench for creating and reviewing presentations with language models.
I developed it with coding agents between April and June 2026, before beginning Kirjolab.
It produced a capable application and reusable rendering and review controls, but did not establish a clear first production use.
The case asks how a project can validate its artifacts thoroughly while learning too little about which product people would repeatedly use.

## Case at a glance

The case uses the [24 June 2026 source snapshot](https://github.com/bebraw/slideotter/tree/ab84d4ff679d485640c1774d20b86ad5a650d5a8).
:ref[table:slideotter-snapshot]{text="The table below"} records the reviewed interval and delivery context.

| Evidence                        | Observation                       |
| ------------------------------- | --------------------------------- |
| Development interval reviewed   | 19 April–24 June 2026             |
| Delivery targets explored       | Local browser, desktop, and cloud |
| Public product status at review | Alpha                             |

::caption[Repository evidence from the reviewed Slideotter snapshot.]
::label[table:slideotter-snapshot]

## Validate the rendered artifact

### The project found durable authority boundaries

The first generator produced PowerPoint files, but two days after the initial commit the project [replaced that path with PDF generation](https://github.com/bebraw/slideotter/commit/1c52f32b9c356523dbe6bde4095510efad529dd1).
Two days later it began a browser studio, then moved preview, export, and validation to a shared DOM renderer.

The replacement exposed a durable rule: preview and exported output should use the same rendering authority.
The [architecture](https://github.com/bebraw/slideotter/blob/ab84d4ff679d485640c1774d20b86ad5a650d5a8/docs/ARCHITECTURE.md) keeps structured slide specifications as content, the DOM runtime as rendering authority, and the server as the file-write boundary.
Generated changes remain candidates until the author applies them.

### Validation treated the artifact as more than source code

Slide software can typecheck while producing unreadable slides.
Slideotter therefore checks geometry, text fit, media, visible-text quality, browser workflows, rendered baselines, and PDF output.
Its [repository instructions](https://github.com/bebraw/slideotter/blob/ab84d4ff679d485640c1774d20b86ad5a650d5a8/AGENTS.md) require visual changes to be inspected in the rendered artifact.

Rules for overlap, clipping, margins, and text fit turn named defects into machine-checkable failures.
They cannot establish whether a slide communicates well.
Rendered inspection and editorial judgment remain separate [acceptance steps](/concepts/#acceptance-criteria).

This gives the case its validation lesson: inspect what the author and audience will consume.
A successful source build leaves the quality of the presentation unresolved.

## Capability breadth arrived before a stable first use

The first month covered structured slide specifications, multiple model providers, outline and theme generation, variants, deck restructuring, media workflows, presentation mode, PDF and PowerPoint export, an Electron wrapper, and cloud hosting.

These capabilities pursued one broad vision while testing many product assumptions at once.
Repeated use had not yet shown which workflow deserved priority.
The [roadmap](https://github.com/bebraw/slideotter/blob/ab84d4ff679d485640c1774d20b86ad5a650d5a8/ROADMAP.md) subsequently made real studio usage the source of future work, after a large solution surface already existed.

The harness grew with that surface: fixtures, baselines, validators, build paths, and agent instructions all needed maintenance.
Making the checks more precise could improve an implementation without resolving whether its workflow was worth expanding.

## Packaging and hosting multiplied the system boundaries

Local filesystem use, a command-line package, a browser studio, a macOS wrapper, and a cloud deployment each introduce different storage, authentication, rendering, and release requirements.
Supporting them together broadened the operating model before one delivery path had settled.

At the reviewed point, the [cloud setup guide](https://github.com/bebraw/slideotter/blob/ab84d4ff679d485640c1774d20b86ad5a650d5a8/docs/GETTING_STARTED.md#current-limits) identified production workspace authentication, real queued generation and export, and Durable Object serialization as incomplete.
The Electron path also needed production packaging work.
A functioning authoring workflow and a dependable delivery path required different evidence.

## What transferred to Kirjolab

Canonical artifacts, explicit approval, rendered validation, and preserved decisions carried into later work.
[Kirjolab](/case-studies/kirjolab/) examines the subsequent architectural problem: behavioral checks made correction possible while responsibility boundaries lagged behind feature growth.

Slideotter's distinctive unresolved question was product fit.
Its rendering controls could be reused, but they did not identify the smallest presentation workflow worth operating.

## What I would do differently

I would begin with the local browser studio and use real decks to establish one complete authoring loop before adding desktop or cloud delivery.
With the [shared knowledge-base boundary described in the Kirjolab case](/case-studies/kirjolab/#what-i-would-do-differently), Slideotter would own presentation metadata, outline variants, slide definitions, themes, and approval state while referencing reusable source material.

The first product loop would be:

1. Select or amend the source material and define the audience, purpose, duration, language, and theme.
2. Develop outline variants that reuse the base metadata, then approve one before expanding it.
3. Generate and review the slides, including their layout and rendered output.
4. Bind approval to a reviewed version; later changes produce a new candidate.

Time to an approved deck, corrections, outline revisions, regeneration, and repeated use would test product value separately from repository checks.
Keep the harness focused on provenance, approval state, slide validity, and rendering.
New delivery targets should follow evidence that this loop is useful.

## What Slideotter teaches

Slideotter established useful controls for generating and inspecting presentations.
Its next product decision needed evidence from repeated authoring and use.
Artifact correctness and product convergence require different feedback, even when the same agents help implement both.
