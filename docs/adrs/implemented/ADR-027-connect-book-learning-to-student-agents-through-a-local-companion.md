# ADR-027: Connect book learning to student agents through a local companion

**Status:** Implemented

**Date:** 2026-10-06

The connection bootstrap requirements below are refined by [ADR-037](ADR-037-connect-to-the-local-companion-without-pairing-codes.md): the current implementation uses explicit code-free connection from a configured trusted website, while retaining authenticated sessions.
Historical release evidence here describes its original pairing flow.

## Context

The book already publishes concepts, reading locations, optional explorations, graphics and HTML demos for students' external agents.
Those resources cannot ensure that a particular client displays a demo, observes its live state, or maintains a conversation beside the passage being studied.
Students must currently move context between the book and their agent, which can make an investigation difficult to begin or resume.

The intended experience keeps discussion and experimentation within the book while students use their own model access.
Kirjolab provides a relevant precedent for connecting a browser interface to a locally running agent integration.
The reading material and authored resource exports must remain usable independently of the new connection.

## Decision

Add an optional learning interface within the book, connected to the student's agent through a local companion.
The website presents the current reading context, discussion and available learning actions.
The companion owns provider integration and local conversation continuity; it executes agent requests through the student's chosen client or provider.
The website does not receive provider credentials or execute a hosted student agent.
Selected conversation context may still be processed by a remote model provider; running the companion locally does not imply that model inference happens on the student's device.

Use one working provider adapter first, with a contract that permits further adapters without changing the notebook, book context or shared-learning domain.
Investigate reuse of the Kirjolab integration before duplicating its connection and provider work.
Keep provider-specific protocol details behind that adapter rather than embedding them throughout the website.

The first implementation covers the whole published book, including chapters and appendices, and connects the existing concept, exploration and demo catalogs.
Supporting case studies and course-task links remain reachable through their existing authored relationships.
Reading context, discussion and reflection must work across those surfaces; the initial release is not restricted to one pilot chapter.
Each demo exposes only operations supported and verified for that demo.
This scope does not require inventing new exercises or experiments for every paragraph.

### Entry points, state owners and contracts

- Enter from a passage, concept, exploration, demo or course question, preserving the relevant source links when navigating.
- The authored book and shared registries own definitions, relationships, activity instructions and demo assumptions.
- The browser owns the actual rendered demo state; expose versioned, validated observations and bounded actions through a common integration contract.
- The companion owns connection state, provider credentials, conversation persistence and the private notebook described in [ADR-028](ADR-028-use-a-private-reflection-notebook-to-support-course-learning.md).
- The website API owns shared records and course/group authorization described in [ADR-029](ADR-029-support-asynchronous-peer-inquiry-through-opt-in-annotations.md).

Shared context and action types must remain independent of provider clients and UI rendering.
The local and deployed website adapters must use the same shared rules for any application behavior they expose.
Before adding implementation modules, document their actual owners and dependencies in the architecture and operating documents.

Pair the browser and companion explicitly.
Limit the local connection to the configured website/development origins and authenticated companion sessions; binding to loopback alone does not establish browser authorization.
Send only the context needed for the student's investigation, including selected notebook entries or authorized shared contributions when requested.
The initial learning integration supports authored resources and bounded demo actions; arbitrary machine execution and generated application hosting require a separate decision.

### Student and agent interaction

Students choose the question, pace and form of help: a hint, explanation, example, challenge or experiment.
Guided activities invite an initial explanation or prediction, then observation, interpretation and reflection.
Present manageable steps and timely feedback rather than an unbounded introductory answer or a compulsory sequence of questions.
Allow students to ask for a direct explanation and then invite them to apply it.

The agent cites material actually retrieved, distinguishes authored claims from its inferences, and distinguishes plans or illustrative models from observed demo results.
Actual demo observations retain their inputs and relevant assumptions.
An illustrative book simulation does not become measured project evidence.
The agent may suggest a notebook entry or shared contribution; the student reviews and accepts it before publication or submission.
It does not certify understanding, grade work, or speak for another student.

## Trigger

The user chose a local proxy as the direction for making the book interactive with a student's own agent, accepted a supporting pedagogical role, and authorized recording the discussion as ADRs.
The user also accepted whole-book coverage for the first implementation.

## Consequences

**Positive:**

- Students can discuss and investigate material with its passage and actual demo state in view.
- Provider access remains under student control, while a common contract supports different adapters.
- Existing book navigation and resources support learning without requiring the companion.

**Negative:**

- Companion installation, pairing, provider availability and browser compatibility introduce setup work that must be measured.
- Demo adapters and provider conversation behavior require practical verification, not only prompt instructions.
- Local persistence and remote inference have different operational and privacy boundaries.

