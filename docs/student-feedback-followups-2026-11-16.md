# Student feedback follow-ups — 16 November 2026

This ledger preserves the unfinished work from the pilot feedback review while the course coding-agent setup is released.
Work through the items individually, reproducing the current behavior before deciding the smallest change.
The private feedback and student notes remain private; the tasks below summarize product and teaching concerns without copying those records.

The supported coding-agent entry is implemented in [ADR-063](adrs/implemented/ADR-063-launch-course-coding-agents-from-the-companion.md): guided phase selection, Aalto credentials, verified GLM/Qwen profiles, installed Codex reuse and a private pinned fallback.
Its [setup guide](learning-companion-setup.md#start-a-course-coding-project) owns the student instructions, and the [development guide](development.md#course-project-launcher) owns release and compatibility checks.
Completion of that setup work does not close the items below.

## 1. Keep expanded tool output inside the assistant panel

**Status: open; reproduced during the earlier browser review.** Expanded JSON/tool output produced approximately 83 px of desktop overflow.
Treat that measurement as the earlier observation, not an assertion that every current page or viewport fails.

Reproduce with a synthetic conversation containing long JSON keys, URLs and nested output, then expand the relevant observation or trace in the assistant.
Inspect the panel and its scroll containers before changing [workspace styles](../site/styles/learning-workspace.css), [reply rendering](../site/scripts/learning-reply.ts) or [conversation presentation](../site/scripts/learning-agent-ui.ts).

Done when the expanded output stays within the panel on desktop and compact screens, remains readable and keyboard-scrollable where needed, and does not move the page or hide controls.
Add a browser regression at that boundary with a long synthetic payload; a short reply that already fits is insufficient.

## 2. Make preformatted assistant output readable in every theme

**Status: open; observed during the earlier visual review.** Preformatted assistant output was difficult to read in light, sepia and calm themes.
No exact contrast ratio is retained in this ledger; measure the rendered foreground/background pair when reproducing it.

Check both fenced code in a reply and displayed observation/tool output, including the interaction between [book code styles](../site/styles/book.css) and [workspace styles](../site/styles/learning-workspace.css).
Choose colors from the existing theme contract rather than fixing one theme with a hard-coded pair.

Done when ordinary-size preformatted text meets a 4.5:1 contrast target in every supported theme and remains legible in the actual assistant panel.
Keep screenshots and computed color measurements for the failing cases and the correction; also inspect normal book code blocks for regressions.

## 3. Make tool evidence easier to find and interpret

**Status: open; reported usability concern, without a completed student retest.** The control for inspecting a trace or tool observation was not sufficiently discoverable.

Revisit its wording, placement and collapsed summary with a synthetic reply that used a tool.
The entry should explain what the student can inspect, distinguish recorded observations from the assistant's interpretation, and preserve readable evidence without overwhelming the reply.
Use the existing [assistant presentation owner](../site/scripts/learning-agent-ui.ts) and [workspace contract](learning-workspace.md); no new tracing backend is implied.

Done when a first-time reader can find the evidence from the reply, open and close it with keyboard or pointer, and identify what the tool actually returned.
Verify the interface behavior automatically where stable, and record the outcome of a short learner walkthrough separately from those checks.

## 4. Clarify the notebook-only capture path

**Status: open; reported workflow confusion, not a confirmed absence of capture capability.** The feedback suggested that capturing learning material required the assistant.
The current [workspace contract](learning-workspace.md) already supports opening Notebook with a reading selection and using **Use selected text** without sending a model message.

Rehearse passage capture, personal writing and saving with a notebook-only connection and no model configured.
Also distinguish this path from deliberately turning an assistant reply into a reviewed notebook draft.
Inspect [selection capture](../site/scripts/learning-selection.ts), [Notebook presentation](../site/scripts/learning-pane.ts) and first-use guidance only where the rehearsal reveals a gap.

Done when a student can discover and complete passage-to-note capture without opening or configuring the assistant, and the saved note retains its source.
Verify that the path makes no model request and that a draft is not saved until the student chooses Save.
If current behavior already satisfies the task, close it with the observed walkthrough and any necessary wording change rather than adding another capture mechanism.

## 5. Explain who can read paragraph feedback before submission

**Status: open; reported clarity concern.** Students should be able to distinguish private paragraph feedback from notebook writing and course peer discussion.

Review the feedback form and confirmation against [the existing audience contract](feedback-setup.md): a student sees their own comments and staff replies; staff can review comments, and curated reader notes can be featured publicly.
Anonymous presentation in the teacher-facing interface does not remove the stored identity.
Inspect [comment controls](../site/scripts/comments.ts) and [feedback styles](../site/styles/feedback.css); this task does not authorize changing visibility rules.

Done when the form explains the actual audience and relevant anonymity/featuring behavior before a student posts, and the confirmation agrees with it.
Use synthetic author, other-student and staff accounts to verify the existing access boundary while checking the revised wording.

## 6. Review the examples and diagrams in Chapters 1–3

**Status: open; editorial concerns from the feedback review.** More concrete explanation was requested, but the exact passage-level changes still need to be selected against the current chapters.
Do not treat this as a request to add a diagram to every section or expand the reading indiscriminately.

Review these chapters separately:

- [Chapter 1: What is scalability?](../book/01_establish/01_what_is_scalability.md): whether an example makes the path from pressure, through a system boundary, to a measurable claim clear.
- [Chapter 2: Scalable development](../book/01_establish/02_scalable_development.md): whether the agent, harness and verification-loop explanations show the student's decisions and responsibilities through a concrete case.
- [Chapter 3: Benchmarking](../book/01_establish/03_benchmarking.md): whether examples and visuals make the workload, measurement boundary and interpretation of an observed result understandable together.

For each selected passage, record the learner question, what the existing example or diagram already covers, and the smallest missing explanation.
Done when the revised passage enables the intended reasoning with a worked example or visual where useful, its assumptions and evidence limits are explicit, and the result is inspected in the published layout.
Use the [publishing conventions](development.md) and a highlighted review; avoid tests that merely repeat prose.

## 7. Make the role of optional exercises explicit

**Status: open; reported orientation concern.** Review whether readers can tell which exercises are optional practice, how to start them and what they should learn or retain.

Start with the optional exercises encountered in Chapters 1–3, their linked investigations and the relevant course brief.
Compare the wording with [the exercise contract](chapter-exercises.md), the [course requirements](../specifications/README.md) and the existing [run-orientation backlog](first-run-course-improvements.md#1-improve-run-specific-orientation).
Preserve required assessment and submission rules; a practice activity should not silently become an additional deliverable.

Done when each reviewed activity names its purpose, starting point and expected outcome, and readers can distinguish optional practice from required course evidence.
Check links and the rendered reading path, then record any remaining confusion from the next pilot walkthrough.

## 8. Remove the setup guide's small mobile overflow

**Status: open; reproduced during the setup-guide browser review.** At a 390 px viewport, the document reported a 391 px scroll width.
Removing the new course-project section did not remove the extra pixel, so the issue predates that section.
Heading-anchor positioning is a suspected cause, not a confirmed diagnosis.

Reproduce on `/notebook/setup/` at that width, identify the element crossing the document boundary and reduce the cause before editing shared layout.
The retained local observations are `.local/reviews/establish-glm-setup/project-setup-browser.json` and `.local/course-preparation/companion-codex-reuse-2026-11-16/browser-review.log`.

Done when the page has no document-level horizontal overflow at 390 px and nearby compact widths, while heading anchors, focus outlines and code-block scrolling remain usable.
Check another reading page if the correction touches shared heading or layout styles.

## Closing tasks

Keep each item open until its stated observation or acceptance check has been completed.
When closing it, record the change or finding and the verification result here, or move the remaining task into its owning review with a link.
Retain raw screenshots, synthetic browser records and private experiment logs under ignored `.local/`; do not turn real student notes into fixtures.
Once every substantive item is incorporated or moved, retire this ledger according to [the documentation review policy](README.md#retiring-completed-reviews).
