# ADR-056: Align browser support with site requirements

**Status:** Implemented

**Date:** 2026-10-23

## Context

The package advertised Safari and iOS Safari 13 while the course bundle targeted ES2022 and the learning bundle used `.at()` and `.replaceAll()`.
The existing compatibility test reproduced that mismatch.
Downleveling syntax alone would not resolve unguarded dialogs and `crypto.randomUUID()`, the lazy orchestration dependency's copy-array methods, or the site's untransformed `color-mix()`, dynamic viewport units and `:has()` styles.
No students or existing course runs depend on the old declaration.

## Decision

Set explicit browser floors: Chrome/Edge 111, Firefox 121, and Safari/iOS Safari 16.4.
Recommend current browser versions for course work.
The floor includes Firefox's `:has()` support and Safari's regular-expression lookbehind and CSS support used by the site and its dependencies.

Keep `package.json` as the version authority and derive all site-owned JavaScript build targets from its explicit `browserslist` minimum queries.
Reject moving queries rather than deriving a changing contract from market-share data.
Remove per-bundle ECMAScript overrides; eager and lazy bundles use the same target set.
Retain existing feature detection and static reading material.
The pinned self-study exporter continues to own its generated assets.

Use AST-based regression checks over emitted root and vendor JavaScript, including third-party lazy dependencies.
Reject selected newer syntax and built-ins with negative-control examples; do not mistake a finite denylist for complete compatibility proof.
Exercise course dialogs, learning panels and the orchestration dependency in current Chromium and WebKit.
Historical minimum browsers and Firefox are not part of that runtime test matrix.

## Trigger

The strict demo review exposed the old support claim as a remaining issue, and the instructor requested its resolution before the student pilot.

## Consequences

**Positive:**

- The declared floor covers the site's existing platform requirements.
- Course and lazy bundles cannot silently choose a different compilation target.
- Vendor output is included in compatibility regression checks.

**Negative:**

- Older browsers fall outside the interactive support contract.
- Static checks and current-engine journeys cannot certify every historical browser version or API.

**Neutral:**

- This changes browser support and build configuration, not student grading or model access.

## Alternatives considered

### Preserve Safari 13 with transforms and polyfills

That would require JavaScript, DOM and CSS compatibility work across the interface and its dependencies, without an existing learner requirement for those browsers.
Changing only the course bundle's target would leave real failures behind.

### Update the version declaration alone

That would remove the false promise but leave inconsistent build targets and a stale test that excluded lazy dependencies.
The implementation aligns the declaration, compilation and checks together.

## Implementation and verification

[The manifest](../../../package.json), [target adapter](../../../scripts/lib/browser-targets.ts) and [site builder](../../../scripts/build-site.ts) implement the shared targets.
[The target tests](../../../tests/browser-targets.test.ts) verify minimum-version mapping and rejection of moving queries.
[The bundle check](../../../tests/e2e/browser-compatibility-demo.spec.ts) checks emitted JavaScript and its own negative controls.
[Playwright configuration](../../../playwright.config.ts) includes course and orchestration journeys in the WebKit project alongside the existing account and learning journeys.
The [development guide](../../development.md#browser-support) owns the commands and remaining runtime-coverage limits.

The original compatibility failure is retained under ignored `.local/reviews/browser-support-2026-10-23/`.
The build, types, HTML/local-link validation, two target tests and 44 distinct focused Chromium/WebKit checks pass.
The first browser batch also exposed a stale geometry-test selector for the retired scaling widget; the retained failure and passing focused rerun document its correction to the saturation demo.
The same directory records the verification results; no historical-browser or production-deployment claim follows from implementation status alone.

## References

- [Vite build targets](https://vite.dev/config/build-options#build-target).
- [Safari 16.4 platform additions](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/).
- [Firefox 121 release notes](https://www.firefox.com/en-US/firefox/121.0/releasenotes/).
- [ADR-015: typed client modules and demand loading](ADR-015-use-typed-client-modules-and-load-demos-on-demand.md).
- [ADR-055: demo consolidation and the original compatibility finding](ADR-055-consolidate-local-practice-and-retire-low-value-demo-interactions.md).
