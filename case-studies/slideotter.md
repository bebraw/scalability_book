# Slideotter – Learning faster than the product converged

[Slideotter](https://github.com/bebraw/slideotter) is a local, structured workbench for creating and reviewing presentations with language models.
I developed it with coding agents between April and June 2026, before beginning Kirjolab.
It is the less successful product of the two, but it was an important development-system experiment.

Slideotter produced a capable application, a strong validation harness, and several ideas that carried into later work.
It did not reach the same clarity about its first production use.
The case is therefore not a story of technical failure.
It is a story of learning rapidly while the product, architecture, and deployment target were all still moving.

The commit counts below describe the shape of the history, not developer productivity.
A mechanical extraction and a difficult product decision are not comparable units of work.

## Case at a glance

| Evidence                                                      | Observation                                               |
| ------------------------------------------------------------- | --------------------------------------------------------- |
| Development interval reviewed                                 | 19 April–24 June 2026                                     |
| Repository history                                            | 1,606 commits                                             |
| Commits made by 15 May                                        | 1,444, about 90% of the history                           |
| Structurally named commit subjects                            | 457, about 28% of the history                             |
| TypeScript files                                              | 0 in the initial README-only commit; 517 at reviewed head |
| TypeScript test or specification files                        | 49                                                        |
| TypeScript and JavaScript lines in application and test areas | About 98,000                                              |
| Implemented architecture decision records                     | 58                                                        |
| Public product status                                         | Alpha                                                     |

## What worked

### The project found durable authority boundaries

Slideotter changed its implementation direction very early.
The first generator produced PowerPoint files, but two days after the initial commit the project [replaced that path with PDF generation](https://github.com/bebraw/slideotter/commit/1c52f32b9c356523dbe6bde4095510efad529dd1).
Two days later the repository began a browser studio and then migrated preview, export, and validation to a shared DOM renderer.

The replacement was expensive, but it exposed a durable principle: preview and exported output should use the same rendering authority.
The current [architecture](https://github.com/bebraw/slideotter/blob/main/docs/ARCHITECTURE.md) keeps structured slide specifications as content, the shared DOM runtime as the rendering authority, and the server as the file-write boundary.
Generated changes remain candidates until the author applies them.

Those are useful product constraints, not only code organization.
They reduce the chance that an agent silently changes canonical work or that preview behavior drifts from the published artifact.

### Validation treated the artifact as more than source code

Slide software can typecheck while still producing unreadable slides.
The project therefore validates geometry, text fit, media, visible-text quality, browser workflows, rendered baselines, and PDF output in addition to types and tests.
Its [repository instructions](https://github.com/bebraw/slideotter/blob/main/AGENTS.md) require visual changes to be checked in the rendered artifact rather than inferred from source coordinates.

Layout rules were established early so generated slides had explicit limits for overlap, clipping, margins, and text fit.
Those rules narrowed the model's search space and turned several obvious visual defects into machine-checkable failures before review.
They could not establish whether a slide communicated well, so rendered inspection and editorial judgment remained separate acceptance steps.

That practice carried an important lesson into later projects: validation should inspect the thing the user consumes.
For a presentation tool, the PDF is part of the behavior.

### The history retained decisions and reversals

The repository contains a roadmap, a current-status document, architecture guides, manual test notes, competitive comparisons, and implemented or proposed architecture decision records.
This made the rapid development legible after the fact.

The documentation also became a coordination surface for agents.
The [roadmap](https://github.com/bebraw/slideotter/blob/main/ROADMAP.md) distinguishes durable direction from the next practical slice, while the status document records the live implementation.
That separation is more useful than one ever-growing backlog because it tells a future agent both why the system has its current shape and what remains uncertain.

## Why the product was less successful

### Capability breadth arrived before a stable first use

Within the first month, Slideotter accumulated most of its history.
The work covered structured slide specifications, multiple model providers, outline and theme generation, variants, deck restructuring, media workflows, browser presentation mode, PDF and PowerPoint export, an Electron wrapper, and a Cloudflare hosting direction.

These capabilities support the same broad vision, but they do not form one small hypothesis.
The project learned about many parts of presentation authoring at once before repeated real use had shown which problems mattered most.
Its current roadmap appropriately says that the next work should come from real studio usage, but that constraint arrived after a large solution surface already existed.

### Packaging and hosting multiplied the system boundaries

The repository supports local filesystem-backed use, a command-line package, a browser studio, a macOS wrapper, and a cloud proof path.
Each target is plausible in isolation.
Together they introduce several storage, authentication, rendering, and release models.

The [cloud setup guide](https://github.com/bebraw/slideotter/blob/main/docs/GETTING_STARTED.md#current-limits) still identifies production workspace authentication, real queued generation and export, and Durable Object serialization as incomplete.
The Electron path likewise still needs production packaging work.
Technical breadth should not be confused with a finished delivery path.

### Architecture kept learning behind implementation

The repository contains 457 commit subjects beginning with terms such as `split`, `extract`, `move`, `reduce`, or `refactor`.
On 17 June alone, 48 commits had that structural form.
At the reviewed head, application services and workbenches still include several modules above one thousand lines.

The later extraction work improved navigability and produced explicit client, server, rendering, storage, and workflow boundaries.
It also shows that feature throughput repeatedly ran ahead of ownership design.
Static health scores helped direct cleanup, but they could not decide which product surfaces should exist.

### The harness became a substantial product of its own

Slideotter has focused checks for many artifact and workflow properties.
That makes ambitious refactoring safer.
It also creates a large maintenance surface of fixtures, baselines, validators, build paths, and project instructions.

This is a development-system waterbed effect.
Moving uncertainty out of generated code and into deterministic checks improves control, but the checking system itself must remain understandable and proportional to the product evidence it protects.
Without real usage, it is possible to make the harness increasingly precise around the wrong workflow.

## What transferred to Kirjolab

Slideotter preceded Kirjolab and changed how I approached it.
Several useful practices transferred directly or conceptually:

- establish canonical artifacts and explicit write boundaries;
- keep model output reviewable until a human applies it;
- validate rendered or operational behavior, not only code;
- preserve architecture decisions and current project state in the repository;
- use small semantic commits so rapid work remains inspectable; and
- add structural feedback when tests alone cannot constrain code shape.

The warning transferred too.
Kirjolab began with a stronger development harness, but it repeated the tendency to broaden capability faster than the architecture consolidated.
Slideotter helped make the later refactoring possible; it did not by itself prevent the need for it.

## What I would do differently

1. **Choose one delivery target first.** I would make the local browser studio the only initial runtime and defer desktop and cloud paths until repeated use justified them.
2. **Close one authoring loop.** A brief, an approved outline, a small supported slide set, explicit candidate review, and a validated PDF would define the first product.
3. **Use real decks as the roadmap.** New layout families, retrieval methods, and editing modes would follow observed failures across several presentations.
4. **Budget architecture as the system grows.** Module size, fan-in, churn concentration, and cross-workflow dependencies would be reviewed alongside artifact quality.
5. **Measure product success separately.** Time to a usable deck, corrections per slide, regeneration rate, and repeated use would complement repository and validation metrics.
6. **Prune the harness around the chosen loop.** A smaller set of high-value checks would reduce maintenance cost while the product hypothesis remained uncertain.

## What Slideotter teaches

Slideotter demonstrates that rapid implementation can be a powerful learning method.
It discovered useful rendering, review, validation, and agent-control patterns that would have been difficult to design in the abstract.

It also shows the limit of learning through code production alone.
A repository can become technically sophisticated faster than its product can become necessary.
Validation can protect a workflow, but only usage can establish whether that workflow deserves the surrounding system.

The central lesson is to separate two kinds of progress.
Slideotter made substantial progress in understanding how an agent-assisted presentation workbench could be built.
It made less progress in proving the smallest version that should be built and operated.
