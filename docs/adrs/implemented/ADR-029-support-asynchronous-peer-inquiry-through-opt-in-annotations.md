# ADR-029: Support asynchronous peer inquiry through opt-in annotations

**Status:** Implemented

**Date:** 2026-10-06

## Context

Paragraph feedback already provides precise anchors for student observations, teacher replies and curated public Reader notes.
Ordinary students cannot see each other's raw feedback, and only moderators can reply.
The existing system is therefore a foundation for communal learning, not an implemented peer-discussion service.

Students also undertake group project work and shared engineering sessions with operator, challenger and validator responsibilities.
The user expects groups to organize their own in-person or virtual meetings and wants optional asynchronous support connected to the book.
Peer discussion should follow students' own initial work so that comparison can lead to reflection.

## Decision

Add intentionally shared, passage-anchored inquiry threads across the whole published book.
Use replies to support questions, competing explanations, observations, evidence checks and unresolved disagreements.
Connect a thread to relevant concepts, explorations, demo inputs/results or project evidence without treating a shared explanation as canonical book content.

Keep four distinct audiences:

- **Private notebook:** the student's working notes and reflections, owned by the local companion under [ADR-028](ADR-028-use-a-private-reflection-notebook-to-support-course-learning.md).
- **Group:** a contribution explicitly shared with the identified course/phase group and authorized course staff.
- **Course cohort:** a contribution explicitly shared with authorized participants in the identified course run and its staff.
- **Public book:** an outcome deliberately prepared for editorial review and curated through the existing Reader-note/book-improvement workflow.

Each widening of the audience is a separate student sharing action.
Sharing a note or summary does not expose the source notebook, raw conversation or other private entries.
Private reflections, peer assessments and existing feedback do not become shared through migration or a new default.
Retain the private feedback rules in [ADR-013](../implemented/ADR-013-keep-reader-feedback-private-and-sync-moderation-explicitly.md).
For new shared-learning threads, public curation requires a contribution intentionally offered for that audience and the existing editorial review; joining a course or posting to a group is not permission for public publication.
Existing private-feedback featuring retains its present moderation contract.

### Own work before peer discussion

For a guided question, the student first saves their own prediction, explanation or concrete statement of where they are stuck.
Then reveal the relevant peer discussion and invite comparison, investigation and a revised personal reflection.
Preserve the initial attempt alongside subsequent thinking rather than overwriting it with the group's conclusion.
Completing this step does not require a correct answer, polished writing or agreement with the agent.

The site and agent must follow the same sequence: an agent must not receive or summarize the gated peer contributions before the student's initial step.
The peer-reveal contract must preserve the private initial text unless the student chooses to share it.
This is pedagogical pacing, not a new graded exercise or a claim that public authored resources are secret.
Existing public Reader notes and authored worked reasoning remain governed by their present contracts.

### Group inquiry and individual reflection

Support asynchronous threads, links to investigations and a compact shared record of the question, initial predictions/disagreement, check, result, decision and remaining uncertainty.
Offer optional meeting/session prompts that fit the existing operator/challenger/validator practice.
Groups organize their own meetings; using these collaboration features is not a new attendance, scheduling or reporting requirement.
The existing required engineering session remains governed by the common project specification.

Students may use an operator's agent during a meeting or bring selected findings from their own agents.
Do not require shared personal accounts or make simultaneous agents/live shared demo control a condition of participation.
Preserve who contributed and which observations or suggestions came from a tool.
Agents can suggest questions, comparisons, tests and source-linked summaries; students review shared contributions before posting.
A summary must retain consequential disagreements and uncertainty rather than invent consensus or speak for absent classmates.

Let each student link the shared discussion into a private reflection about what changed or became better supported in their own reasoning.
A group decision does not set every member's concept self-assessment.
For solo participants, personal inquiry and the existing independent human review route remain usable without group threads.

### Entry points, state owners and authorization

Enter from the relevant passage/activity and provide a way to return to its source context from a thread or notebook link.
Retain source identity, quoted/contextual text and available revision information so book edits can be recognized without silently moving a discussion onto a different claim.

The website application API owns durable shared records, audience changes, replies and authorization.
Published course/phase allocations establish group membership; course-run identity establishes cohort scope.
Enforce read and write permissions in the API and share domain validation between local and deployed adapters.
Scope records explicitly by course, phase/group where relevant, and source/activity.
Recheck authorization when retrieving records or changing their audience; a local notebook link or companion session does not grant course access.

Use the existing course identity and membership authority for new shared-learning records.
Feedback GitHub identity is a separate contract: do not infer a course account link from matching names or silently merge historical feedback into shared threads.
A later connection between those identities requires an explicit ownership-verification contract.
Specify how membership changes, withdrawal and historical phase allocations affect access before enabling shared records; do not let a corrected allocation silently widen the audience of earlier private group work.
Storage technology and concurrency/version details remain implementation choices, with observable conflict handling required for shared edits.

## Trigger

The user asked to support group work, identified existing paragraph observations as a communal-learning opportunity, chose asynchronous support and accepted peer discussion after independent work.
The user also accepted whole-book coverage for the first implementation.

## Consequences

**Positive:**

