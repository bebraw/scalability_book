# ADR-036: Open Notebook and Teaching assistant as independent panels

**Status:** Implemented

**Date:** 2026-10-07

## Context

[ADR-034](../implemented/ADR-034-separate-the-private-notebook-from-the-teaching-assistant.md) separates private writing from instructional discussion, with explicit reviewed handoffs and one shared companion connection.
Its initial presentation used two header entry points and a repeated experience chooser within one fixed panel.
The repeated chooser adds navigation without clarifying purpose, and the single panel prevents a student from writing alongside an assistant discussion.

## Decision

Use compact, captioned notebook and question-bubble icons in the book header as the entry points.
Remove the experience chooser from each panel; retain navigation for that panel's own sections and shared connection settings.

Make Notebook and Teaching assistant independently openable and closable.
On larger screens place the notebook at the upper right and a smaller assistant at the lower right, shortening the notebook when both are visible so their bounds do not overlap.
Use fixed overlays that preserve the book's widths and positions, with content scrolling separately from each panel's navigation.
Keep writing/questions prominent in the shortened panels: show the source, collapse quote previews and optional assistant conversation/help settings, and place notebook writing/save actions before kind/title details.
The assistant settings summary identifies the selected help mode, preserving student choice without repeating the full settings form on every opening.

On compact screens display one foreground panel while retaining both logical open states and unfinished work.
The header brings the other panel forward; closing the foreground panel reveals the other if still open.
Each launcher's expanded state reflects actual visibility, and closing from inside returns focus to that panel's launcher.

Keep one companion client, connection snapshot and tab-session coordinator.
Each pane owns its presentation callbacks, section, writing and selected context.
Checking notebook notes does not silently alter an assistant discussion; only an explicit discussion handoff supplies notebook context.
Record refreshes update shared note projections without replacing an unsent assistant message or its conversation UI.
Retain separate open states, sections and selections across chapter navigation and reload using additive version 1 tab-session fields.
Legacy records restore their previously open experience without a notebook, conversation or archive migration.

This refines ADR-034's presentation choice while preserving its privacy, ownership, provenance and reviewed handoffs.
Opening, closing or bringing a panel forward does not save a note or send a model request.

## Trigger

The instructor's UX review identified the in-panel chooser as redundant and requested simultaneous notebook/assistant use with the assistant near the lower right.

## Consequences

**Positive:**

- Students can keep their own thinking beside instructional discussion without navigating between purposes.
- Header controls directly identify and control the visible panels.
- Independent context prevents an unrelated notebook selection from changing an ongoing discussion.
- One connection still serves both experiences, and chapter navigation retains unfinished work.

**Negative:**

- Two visible panels leave less vertical space for each; their content must scroll independently.
- Fixed overlays can cover reading or demo controls when the right margin is insufficient.
- Compact screens still require switching the foreground panel, with retained visibility state explained in setup guidance.

**Neutral:**

- Provider, portable archive, companion API and course submission contracts remain unchanged.
- This is a browser presentation change compatible with companion 0.2.0; it does not require another package release.
- Automated checks establish behavior and accessibility, while learner evaluation owns claims about learning or completion.

## Alternatives considered

### Keep one panel and remove only the chooser

This removes redundant navigation with less state, but still prevents simultaneous writing and discussion.

### Allow both panels to float freely or overlap

This gives placement flexibility but adds dragging, position persistence and focus/overlap rules before their learning value is established.
Use predictable non-overlapping positions first.

### Give each panel a separate connection and data owner

This separates infrastructure alongside presentation but duplicates connection and record synchronization without changing either panel's authority.
Keep presentation independent and the existing companion boundary shared.

## Implementation and verification

Implemented and verified locally on 2026-10-07 with synthetic records.
[The workspace coordinator](../../../site/scripts/learning-workspace.ts), [scoped pane](../../../site/scripts/learning-pane.ts), [session contract](../../../site/scripts/learning-session.ts) and [styles](../../../site/styles/learning-workspace.css) own the change.
[The browser journeys and concurrent-panel regression](../../../tests/e2e/learning-workspace.spec.ts) cover independent closing, geometry, drafts, explicit context, chapter navigation, reload and compact-screen transitions.
All 26 combined workspace/onboarding/demo/peer checks pass in Chromium and WebKit, including accessibility of both visible panels and shared unavailable/expired-connection recovery.
[The session test](../../../tests/learning-session.test.ts) verifies legacy restoration, separate selections and retained independent open/section states.
Type checking, production build and validation of 77 published HTML files pass.
Visual review uses an isolated synthetic companion at 390×844, 568×320, 1920×1080 and 2560×1440, including dark theme and reachable header controls.
Production deployment and any learner findings require their own evidence.
[ADR-037](ADR-037-connect-to-the-local-companion-without-pairing-codes.md) subsequently changes connection bootstrap and the required companion version; these panel decisions do not depend on printed-code pairing.

## References

- [Current learning workspace contract](../../learning-workspace.md).
- [Architecture ownership](../../../ARCHITECTURE.md).
- [Student setup guidance](../../learning-companion-setup.md).
- [Voluntary learner evaluation](../../learning-workspace-evaluation.md).