**Neutral:**

- This extends [ADR-017](../implemented/ADR-017-export-an-authored-concept-graph-for-reader-agents.md) and [ADR-018](../implemented/ADR-018-offer-optional-agent-explorations-with-separate-worked-reasoning.md); their public resource exports and ordinary external-client use remain supported.
- Provider selection, exact transport and module/file layout are implementation choices within these boundaries.

## Alternatives considered

### Continue with external-client instructions alone

This remains a useful fallback but cannot provide reliable live demo context, notebook continuity or discussion within the book across different clients.

### Host model credentials and agent execution on the website

This would make access, billing and execution an institutional service responsibility.
The agreed direction connects students' own agent access through a local companion.

### Build a separate learning application or require one provider throughout

A separate application duplicates navigation and separates questions from passages.
A provider-specific learning domain would couple private notes and shared inquiry to one client.
One initial adapter proves the connection while the domain contracts remain reusable.

## Implementation and verification

The paired companion and whole-book notebook entered in [ea45d67](https://github.com/bebraw/scalability_book/commit/ea45d6764e1087d532416737531f9ec1addcd3bf) and [f1c116b](https://github.com/bebraw/scalability_book/commit/f1c116b7c1f2df7d07c36ea9cde7cb6e89352706).
[7de6ed0](https://github.com/bebraw/scalability_book/commit/7de6ed0d0d55ed5cbb5d8dc50c22a8b5b4ae7d21) adds the Codex adapter, persisted conversation, bounded demo bridge and peer integration.
[The workspace contract](../../learning-workspace.md#agent-and-demo-contract), [student setup](../../learning-companion-setup.md) and [architecture](../../../ARCHITECTURE.md) describe current owners and recovery.

Verification completed on 2026-10-06:

- Passage/context navigation and resumable discussion across all published book chapters and appendices, with concept and exploration links retained.
- Every catalog demo's declared observations/actions against its actual controls, including rejected invalid actions and honest fallback for unavailable operations.
- The first adapter through real client use, connection interruption/reconnection, and operation without a model connection for reading and notebook work.
- Pairing and origin/session checks, credential boundaries and selected-context access.
- Observable agent behavior on representative investigations: initial student thinking, useful assistance, accurate source context and genuine observations.
- A voluntary setup, learning and course-progress evaluation protocol using [ADR-028](ADR-028-use-a-private-reflection-notebook-to-support-course-learning.md), with outcome evidence still to be collected.

The complete unit suite passed 141 tests; focused browser journeys passed in Chromium/WebKit.
The demo bridge exercised actual enabled controls and rejected forged control IDs in all 32 authored demos.
Codex CLI 0.154.0 passed a real observation → approved change → actual result → reviewed notebook draft journey and conversation resume.
Synthetic app-server checks cover denied machine approvals, initialization failure, disconnect and reconnect without exposing provider diagnostics.
Pairing and notebook checks use synthetic records and require no model; Worker dry-run, site build/validation and local D1/R2 checks also passed.

Whole-book coverage can be delivered through implementation increments and evaluated with a small set of learners.
A small evaluation group does not restrict the supported content to one chapter.

## Resolved implementation choices and follow-up

The first adapter uses Codex app-server over local stdio after reviewing the current protocol and Kirjolab's dedicated-profile/environment isolation.
Kirjolab's tool-free adapter disables the local tool host; interactive book callbacks require that host, so the provider integration stays behind a separate adapter.
Version-1 browser observations expose bounded DOM controls/text and authored assumptions; they do not claim canvas inspection or measured project performance.
Installation, updates, notebook recovery and provider-thread continuity are documented in the setup guide.

Further provider adapters and learner-outcome evidence remain future work; they do not block this first working adapter or expand its supported capabilities.

## References

- [Current architecture](../../../ARCHITECTURE.md).
- [Agent resource contract](../../agent-learning-resources.md).
- [Kirjolab repository](https://github.com/bebraw/kirjolab) and [its local Codex companion decision](https://github.com/bebraw/kirjolab/blob/main/docs/adrs/implemented/ADR-234-run-codex-through-the-local-companion.md).
- [Kestin et al.: structured AI tutoring in a university physics course](https://doi.org/10.1038/s41598-025-97652-6).
  The study supports investigating paced activities, targeted feedback and authored content; it does not establish whole-course completion or effectiveness in this course.
- [Bastani et al.: AI access and subsequent independent mathematics performance](https://doi.org/10.1073/pnas.2422633122).
  The results motivate checking independent learning rather than treating assisted task completion as sufficient evidence; their high-school mathematics setting differs from this course.
