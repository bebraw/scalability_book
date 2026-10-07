# ADR-034: Separate the private notebook from the teaching assistant

**Status:** Implemented

**Date:** 2026-10-07

## Context

The current whole-book Notebook combines writing, note review, concept judgments, chapter guidance, agent conversation, independent practice and peer inquiry.
Its primary navigation includes Write, Notes, Chapter guide and Agent.
This composition asks students to enter a writing space when they want help understanding the book, and exposes instructional tools when they only want to keep a note.
Earlier usability feedback identified difficulty understanding the starting activity and the context supplied to the agent.

These activities have different purposes.
The notebook holds the student's chosen account of their thinking, evidence and learning.
A teaching assistant provides interactive support for a current question or investigation.
Conversation history can help resume that work, but is not automatically the student's reflection or submission material.

[ADR-028](../implemented/ADR-028-use-a-private-reflection-notebook-to-support-course-learning.md) already separates notebook records from provider conversation history.
[ADR-027](../implemented/ADR-027-connect-book-learning-to-student-agents-through-a-local-companion.md) provides shared reading context, a local companion and bounded demo interaction.
The separation can therefore build on existing ownership without creating another service or copying student records.

## Decision

Present Notebook and Teaching assistant as distinct optional experiences within the whole published book.
Each has a clear entry point and purpose, with deliberate handoffs between them.
Use one local companion, pairing flow and provider integration for both.

### Responsibilities and entry points

| Experience         | Purpose                              | Responsibilities                                                                                                                                       |
| ------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Notebook           | Keep and organize my thinking.       | Capture, edit and revisit notes; supported reflection; personal concept judgments; portable archives; selected preparation for existing submissions.   |
| Teaching assistant | Help me understand or make progress. | Contextual discussion, responsive help, chapter guidance, guided demo investigation, feedback on reasoning and invitations to independent application. |

Reading selections and the current chapter can open either experience with visible source context.
Notebook remains usable without a model connection; connecting a provider is not a prerequisite for writing or reviewing notes.
Teaching assistant explains its provider requirement at connection or recovery, while ordinary study interaction emphasizes the student's question and relevant material.
Connection settings remain shared rather than appearing as separate accounts for each experience.

Move Chapter guide and Agent interaction out of the notebook's primary writing navigation.
Notebook review can resume a related investigation or an independent case through an explicit handoff.
Supported reflection and manual concept judgments remain available directly in the notebook, including for students who do not use an assistant.
Peer inquiry retains its recognizable audience and discussion context; it is not represented as the assistant's conversation or the student's private note.
Its placement may share the learning interface, provided its access and sharing actions remain explicit.

Opening one experience must not silently start the other, contact a model, save a durable record or discard unfinished work.
Retain the current book geometry when either is shown.
Preserve open experience, drafts and resumable conversation across book navigation using the existing distinction between tab state and durable storage.
Display the investigation's captured source when navigating so a retained conversation or draft is not silently retargeted to the new chapter.

### Deliberate handoffs and student authorship

From a reading selection or chosen note, offer discussion with the assistant after showing the source and any selected private material.
Only the student's chosen notes enter that conversation; opening the assistant does not authorize inspecting the whole notebook.

From a conversation or investigation, offer writing a takeaway or saving selected evidence into the notebook.
Prepare an editable draft with the source, relevant observation and assistance provenance; the student reviews and saves it.
Keep initial thinking, later independent attempts and reflection distinguishable using the existing related-record contract.
Do not save the whole transcript as a reflection by default, invent a personal learning claim or present accepted assistant text as an independently demonstrated explanation.
An independently written note and a short scratch note remain valid alternatives.

Selected peer material continues through [ADRs 029 and 033](../implemented/ADR-033-scaffold-peer-inquiry-while-preserving-individual-learning.md): initial-work disclosure, authorized contribution selection, attribution and reviewed sharing.
A handoff neither retrieves gated contributions nor expands future access to a thread.
Submission preparation remains deliberate selection into the existing course contract; the assistant gains no assessment or submission authority.

### State owners, public contracts and dependency direction

- The browser owns the two entry points, visible context, tab drafts and unfinished navigation state.
- The local notebook owner retains explicitly saved notes, histories, source snapshots, related records, self-assessments and accepted assistance provenance.
- The local conversation owner retains assistant exchanges and selected-context requests independently of notebook archives.
- Shared learning contracts own handoff/context types; shared agent policy owns instructional behavior under [ADR-035](../implemented/ADR-035-ground-the-teaching-assistant-in-a-shared-teaching-policy.md).
- Provider adapters implement the shared contract without owning notebook rules; course APIs continue to own shared audiences, submissions and assessment.

Refine responsibilities and entry-point placement from ADRs 027–033 while retaining their privacy, portability, responsive-support and independent-learning decisions.
Split browser orchestration by these responsibilities where needed, preserving dependency direction rather than introducing provider-specific notebook state.
An interface change alone does not justify a storage migration; any necessary protocol, archive or schema change must follow existing compatibility and recovery rules.

## Trigger

