# ADR-025: Fingerprint published site CSS and JavaScript

**Status:** Implemented

**Date:** 2026-10-06

## Context

The static build published most CSS and JavaScript under stable filenames while the Worker gave them a one-year `immutable` browser cache lifetime.
A deployment could change the bytes without changing the URL, leaving returning readers with stale styling or scripts.
Course assets already revalidated, but the wider site did not.
The build also emits a feature-detecting loader that requests the orchestration vendor bundle after page load, and local previews hot-swap CSS at stable URLs.

## Decision

Publish compiled site CSS and JavaScript with a content hash in the filename.
Use the first 16 hexadecimal characters of SHA-256 over the emitted bytes, and resolve base-layout and page-specific URLs through a build-owned registry.
Compile the orchestration dependency first and inject its published URL into the loader before fingerprinting the loader, so a dependency change also changes the loader URL.
Give fingerprinted CSS/JS a one-year immutable browser cache lifetime.
Revalidate HTML and stable CSS/JS URLs using ETags, including conditional 304 responses, so a visit discovers the current published filenames.

Retain stable copies for earlier HTML and direct asset links, with revalidation headers.
Editable builds keep stable filenames for CSS hot reload.
The pinned self-study exporter continues to own its asset names and internal references under `/learn/pilot/`; its existing revalidation policy applies.

## Trigger

The user identified the missing cache busting and preferred filename-based versioning.
A Worker regression test reproduced immutable caching on `/theme.js` despite that URL identifying mutable bytes.

## Consequences

**Positive:**

- Changed bytes select a new browser cache entry without discarding cached unchanged assets.
- Published pages, page-specific assets and the lazy orchestration bundle share the same URL resolution boundary.
- Editable CSS hot reload retains its existing URL contract.

**Negative:**

- Stable compatibility copies duplicate the compiled asset bytes in the deployment.
- Every HTML visit performs revalidation, although unchanged pages can return 304.
- A deployment contains the current fingerprints rather than an archive of prior versions; an already open page may require a reload if it later requests a removed lazy bundle.

**Neutral:**

- Already cached stable assets retain their previous browser headers until expiration or eviction; current HTML avoids those cache entries by selecting fingerprinted URLs.
- This decision changes the compiled site's CSS/JS contract, while the existing image, font and self-study policies retain their owners.

## Alternatives considered

### Revalidate every CSS/JS request at stable URLs

This fixes correctness for newly fetched responses but loses immutable browser caching for unchanged assets and does not escape existing year-long browser cache entries.

### Add a query-string release version

This can change cache keys, but a release-wide value invalidates unchanged assets too.
Content-derived filenames directly identify the emitted bytes and follow the user's preferred approach.

### Replace the whole site build with a Vite application build

Vite can fingerprint an application graph, but the repository composes many independent static pages and deliberately scoped scripts.
A registry around the existing compilers solves the publishing contract without replacing Markdown rendering or the pinned exporter.

## Implementation and verification

[The site build](../../../scripts/build-site.ts), [asset registry](../../../scripts/lib/site-assets.ts), [renderer](../../../scripts/lib/site-renderer.ts), [base layout](../../../site/layouts/BaseLayout.html), [orchestration loader](../../../site/scripts/orchestration-demo-loader.ts), and [Worker cache policy](../../../worker/index.ts) implement this decision.
[Asset tests](../../../tests/site-assets.test.ts) verify changed and unchanged bytes, nested paths, HTML URL resolution and editable filenames.
[Worker tests](../../../tests/site-asset-cache.test.ts) cover stable and fingerprinted URLs, validators, 304s, HTML revalidation and missing assets.

The production build and site validation pass; inspection found 45 correctly fingerprinted assets and 344 resolved CSS/JS references across 52 site pages, including the loader's fingerprinted dependency.
The self-study output remains owned by its pinned exporter.
All unit checks pass, along with four CSS hot-reload and orchestration browser checks.
A local production Worker preview verified immutable fingerprinted assets, revalidating stable aliases and self-study assets, and ETag conditional responses returning 304 with the correct cache policy.
Chromium loaded 14 fingerprinted assets, ran the lazy orchestration demo and switched themes without a page error.
Use [the CSS hot-reload checks](../../../tests/e2e/dev-hmr.spec.ts) and [orchestration interaction checks](../../../tests/e2e/orchestration-demo.spec.ts) when changing this boundary.
Implementation status describes repository behavior; production deployment remains a separate operation.

## References

- [Development and caching contract](../../development.md#asset-urls-and-caching).
- [ADR-011: Static Worker publishing](ADR-011-publish-markdown-through-a-static-worker-site.md).
- [ADR-014: Atomic editable previews](ADR-014-isolate-and-atomically-rebuild-local-previews.md).
- [ADR-015: Typed client modules and demand loading](ADR-015-use-typed-client-modules-and-load-demos-on-demand.md).
- [ADR-019: Pinned self-study exporter](ADR-019-publish-self-study-through-a-pinned-public-exporter.md).
- [Cloudflare static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/).