- Students can compare interpretations beside the passage and evidence that prompted them.
- Individual thinking, group inquiry and selected book improvements can connect without exposing the entire private notebook.
- Optional async support accommodates groups' existing ways of organizing meetings.

**Negative:**

- Peer replies introduce moderation, audience and identity responsibilities beyond today's private feedback.
- Book edits and group membership changes require explicit handling of historical context and access.
- Shared summaries can lose disagreement or provenance unless students review them.

**Neutral:**

- Existing feedback, private peer reports, grading and group-session requirements remain under their current contracts.
- Public curation is editorial work; neither annotation volume nor group agreement proves learning or makes a claim authoritative.
- Live collaboration, scheduling and new meeting software are not first-release requirements.

## Alternatives considered

### Make existing student feedback visible to everyone

This would change the audience of previously private observations and would not provide deliberate group/cohort scopes.
Add new explicit sharing rather than reinterpret existing records.

### Build a separate group chat or mandatory meeting platform

This separates discussion from reading context and duplicates students' self-organized meeting tools.
Passage threads and optional session support meet the agreed asynchronous direction.

### Show peer discussion before any individual attempt

The agreed learning sequence preserves a student's initial explanation before comparison, making subsequent reflection possible.
Provide a brief path for recording uncertainty so this step does not become a barrier to help.

### Publish automatic agent summaries as group conclusions

An agent cannot establish everyone's agreement or personal learning.
Student review and contribution provenance preserve ownership of shared conclusions.

## Implementation and verification

Peer inquiry is implemented in [7de6ed0](https://github.com/bebraw/scalability_book/commit/7de6ed0d0d55ed5cbb5d8dc50c22a8b5b4ae7d21).
[The workspace contract](../../learning-workspace.md#peer-inquiry-contract) owns scope, audience snapshots/current allocations, private attempt declarations, revision guards, moderation and consented public editorial offers.
[The course operating guide](../../course-system.md#optional-peer-inquiry) owns identity, storage and migration rollout; [feedback setup](../../feedback-setup.md) preserves existing feedback visibility.
[The common project specification](../../../specifications/00_common_project.md#shared-engineering-sessions) continues to own required group practice; the new tools add no assessment obligation.

Verification completed on 2026-10-06:

- Anchored thread discovery/replies across all published chapters and appendices, with concept/activity/demo evidence links preserved.
- Initial private work before relevant peer content reaches either the interface or the agent, including resumed sessions and a student who records uncertainty.
- Explicit group/cohort/public sharing, accepted summaries, private source preservation and editorial curation.
- Server-side isolation across students, groups, phases and course runs, including forged identifiers, membership changes, withdrawal and historical access.
- Private feedback and confidential portfolio/peer records retaining their existing audience.
- Concurrent replies/edits, source revisions and an understandable path from shared inquiry into individual reflection.

Synthetic access checks passed in the 141-test unit suite, including paginated source isolation and an allocation change racing an inquiry write.
Chromium/WebKit journeys used two separate student notebooks: private initial work, a scoped question/reply, individual reflection, own-text public consent and staff editorial export.
The existing course sign-in, grouping, withdrawal and submission browser journeys passed.
Real local D1/R2 checks covered attempt-first disclosure, source-filtered reads, stale replies and exclusion from ordinary course responses; migration `0004_learning_inquiry.sql` and Worker dry-run passed.
Production peer availability still requires provisioned course storage, applied migrations and enabled course authentication under the existing rollout contract.
No real student records were used.
Evaluate individual and group learning, course progress and workload through [ADR-028](ADR-028-use-a-private-reflection-notebook-to-support-course-learning.md), including whether a peer contribution helps students revise or support their own explanations.
Do not evaluate success solely by thread or comment counts.

## Resolved implementation choices and follow-up

The reveal declaration retains a timestamp and local-note revision fingerprint, scoped by course, source path/anchor and reading/prediction/evidence/session activity; initial text stays local.
Shared records use existing course SQLite/D1 persistence with version conflicts and an atomic course allocation guard.
Group reads require original and current membership; former members/withdrawn students retain only their own contributions and may remove their text.
Authors can edit/remove, staff can moderate/close, and wider sharing creates a new reviewed contribution.
There are no automatic notifications in this release.

Learner evaluation and possible notification support remain future work.

## References

- [ADR-013: Private reader feedback](../implemented/ADR-013-keep-reader-feedback-private-and-sync-moderation-explicitly.md).
- [Current feedback visibility and moderation](../../feedback-setup.md).
- [Current course membership and private records](../../course-system.md).
- [Existing shared engineering sessions](../../../specifications/00_common_project.md#shared-engineering-sessions).
- [Current individual/group reflection rubric](../../../specifications/grading.md#self--and-peer-assessment-12-points-per-phase).
- [ADR-026: Approved solo route](../implemented/ADR-026-support-an-approved-solo-course-route.md).
- [Morales et al.: Social annotation across undergraduate courses](https://doi.org/10.12688/f1000research.109525.2).
  This observational case study found negotiation, disagreement and support concentrated in peer replies; it motivates threaded inquiry but does not prove causal learning gains for this course.
- [Zhu et al.: Participation roles in social annotation](https://doi.org/10.1016/j.iheduc.2023.100919).
  The classroom pilot supports investigating guided participation; the course's existing engineering roles remain its own contract.
