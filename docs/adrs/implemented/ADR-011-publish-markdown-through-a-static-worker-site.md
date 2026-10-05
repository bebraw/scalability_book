# ADR-011: Publish Markdown through a static Worker site

**Status:** Implemented

**Date:** 2026-10-05

**Recorded retrospectively:** Initial implementation on 2026-05-02.

## Context

The book needs version-controlled source, a navigable public edition, and local authoring without a deployed content-editing service.
The initial website commits established a build-time publishing pipeline; subsequent application features added authenticated APIs to the same site.

## Decision

Keep book and course content in repository Markdown and generate static pages with the Node build scripts.
Use HTMLisp templates under `site/` and `site.config.jsonc` to select published chapters, ordered parts, appendices, and case studies.
Keep omitted chapters out of production while allowing configured drafts in local development.

Deploy the generated `build/` assets through a Cloudflare Worker.
The Worker composes static delivery with application APIs; page rendering does not require a database-backed CMS.
Prepare the asset manifest as part of the Worker build.
Keep content editing and editor assets in the explicitly editable local mode.
Authenticated feedback, exercises, and course records have their own state rather than writing published chapter source.

Package source labs under `labs/` as build-generated downloadable archives, with their run instructions and evidence limits.
Exclude transient dependency and test-output directories from these downloads rather than commit generated ZIPs.

## Trigger

The May website setup introduced Markdown rendering, then HTMLisp templates and Worker deployment in separate commits.

## Consequences

**Positive:**

- Content changes, layout, and publication configuration are reviewable together in Git.
- Reading can use prebuilt assets while authenticated features remain available on the same origin.

**Negative:**

- Publishing a content change requires rebuilding and deploying the site.
- The build and publication lists need maintenance as new surfaces are added.

**Neutral:**

- Local editing and deployed application writes are different capabilities.

## Alternatives considered

### Runtime CMS rendering

A CMS would introduce a separate content authority and serving dependency for the main reading material.
The implemented build-time approach keeps repository content authoritative.

### Static hosting without an application Worker

This can serve the book but would require a separate composition for authenticated application APIs.

## Implementation and verification

[build-site.ts](../../../scripts/build-site.ts), [HTMLisp rendering](../../../scripts/lib/htmlisp.ts), [site templates](../../../site/layouts/), [publication configuration](../../../site.config.jsonc), [manifest generation](../../../scripts/generate-worker-manifest.ts), and [the Worker](../../../worker/index.ts) implement the pipeline.
Use the build and validation checks in [development.md](../../development.md), plus affected rendering tests when changing it.
[ZIP packaging](../../../scripts/lib/zip.ts) and [its tests](../../../tests/zip.test.ts) cover the downloadable-lab boundary.

## Historical evidence

- [2026-05-02: set up the book website](https://github.com/bebraw/scalability_book/commit/bc417609c7fb9d8a6bb5afcf14e462f70fd98177).
- [2026-05-02: use HTMLisp templates](https://github.com/bebraw/scalability_book/commit/226b871483b4671594feda1bc9dcd7e531950302).
- [2026-05-02: add Worker deployment](https://github.com/bebraw/scalability_book/commit/42778d93f7381b1876890b0f3ce3c0e4dd4a856e).
- [2026-05-14: exclude editor assets from production](https://github.com/bebraw/scalability_book/commit/8f2d12f10e0f3378576081dbe17d3289e3b8d9f1).
- [2026-08-28: package reproducible source labs](https://github.com/bebraw/scalability_book/commit/1abffba768038d5a503f34bb818088399a88b279).
