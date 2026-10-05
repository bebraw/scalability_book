# ADR-014: Isolate and atomically rebuild local previews

**Status:** Implemented

**Date:** 2026-10-05

**Recorded retrospectively:** Output isolation introduced on 2026-07-10; recovery and cleanup revised on 2026-10-01.

## Context

Local previews include draft chapters and editing controls, whereas production builds contain only the published edition.
Sharing output lets a production build remove routes from a running editor.
Rebuilding directly into the served directory can also expose incomplete output or leave broken state after interruption.

## Decision

Keep production output in `build/` and default development output under `.local/dev-build/<port>/site/`.
Separate output by port so multiple local previews can coexist.
Retain an explicit `BUILD_DIR` override with the same staging rules.

Build into the preview's `.next` directory, then swap it into place while retaining the previous successful build until the swap succeeds.
Recover the previous output after an interrupted swap and clean staging artifacts after success or failure.
A failed rebuild must not destroy the last successful served site.

Watch relevant source changes, hot-swap CSS, and reload pages after a completed output swap.
Keep generated preview cleanup separate from local feedback, exercise answers, course records, and uploads.
The editable server and development identities remain loopback-only local facilities.

## Trigger

July commits separated output and added automatic rebuilds.
October history records staging cleanup, interrupted-swap recovery, and avoiding unnecessary reloads from directory metadata events.

## Consequences

**Positive:**

- Draft preview routes survive unrelated production builds.
- Failed or interrupted rebuilds retain a usable preview and recover predictably.

**Negative:**

- Multiple previews and staging directories consume more temporary storage.
- Watchers and swap recovery need lifecycle tests beyond a successful build.

**Neutral:**

- Clearing generated preview output does not mean clearing local user records.

## Alternatives considered

### Reuse the production output directory

This is simpler but reproduces the route-loss problem that led to output isolation.

### Write every rebuild directly into the served directory

This cannot preserve the previous complete site when generation fails midway.

## Implementation and verification

[dev-build.ts](../../../scripts/lib/dev-build.ts), [the development server](../../../scripts/dev-site.ts), and [the development guide](../../development.md) implement the output lifecycle.
[Unit tests](../../../tests/dev-build.test.ts) cover paths, swaps, failure cleanup, and recovery; [routing](../../../tests/e2e/dev-routing.spec.ts), [watcher](../../../tests/e2e/dev-watcher.spec.ts), and [CSS reload](../../../tests/e2e/dev-hmr.spec.ts) checks cover the local experience.

## Historical evidence

- [2026-07-10: isolate development output](https://github.com/bebraw/scalability_book/commit/34aa32a20739cdece6ba74d9a3a5d985725db0ae).
- [2026-07-10: rebuild on source changes](https://github.com/bebraw/scalability_book/commit/236264fafe004a06da0ec6bc06abe9556204899b).
- [2026-10-01: group output by port and recover interrupted swaps](https://github.com/bebraw/scalability_book/commit/ba57ff796f78c3f4f39f4e7e032fc332f2e16555).
