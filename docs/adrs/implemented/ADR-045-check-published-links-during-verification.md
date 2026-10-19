# ADR-045: Check published links during verification

**Status:** Implemented

**Date:** 2026-10-19

## Context

The book audit found public links to repository resources that returned `404` while the repository was private.
Making it public resolved that failure, but manual checks alone would not catch new missing targets or later link rot.
Published HTML is the shared boundary for authored Markdown, generated references, navigation and downloads.

## Decision

Inspect the candidate build's HTML links through one repository-owned checker.
Fail on missing local files or anchors and external `404`/`410` responses from anonymous GET requests following redirects.
Report other unsuccessful external responses and network failures as inconclusive, preserving their referring pages for review.
Do not treat a bot block as proof of a broken link or claim that an inconclusive destination was verified.

Include local inspection in validation and the full check before explicit deployment.
Run the full check in CI for pushes, pull requests, manual requests and weekly external-link review.
Keep generated reports under `.local/` and retain them as CI artifacts.

## Trigger

The author requested committing and publishing the reviewed corrections and adding a recurring 404 check to the development process.

## Consequences

- Generated local targets are checked before publication without depending on the older live site.
- External checks add network time; bounded retries and concurrency limit that cost.
- Inconclusive responses still require inspection, and HTTP success does not establish semantic correctness or detect every soft 404.
- The explicit deployment command enforces the check; independent hosting automation must use the same command or enforce required CI checks to prevent deployment on a failed check.

## Alternatives considered

Source-only checks miss generated links and packaged downloads.
Checking only the live site misses candidate changes until after publication.
Failing on every external error would conflate link removal with publisher bot protection or temporary network failures.

## Implementation and verification

[The CLI](../../../scripts/check-links.ts) composes [build inspection and anonymous HTTP checks](../../../scripts/lib/link-check.ts).
[Tests](../../../tests/link-check.test.ts) cover missing pages and anchors, encoded and relative targets, downloads, an empty build, external deduplication, missing-page status classification and bounded transient retries.
[The workflow](../../../.github/workflows/links.yml) builds the candidate revision and retains the report even on a failed check.
[The development guide](../../development.md#published-link-checks) owns commands, cadence and review limits.
Hosted workflow results and deployment verification are recorded against the pushed revision; repository configuration alone does not establish a completed hosted run.
