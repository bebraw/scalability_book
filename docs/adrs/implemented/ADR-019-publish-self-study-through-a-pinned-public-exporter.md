# ADR-019: Publish self-study through a pinned public exporter

**Status:** Implemented

**Date:** 2026-10-05

**Recorded retrospectively:** Self-study pilot introduced on 2026-09-17.

## Context

The course has book chapters and live teaching material, but independent study needs concise learning modules without classroom logistics or private speaker notes.
A Lecture Studio exporter exists; hosting its authoring server would introduce an unnecessary live service for readers.

## Decision

Maintain versioned public module sources under `study/pilot/`, adapted from the corresponding chapter and lecture.
Integrate their export into the normal book build and serve the public bundle at `/learn/pilot/`.
Pin the exporter to a full upstream Git revision and install its locked dependencies with install scripts disabled.
Cache that toolchain locally; upgrade the pin deliberately and review the complete resulting bundle.
Only public generated output is copied to the site, not the Studio server or source decks.

Exclude classroom logistics and private speaker notes from publication.
Keep stable module/slide IDs, public formative explanations, and no invented correct answer for reflection prompts.
Pilot progress and demo state remain in the learner's browser, keyed to module revision.
This is distinct from authenticated chapter-answer storage and course assessment.

Use the exporter's sandboxed demo and content-security boundaries plus shared response headers in local and deployed serving.
Keep posters when JavaScript is unavailable or a demo fails, and serve the bundle over HTTP.
Deploy a complete export rather than mixing chunks from separate revisions.

## Trigger

The September pilot added pinned build-time export, public learning modules, demos, and checks for navigation and private-content exclusion.

## Consequences

**Positive:**

- Readers use self-study without an authoring server, audience service, or required login.
- A pinned exporter makes upgrades explicit and reviewable.

**Negative:**

- The first export needs access to upstream Git and npm; the cached toolchain adds local state.
- Public module adaptations must be maintained alongside changes to their teaching source.

**Neutral:**

- Public formative answers are intentional; private notes and classroom logistics are not.

## Alternatives considered

### Host Lecture Studio as a runtime dependency

The implemented public bundle does not require the authoring service to be available during reading.

### Fetch the latest exporter for every build

A moving dependency would change export behavior without a deliberate source-pin review.

## Implementation and verification

[Study build adapter](../../../scripts/lib/study-build.ts), [exporter pin](../../../study/exporter.json), [study headers](../../../shared/study-headers.ts), and [study documentation](../../../study/README.md) implement the boundary.
[Header tests](../../../tests/study-headers.test.ts) and [self-study browser tests](../../../tests/e2e/self-study.spec.ts) cover serving, navigation, static fallbacks, and export content.
The study README owns setup details and current upstream limitations.

## Historical evidence

- [2026-09-17: add the exported self-study pilot](https://github.com/bebraw/scalability_book/commit/05b1e75fdaf5019c260e47769d064cdf46eddec1).
- [2026-09-17: expand modules alongside chapter exercises](https://github.com/bebraw/scalability_book/commit/7abb5beb7922f9e23c27c9e8c3e9ef38836a4816).
