# ADR-065: Back up book data to private R2

**Status:** Implemented

**Date:** 2026-11-19

## Context

Git retains published book source.
D1 Time Travel covers recent exercise database recovery.
Reader feedback, resolution metadata, the private course reference, and the owner's local records need recoverable copies.
Production course submissions are not yet configured.

## Decision

Take read-only snapshots of the active feedback KV and exercise D1 stores.
Back up the book and private reference Git repositories, retained audit materials, default local databases and attachment stores, and the owner's default companion records.
Verify each snapshot before publishing it.

Store snapshots on the owner's encrypted computer and in a private EU R2 bucket.
Use the [Thesis Journey Tracker pattern](https://github.com/bebraw/thesis-journey-tracker/blob/main/docs/backups.md) of dated objects, a manifest written last, and a prefix-scoped 90-day lifecycle rule.
The local scheduler can reach both production and local-only sources.
Run hosted backups daily and full backups weekly.

## Trade-offs

A Worker cron can run independently of the owner's computer and reach the hosted stores.
A local task also backs up private source, records and attachments that are available only on that computer, with timing dependent on macOS and the owner's Wrangler session.
The local copies remain available if Cloudflare account access is lost.

## Implementation and verification

[The backup command](../../../scripts/backup-book.ts) verifies SQLite, Git bundles, feedback records, archive readability and R2 object checksums.
[The runbook](../../backups.md) owns provisioning, operation and isolated recovery.
