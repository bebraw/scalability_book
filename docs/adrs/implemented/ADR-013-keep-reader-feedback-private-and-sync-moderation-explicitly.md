# ADR-013: Keep reader feedback private and sync moderation explicitly

**Status:** Implemented

**Date:** 2026-10-05

**Recorded retrospectively:** Private feedback introduced on 2026-05-14; administration expanded in September.

## Context

Readers need to report confusion about a particular passage, and the author needs to review it while editing locally.
Making every comment public or letting local edits silently change remote records would create an unclear feedback and moderation workflow.

## Decision

Attach feedback to stable paragraph identities or chapter reflection prompts.
Use GitHub OAuth for feedback identity and Cloudflare KV for deployed comments; use a separate local feedback file when editing.
Ordinary readers see their own comments and replies, while designated moderators can review all feedback.
Only explicitly featured notes are published to anonymous readers.

Anonymous presentation in the teacher interface does not remove the retained underlying identity used for abuse handling.
Moderation supports replies, reasons, resolution, hiding, and curated public notes, with a separate all-chapter dashboard.
Keep server-side write checks and the implemented feedback rate limits; proposed hardening remains separate from implemented protection.

Pull feedback explicitly for local review.
Push only moderation fields and admin replies to matching remote records, preserving remote comment bodies and avoiding remote deletions.
Promoting a clarification into chapter source uses local editing, not a production content-write API.

## Trigger

The May history changed feedback to private visibility, added replies and featuring, and restricted writes.
September introduced the dashboard and archiving of resolved feedback.

## Consequences

**Positive:**

- Readers can ask privately while useful clarifications can be curated for everyone.
- Local editorial work has an explicit boundary from production moderation writes.

**Negative:**

- Moderators must review and deliberately feature material before it becomes public.
- Local and remote moderation state require explicit synchronization.

**Neutral:**

- Feedback identity and permissions are separate from course staff authorization and future student magic links.

## Alternatives considered

### Publish every reader comment

The private workflow limits exposure of individual questions while retaining a curated public channel.

### Automatically synchronize all local feedback fields

The implemented moderation-only push avoids overwriting original reader text or treating local absence as remote deletion.

## Implementation and verification

[Feedback setup](../../feedback-setup.md), [Worker handlers](../../../worker/index.ts), [comment synchronization](../../../scripts/sync-comments.ts), and [the feedback interface](../../../site/scripts/comments.ts) implement these rules.
[Reader-feedback](../../../tests/e2e/feedback.spec.ts) and [admin-feedback](../../../tests/e2e/feedback-admin.spec.ts) tests exercise visibility and moderation.
The [bot-hardening document](../../feedback-bot-hardening.md) contains further proposals and is not proof that every proposed measure exists.

## Historical evidence

- [2026-05-14: make feedback private](https://github.com/bebraw/scalability_book/commit/6ae770a602bced612b24b5de483506ceefd7b9f8).
- [2026-05-14: add replies and featured notes](https://github.com/bebraw/scalability_book/commit/4457e69137a0601088764f454c306d8e95eb54dd).
- [2026-05-14: rate-limit feedback writes](https://github.com/bebraw/scalability_book/commit/f6e0e4c214f276914240f3aa0cf534be5ffb4725).
- [2026-09-01: add the administration dashboard](https://github.com/bebraw/scalability_book/commit/d5412bb774cc693d71d2fd770355050acee20d55).
- [2026-09-02: archive resolved feedback](https://github.com/bebraw/scalability_book/commit/50fc045bf6c7af4322a40310b345b52af64e44dd).
