# Elements of Scalable Web Development

_Architecture, measurement, scaling pressure, and agentic workflows_

This is the course book for the [Designing and Building Scalable Web Applications](https://fitech101.aalto.fi/en/courses/designing-and-building-scalable-web-applications) course held at Aalto University.
The new course book is hosted at [scalableweb.dev](https://scalableweb.dev/).

## Website

Markdown source files live under [book/](book/).
The public website is generated from those chapters and deployed at [scalableweb.dev](https://scalableweb.dev/).
The interactive site targets Chrome/Edge 111+, Firefox 121+, and Safari/iOS Safari 16.4+; use an up-to-date browser.
See [browser support and verification](docs/development.md#browser-support) for the build contract and test limits.

Development, preview, feedback, and deployment notes are in [docs/development.md](docs/development.md).
The [documentation index](docs/README.md) points to course operations, learning tools, pilot preparation and remaining reviews.
The [architecture map](ARCHITECTURE.md) describes the current system, and [Architecture Decision Records](docs/adrs/README.md) distinguish implemented decisions from the agreed course administration revision.

## Reviewing changes

Run `npm run review` to open a readable HTML diff of the working copy against `HEAD`.
The report puts book content first and highlights changed words, with staged-only and revision-to-revision comparisons available.
See [the review guide](docs/reviewing-changes.md) for options and requirements.

## PDF edition

Run `npm run pdf` to build the site and create an iPad-friendly reading edition at `output/pdf/elements-of-scalable-web-development.pdf`.
The PDF includes the main chapters, appendices, case studies, and course project guide; interactive labs link back to the web edition.

## Feedback comments

The deployed site supports paragraph-level feedback.
Setup details are in [docs/feedback-setup.md](docs/feedback-setup.md), and the local review workflow is documented in [docs/development.md](docs/development.md).