The user identified note taking and teaching assistance as separate mental models and requested ADRs formalizing the discussed direction.

## Consequences

**Positive:**

- Students can enter writing or assistance with a clearer expectation of what will happen.
- Reflection remains a chosen student record while instructional interaction has its own coherent home.
- Existing context, persistence and provider integration can be reused.

**Negative:**

- Two experiences need careful navigation and handoffs to avoid additional friction or lost context.
- Existing users need recognizable routes to guidance, conversations and peer inquiry after navigation changes.

**Neutral:**

- The whole book remains supported, with no requirement to add an activity for every passage.
- Course requirements, shared audiences and local ownership retain their existing contracts.

## Alternatives considered

### Keep all learning tools under Notebook and improve their labels

This preserves one entry point, but still makes writing the container for conversation and guided instruction.
Use separate purposes and visible handoffs to address the responsibility boundary as well as the labels.

### Build an independent hosted assistant or a second companion

This could provide separate product ownership, but duplicates setup and context integration and creates additional state and credential boundaries.
The existing companion already separates notebook and conversation persistence.

### Turn every conversation into notebook material automatically

This makes capture convenient but conflates dialogue, model output and the student's account of learning.
Retain student-reviewed selection and saving.

## Implementation and verification

The shared layout now offers separate lazy Notebook and Teaching assistant entry points.
`site/scripts/learning-navigation.ts` owns experience/section presentation, while `site/scripts/learning-assistant.ts` composes discussion, chapter guidance and human peer inquiry.
The existing workspace remains the coordinator for pairing and reviewed notebook writes; shared handoff types do not depend on a provider or course store.

The initial implementation used one fixed panel showing one experience at a time, preserving the book's normal geometry.
[ADR-036](../implemented/ADR-036-open-notebook-and-assistant-as-independent-panels.md) refines that presentation into independently openable panels while retaining this decision's responsibility and handoff boundaries.
Notebook provides Write, Notes and Concepts, with Prepare under More learning tools.
Teaching assistant provides Discuss, Chapter guide and Peer discussion, with the same Connect settings.
Version 1 tab state adds separate remembered sections, assistant message/goal/help choices, captured source, active conversation ID and browser identity; older records retain writing and map their sections to the new experience.

Notes offer single-note or selected-note discussion, with visible bounded source/context previews before sending.
Assistant replies offer a blank personal takeaway or a reviewed suggestion; unfinished notebook writing is protected by confirmation.
New student turns retain supplied note IDs, so handoffs link the material actually used on that turn rather than a later selection.
This is additive conversation JSON; notebook/archive/database schemas and protocol stay at version 1.
Old turns and installed package 0.1.0 remain usable without assigning inferred relationships; published companion 0.2.0 supplies turn-linked identities, with release verification recorded under [ADR-030](ADR-030-distribute-the-learning-companion-with-guided-student-setup.md#release-020).

Verification on 2026-10-07 used synthetic records:

- Browser journeys retain separate unsent writing/questions, selected support, original sources and saved conversation resume across switching, chapter navigation and reload, with no automatic message or notebook save.
- Reviewed handoffs retain source, related IDs and assistance history in the actual companion and portable export; declining replacement retains the unfinished note.
- The existing notebook checks cover restart and version 1 export/import; conversation checks retain the actual selected-note identities across restart and exclude unselected notes from provider context.
- Both experiences preserve shell, reading, prose, paragraph and demo geometry at 390–2560 pixels with navigation expanded/folded in Chromium and WebKit.
- All 150 unit tests and 22 combined notebook/onboarding/demo/peer browser checks pass; type checks, build and validation of 144 rendered HTML files pass.
- The locally packed companion passed clean installation and retained-record checks on macOS / Node 26.10.0; the registry package was unchanged at implementation time, before the subsequent 0.2.0 release.
- Visual review covered source selection and notebook takeaways in both browsers; existing journeys also check accessibility, mobile dark theme and shared-peer authorization.

These establish the software boundary and representative journeys.
Whether learners find the distinction clear and the effort manageable remains to be evaluated under [the voluntary protocol](../../learning-workspace-evaluation.md); no learner result is inferred from automated checks.
Workspace, architecture, setup and course inquiry documentation describe the implemented entry points and release limits.

## Resolved implementation choices

The initial shared fixed panel and two header entry points kept pairing and tab continuity together while presenting distinct purposes; ADR-036 retains the shared connection with independent panel state.
Peer discussion sits visibly within Teaching assistant alongside chapter guidance, retaining its human audience, course identity and explicit sharing actions.
Concrete naming and placement may be refined from learner feedback without changing record ownership or handoff rules.

## References

- [Current learning workspace contract](../../learning-workspace.md).
- [Current architecture and state owners](../../../ARCHITECTURE.md).
- [ADR-031: responsive learning support](../implemented/ADR-031-adapt-learning-support-to-the-students-current-task.md).
- [ADR-032: independent application and reflection](../implemented/ADR-032-connect-notebook-investigations-to-independent-application.md).
- [Voluntary learner evaluation](../../learning-workspace-evaluation.md).
