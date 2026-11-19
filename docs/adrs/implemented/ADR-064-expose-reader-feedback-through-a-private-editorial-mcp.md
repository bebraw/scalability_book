# ADR-064: Expose reader feedback through a private editorial MCP

**Status:** Implemented

**Date:** 2026-11-19

## Context

The book owner wants to discuss and address individual reader issues with Codex.
The browser dashboard already supports review and moderation.
[ADR-013](ADR-013-keep-reader-feedback-private-and-sync-moderation-explicitly.md) limits feedback visibility, and [ADR-042](ADR-042-expose-public-learning-material-through-stateless-mcp.md) defines public MCP retrieval from published assets.

## Decision

Serve a dedicated editorial MCP from the existing Worker.
Authorize each request with a locally held bearer credential whose hash is registered to one GitHub login.
That login must remain in the feedback-admin allowlist.
Use the existing feedback store and keep the MCP disabled until the credential is configured.

Return bounded lists and individual threads with an allowlist of fields that excludes stored account identities.
Grant the owner credential resolution ability only when explicitly enabled.
Store new resolutions on per-issue keys in the existing feedback namespace and have the dashboard, MCP and synchronization commands read those keys alongside historical resolution fields.
This lets new comments, replies and distinct resolutions proceed without competing for a chapter write.
Retain the dashboard's reply, hide and publication controls.

## Trade-offs

A dedicated, revocable credential fits one owner's local client and carries feedback reading and optional resolution authority.
An OAuth server would let moderators sign in and grant clients access individually, with additional credential issuance and lifecycle to operate.
An MCP over the local export would avoid a remote credential and would rely on the owner refreshing the export before review.
Per-issue resolution keys add reads to the feedback workflow and retain Workers KV's eventual consistency across locations.

## Implementation and verification

[The Worker adapter](../../../worker/feedback-mcp.ts) and [routing](../../../worker/index.ts) implement the endpoint.
[Protocol tests](../../../tests/feedback-mcp.test.ts) exercise authorization and redacted retrieval with synthetic records.
[Feedback setup](../../feedback-setup.md#private-feedback-mcp) owns the operating instructions.
