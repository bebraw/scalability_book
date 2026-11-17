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

Current-path verification on 16 November did not reproduce that overflow: an expanded **Browser observation** and an assistant reply with long JSON keys and URLs stayed inside the panel at 1440 px and 390 px in Chromium and WebKit.
The original 83 px finding remains open until its exact affected route and payload are identified; no overflow layout fix is claimed.
That verification did reproduce a keyboard-access defect: WebKit skipped the reply's horizontally scrolling code block, preventing keyboard users from reaching the complete lines.
Code blocks now have a named Tab focus target and visible focus indicator.
The focused browser regression retains full observation/code text, checks the panel bounds, scrolls code with an arrow key and verifies that Tab leaves the block.
The first worktree startup failure, unchanged-layout results and failing/passing keyboard checks are retained under ignored `.local/reviews/assistant-output-2026-11-16/evidence/`.
The keyboard fix was committed and deployed as `8b8f193` on 17 November; link CI and deployment passed, followed by live Chromium keyboard checks at both widths with local-network permission granted.
Live WebKit connectivity failed before reaching the code block; [task 9](#9-verify-the-live-companion-connection-in-safari) records that separate finding.

Reproduce with a synthetic conversation containing long JSON keys, URLs and nested output, then expand the relevant observation or trace in the assistant.
Inspect the panel and its scroll containers before changing [workspace styles](../site/styles/learning-workspace.css), [reply rendering](../site/scripts/learning-reply.ts) or [conversation presentation](../site/scripts/learning-agent-ui.ts).

Done when the expanded output stays within the panel on desktop and compact screens, remains readable and keyboard-scrollable where needed, and does not move the page or hide controls.
Add a browser regression at that boundary with a long synthetic payload; a short reply that already fits is insufficient.

## 2. Make preformatted assistant output readable in every theme

**Status: closed after current-path verification on 17 November 2026; no style change required.** The earlier visual review reported difficult-to-read preformatted output in light, sepia and calm themes, without retaining exact color measurements.
That problem did not reproduce on revision `8b8f193`.

The actual assistant panel is mounted under the page body, outside `.prose`.
Its fenced replies and saved guide observations inherit the theme's `--text` foreground on `--panel`; recorded browser observations use `--text` on `--bg`.
The separate [book code styles](../site/styles/book.css) therefore do not supply a conflicting foreground to the [assistant's code blocks](../site/styles/learning-workspace.css).

An isolated companion and synthetic conversation exercised the real reply renderer, expanded browser observations and the Chapter guide's **Save demo result** flow without a model request.
Chromium and WebKit passed all 80 surface/theme/viewport measurements at 1440 px and 390 px, covering all five themes and ordinary highlighted book code as well.
The same audit passed all 40 live Chromium measurements with matching ratios after granting local-network permission in the disposable browser context; live WebKit was blocked by the separate connection issue in [task 9](#9-verify-the-live-companion-connection-in-safari).
The following minimum contrast ratios exceed the 4.5:1 acceptance target; screenshots were also inspected for legibility.

| Theme         | Fenced reply / saved guide output | Recorded browser observation | Sampled highlighted book code |
| ------------- | --------------------------------- | ---------------------------- | ----------------------------- |
| Light         | 16.66:1                           | 15.41:1                      | 9.02:1                        |
| Dark          | 14.51:1                           | 16.33:1                      | 11.65:1                       |
| Sepia         | 15.19:1                           | 13.43:1                      | 8.96:1                        |
| High contrast | 20.38:1                           | 21.00:1                      | 12.60:1                       |
| Calm          | 15.79:1                           | 14.59:1                      | 9.16:1                        |

The audit script, per-sample computed colors, revision and screenshots are retained under ignored `.local/reviews/assistant-contrast-2026-11-17/`.
This closes the current contrast check, without claiming to have identified or corrected the historical rendering.
Reopen it if a specific failing page, payload or theme state is identified.

## 3. Make tool evidence easier to find and interpret

**Status: interface improvement implemented on 17 November 2026; first-time learner walkthrough pending.** The earlier concern was that the observation control was not sufficiently discoverable.

Replies with recorded browser observations now show **View browser evidence** and the observation count directly above the explanation.
One native disclosure exposes the complete literal records and explicitly separates browser output from the assistant's interpretation.
The disclosure stays open and retains keyboard focus as polling adds observations and the reply arrives.
Interrupted or orphaned observations remain accessible, and a later student turn cannot attach an earlier response's evidence to its reply.

[The evidence presentation owner](../site/scripts/learning-evidence.ts) groups and renders these records; [the assistant owner](../site/scripts/learning-agent-ui.ts) retains conversation state and polling.
The [workspace contract](learning-workspace.md) documents that this is successful browser evidence, not a complete trace of source retrievals, pending requests or declined/failed calls.
No storage, provider or tool-execution change was needed.

Ten focused Chromium/WebKit checks passed at desktop/mobile widths, including literal legacy output, correct reply association, interrupted responses, keyboard open/close, polling continuity, visible focus, scoped accessibility and the existing long-output checks.
Four packaged-companion browser checks also passed, including actual demo observations and declined/approved changes with a synthetic model.
The production build, type checks, HTML/local-link validation and formatting passed; the initial missing-control failure and passing results are retained under ignored `.local/reviews/assistant-evidence-2026-11-17/`.

Manual browser inspection confirms the control's placement and readable evidence, but does not establish first-time learner discoverability.
Keep this item open until a learner walkthrough confirms that a reader can find the evidence from the reply, open/close it and distinguish the actual output from the assistant's explanation.
Record that outcome separately from the automated checks.

## 4. Clarify the notebook-only capture path

**Status: closed on 17 November 2026 after workflow verification and clearer guidance.** The feedback suggested that capturing learning material required the assistant, but the existing capture paths worked with a notebook-only connection.
The empty Write view did not explain how to attach a passage; **Use selected text** appeared only after selection.

[Notebook presentation](../site/scripts/learning-pane.ts) now states that no assistant or model account is needed, explains passage capture before that control appears, and points to closing/reopening the panel when it covers the reading.
The [setup guide](learning-companion-setup.md#capture-and-revisit-your-thinking) gives a four-step capture/preview/write/save walkthrough and distinguishes the optional assistant-reply handoff.
The [workspace contract](learning-workspace.md) records the guidance; selection and saving behavior are unchanged.

All eight rehearsal cases passed before and after the wording change: select before opening/connecting Notebook or select while it is open, at 1440 px and 390 px in Chromium and WebKit.
Each used an isolated companion with no provider, never opened Assistant and made no `/agent` request.
Captured source remained separate from personal writing; the notebook stayed empty until **Save note**, then retained the exact writing, full captured passage, page URL and anchor.
Desktop/mobile notebook and rendered-guide screenshots were inspected, and the build, types, HTML/local-link validation and formatting passed.
The full link check found no broken links; 12 external destinations denied automated access and remain inconclusive.

Evidence and scripts are retained under ignored `.local/reviews/notebook-capture-2026-11-17/`, including the initial audit-script endpoint mistake and its correction to the existing `/notebook` read API.
These checks use synthetic text and programmatic selection; they do not establish native touch-selection usability or first-time learner comprehension.

## 5. Explain who can read paragraph feedback before submission

**Status: closed on 17 November 2026 after audience guidance and access verification.** The form previously gave no audience explanation, and its anonymous label did not explain that administrators retained access to the stored GitHub identity.
The posting confirmation appeared only inside the closed Tools menu.

[Comment controls](../site/scripts/comments.ts) now explain that the author and the book's feedback team can read the thread, and that the team may publish a curated Reader note without the author's name or private replies.
The form distinguishes Notebook writing and Peer discussion, and the anonymous option explains that only the displayed name changes.
The audience and anonymity explanations are associated with their inputs for assistive technology.
The form initially focuses the audience explanation; Tab moves into Category and the remaining fields.
This fixes a reproduced Chromium case at 1440 × 900 where focusing the textarea scrolled the new audience text above the panel's visible area.
After posting, the open related-feedback panel confirms delivery to the feedback team and explains where to read replies.
The [owning contract](feedback-setup.md) documents this presentation; access rules and storage are unchanged.

An isolated audit made 27 requests through the actual production Worker handlers, using synthetic signed sessions and in-memory KV.
It verified private author/admin access, exclusion of other students and separately configured course staff, retained anonymous identity, curated public Reader notes without private replies, and hidden-record exclusion.
All eight Chromium feedback/moderation tests passed, including regressions that first failed for the missing inline confirmation and initial focus.
Four Worker-backed Chromium/WebKit rehearsals at 1440 × 900 and 390 × 844 verified the fully visible audience explanation, Tab navigation, reachable controls, anonymous posting, inline confirmation, author replies and another student's curated Reader note.
Desktop/mobile screenshots were inspected; the Worker build, types, HTML/local-link validation and formatting passed.
The audit also identified separate follow-ups for long-token wrapping and logged-out Reader note access, recorded in [task 10](#10-wrap-long-tokens-in-paragraph-feedback) and [task 11](#11-check-logged-out-access-to-public-reader-notes).
Evidence and initial failures are retained under ignored `.local/reviews/feedback-audience-2026-11-17/`; no real student records or production feedback were used.
This verifies the access boundary and interface behavior, without claiming a first-time learner comprehension study.

## 6. Review the examples and diagrams in Chapters 1–3

**Status: closed after focused editorial changes and rendered inspection on 17 November 2026.** Each chapter already had examples and visuals; the selected additions connect their abstract explanations to one concrete decision.

- [Chapter 1](../book/01_establish/01_what_is_scalability.md): **What observation could reject my scalability claim?** The existing claim frame, pressure taxonomy and pressure-to-evidence diagram explain the reasoning structure.
  A new growing-feed hypothesis supplies data sizes, a fixed deployment and client count, a timing boundary, correctness and latency goals, and explicit exclusions.
  It shows why a fast but incorrect result rejects the claim.
- [Chapter 2](../book/01_establish/02_scalable_development.md): **What does the model do, what does the harness do, and what remains my decision?** The anatomy table, CSV failure and release-statechart example already cover components, verification and authority.
  A short handoff walkthrough now connects the student's export requirement, model requests, permitted harness operations, repository checks, retained failure and human acceptance, reusing the existing CSV case.
- [Chapter 3](../book/01_establish/03_benchmarking.md): **How can two different durations describe the same operation?** The percentile simulation, browser workbench, queue example and trace explorer already cover individual measurement techniques.
  A new four-checkpoint table follows one work-item creation, deriving a 60 ms request interval and a 160 ms browser journey.
  It locates the remaining intervals without inferring their cause, and separates timing from correctness, persistence and generalization.

The numerical claim and timeline are explicitly invented examples, not measured results or new project targets.
The existing diagrams and assessment requirements remain unchanged.
Independent editorial review checked the reasoning and arithmetic against the common project contract.
Eight desktop/mobile layout checks passed: all three passages in Chromium and the new table in WebKit, at 1440 px and 390 px, including the CSV forward link and numbered table reference.
The rendered passages and table were visually inspected; the build, types, HTML/local-link validation and formatting passed.
The full link check found no broken links and 14 inconclusive external destinations (access blocks or service errors).

The highlighted review, screenshots and check records are retained under ignored `.local/reviews/chapter-examples-2026-11-17/`.
The first browser script incorrectly expected an ID on a fourth-level heading; its failure is preserved alongside the corrected inspection of the rendered passage.
These checks establish the editorial and rendering result, not a learner comprehension study.

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

## 9. Verify the live companion connection in Safari

**Status: open; discovered during the 17 November deployment check.** Playwright WebKit blocked requests from `https://scalableweb.dev` to an isolated HTTP loopback companion as insecure mixed content.
The same engine completed the notebook and assistant workflows from a local HTTP site.
This establishes a live-origin test failure, not a confirmed result for branded Safari or iOS Safari.

Chromium's initial live connection also failed, but its diagnostic identified denied local-network permission; granting that permission in the disposable test context allowed the live desktop and mobile keyboard checks to pass.
Keep that permission case separate from WebKit's mixed-content rejection.
The initial failures and browser diagnostics are retained under ignored `.local/reviews/assistant-output-2026-11-17/` and `.local/reviews/assistant-contrast-2026-11-17/live/`.

Rehearse the documented HTTPS-site connection in supported Safari versions with a disposable notebook and no provider key.
Check the actual browser/version and permission behavior against [the browser-support scope](development.md#browser-support), [the setup guide](learning-companion-setup.md) and [the existing origin boundary](learning-workspace.md).

Done when the supported live-site connection path and its browser limitations are verified and documented, with a regression at the HTTPS-to-loopback boundary where automation can represent it.
Do not infer live connectivity from HTTP-only tests or recommend disabling browser security to make a test pass.
If a transport change is required, evaluate it separately under the repository's architecture and ADR rules.

## 10. Wrap long tokens in paragraph feedback

**Status: open; reproduced during the 17 November audience check.** At 1440 × 900, a synthetic unbroken token such as `PRIVATE_BROWSER_chromium-desktop` expands a related-feedback card and its grid track beyond the 238 px panel interior, producing a 287 px scroll width and clipping nearby controls.
The same result occurred with the baseline `84b98f5` comment renderer and the audience-copy change; ordinary spaced feedback stayed within the panel.

Reduce the card's minimum-content sizing in [feedback styles](../site/styles/feedback.css) before choosing a wrapping or layout correction.
Done when long words, URLs and author names remain readable without pushing the related-feedback panel or its controls sideways on desktop and compact screens.
The baseline/candidate screenshots and measurements are retained as `overflow-comparison.json` and `*-long-token-overflow.png` under ignored `.local/reviews/feedback-audience-2026-11-17/`.

## 11. Check logged-out access to public Reader notes

**Status: open; reproduced on 17 November with a synthetic featured note.** The Worker correctly returns the curated Reader note to a logged-out browser, and the paragraph badge shows one note.
Clicking the badge requests sign-in before commenting, opens no related-feedback panel and leaves the public note unreadable there.
The paragraph button's handler checks authentication before checking for existing visible notes.

Inspect [paragraph controls](../site/scripts/comments.ts) against the [public Reader note contract](feedback-setup.md).
Done when a logged-out reader can open the public note through the paragraph control while creating private feedback still requires sign-in; verify that the public response and rendered panel omit private identity and replies.
The reproduction and screenshots are retained as `public-note-repro.json` and `public-note-*.png` under ignored `.local/reviews/feedback-audience-2026-11-17/`.

## Closing tasks

Keep each item open until its stated observation or acceptance check has been completed.
When closing it, record the change or finding and the verification result here, or move the remaining task into its owning review with a link.
Retain raw screenshots, synthetic browser records and private experiment logs under ignored `.local/`; do not turn real student notes into fixtures.
Once every substantive item is incorporated or moved, retire this ledger according to [the documentation review policy](README.md#retiring-completed-reviews).
