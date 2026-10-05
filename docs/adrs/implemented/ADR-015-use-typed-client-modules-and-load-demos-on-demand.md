# ADR-015: Use typed client modules and load demos on demand

**Status:** Implemented

**Date:** 2026-10-05

**Recorded retrospectively:** TypeScript adoption on 2026-05-14; demand loading introduced on 2026-07-01.

## Context

Interactive teaching material expanded the amount of browser code and its DOM contracts.
Loading every experiment on every reading page would increase the reading path's cost and expose unrelated compatibility failures.

## Decision

Keep browser features in TypeScript modules, compiled into site assets.
Use the strict TypeScript configuration and `types:check` as the normal code verification path, including it in site validation.
The migration also moved Node scripts to TypeScript, retaining the existing npm and Node execution model.

Load demo code for the rendered material on demand rather than eagerly initialize the whole demo collection.
Use a shared demo catalog for gallery and chapter composition and keep topic-specific behavior in its own modules.
Preserve feature detection, compatibility handling, static explanations, and readable fallback states.
Shared frames and controls follow the demo style guide, while diagrams can use layouts appropriate to the lesson.

Automated interaction, accessibility, and browser compatibility checks provide evidence beyond successful compilation.
Current `@ts-nocheck` exemptions in some build/export scripts limit coverage; this record does not claim every TypeScript file is fully checked.

## Trigger

The May commits ported browser and Node scripts and added strict checks.
July introduced demand loading and browser compatibility guards as demos grew.

## Consequences

**Positive:**

- Shared types expose many contract errors before deployment.
- Reading pages initialize only the relevant interactive material.

**Negative:**

- Compilation does not establish correct DOM behavior or cross-browser support.
- Lazy initialization and fallback handling introduce additional interaction states to verify.

**Neutral:**

- Existing compiler exemptions are visible limits, not an instruction to expand them.

## Alternatives considered

### Keep untyped browser scripts

This would lose the static contract checks introduced by the migration.

### Eagerly load the entire demo collection

The implemented demand-loading path avoids initializing unrelated experiments during normal reading.

## Implementation and verification

[tsconfig.json](../../../tsconfig.json), [package commands](../../../package.json), [site build](../../../scripts/build-site.ts), [demo catalog](../../../shared/demo-catalog.ts), and [browser modules](../../../site/scripts/) implement the approach.
Use type checking and the affected browser tests, including [compatibility](../../../tests/e2e/browser-compatibility-demo.spec.ts), [gallery](../../../tests/e2e/demo-gallery.spec.ts), and [accessibility](../../../tests/e2e/accessibility-demo.spec.ts) where relevant.
[The style guide](../../demo-style-guide.md) owns current visual and wording conventions.

## Historical evidence

- [2026-05-14: port browser scripts](https://github.com/bebraw/scalability_book/commit/2182f8f9d39d1697b30d2743e8b9928f7014965b), [add strict checks](https://github.com/bebraw/scalability_book/commit/e28abc8dbce74f73bb010078eab21ddebf2b2513), and [port Node scripts](https://github.com/bebraw/scalability_book/commit/b703f296e7ccdc014cecfe87be38459da303217d).
- [2026-07-01: load demos on demand](https://github.com/bebraw/scalability_book/commit/a80fa2a3dfb896daf3d686d5ff3b407d3764db4a).
- [2026-07-02: add browser compatibility handling](https://github.com/bebraw/scalability_book/commit/e6540681e66263e6ea6ec55ffaa74f5eca9cf553).
