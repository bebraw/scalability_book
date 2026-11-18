# Student feedback follow-ups — 16 November 2026

This ledger preserves the unfinished work from the pilot feedback review while the course coding-agent setup is released.
Work through the items individually, reproducing the current behavior before deciding the smallest change.
The private feedback and student notes remain private; the tasks below summarize product and teaching concerns without copying those records.

The supported coding-agent entry is implemented in [ADR-063](adrs/implemented/ADR-063-launch-course-coding-agents-from-the-companion.md): guided phase selection, Aalto credentials, verified GLM/Qwen profiles, installed Codex reuse and a private pinned fallback.
Its [setup guide](learning-companion-setup.md#start-a-course-coding-project) owns the student instructions, and the [development guide](development.md#course-project-launcher) owns release and compatibility checks.
Completion of that setup work does not close the items below.

Changes through `4fbee6e` were pushed on 17 November 2026; published-link CI and Cloudflare deployment succeeded for that commit.
Eleven live Chrome checks passed for feedback wrapping/audience, compact setup guides, chapter examples, optional practice, notebook guidance and browser-evidence disclosure.
They used the deployed assets with synthetic feedback responses and a disposable companion, without production writes or model calls; evidence is retained under ignored `.local/reviews/deployment-4fbee6e-2026-11-17/`.

The Reader note correction was pushed as `15794a3` on the same date; published-link CI and Cloudflare deployment succeeded.
Live desktop/mobile Chrome checks verified public reading, the sign-in handoff and retention of the note after closing Account, with synthetic responses and no production writes.
Evidence is retained under ignored `.local/reviews/deployment-15794a3-2026-11-17/`.

The trace-reading disclosure was pushed as `35fe859` on 17 November; all six CI/deployment checks passed, including Cloudflare deployment and companion package checks.
Eight live Chrome/WebKit checks passed across the chapter and gallery at desktop/mobile widths using actual published assets, with no production API writes.
Evidence is retained under ignored `.local/reviews/deployment-35fe859-2026-11-17/`.

The trace-record containment fix was pushed as `727dad2` on 17 November; published-link CI and Cloudflare deployment passed for that commit.
Twelve live Chromium/WebKit checks passed across the chapter and gallery at 1440, 390 and 320 px, verifying full records, contained scrolling, keyboard access and span replacement with the published assets and no production API writes.
Evidence is retained under ignored `.local/reviews/deployment-727dad2-2026-11-17/`.

The notebook exchange preview was pushed as `b6acd8c` on 17 November; all six CI/deployment checks passed, including Cloudflare deployment and companion package checks.
Four live desktop/mobile Chromium/WebKit cases passed, with eight scoped accessibility checks and explicit saves to disposable local notebook storage, using the published assets and synthetic conversations without production writes or model calls.
Chromium used the native companion connection; WebKit's previously documented native connection failure was preserved, and its UI checks used a local transport bridge rather than establishing native Safari support.
Evidence and that limitation are retained under ignored `.local/reviews/deployment-b6acd8c-2026-11-17/`.

The Chapter 1 reversibility guidance was pushed as `813a97b` on 17 November; published-link CI and Cloudflare deployment passed for that commit.
Four live Chromium/WebKit checks passed at 1440 and 390 px, covering the four steps, preserved category values, client transition, containment and the Friction chapter link with actual published assets and no production writes.
Evidence is retained under ignored `.local/reviews/deployment-813a97b-2026-11-17/`.

The note-tool and explicit-submission guidance was pushed as `8c31c37` on 17 November; published-link CI and Cloudflare deployment passed for that commit.
All modified wording, correct rubric editions/link destinations and horizontal containment were verified on the deployed current introduction, archived introduction and setup guide in Chromium/WebKit at 1440 and 390 pixels.
The full twelve-case navigation audit had ten passes and two WebKit walkthrough-anchor positioning failures; instrumented diagnostic passes did not establish a fix, and desktop sticky-header occlusion was also observed.
These anchor limitations remain open in [task 28](#28-make-linked-setup-headings-reliably-visible).
Evidence is retained under ignored `.local/reviews/deployment-8c31c37-2026-11-17/`.

## 1. Keep expanded tool output inside the assistant panel

**Status: open; reproduced during the earlier browser review.** Expanded JSON/tool output produced approximately 83 px of desktop overflow.
Treat that measurement as the earlier observation, not an assertion that every current page or viewport fails.

Current-path verification on 16 November did not reproduce that overflow: an expanded **Browser observation** and an assistant reply with long JSON keys and URLs stayed inside the panel at 1440 px and 390 px in Chromium and WebKit.
The original 83 px finding remains open until its exact affected route and payload are identified; no overflow layout fix is claimed.
An artifact and history audit on 17 November found the measurement first recorded in the initial ledger, without the original route, payload, browser, viewport or measured element.
Later verification records repeat the number but do not recover that trigger.
The original feedback also names overflowing JSON in the separate trace demo; task 13 below tracks that concrete surface without assuming it explains this measurement.
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

**Status: guidance implemented on 17 November 2026; next pilot walkthrough pending.** The review covered the practice questions in Chapters 1–3, their prose activities and linked investigations, against [the exercise contract](chapter-exercises.md) and [course requirements](../specifications/README.md).

The shared question cards now say **Optional practice**, explain attempting/checking/comparing an answer without an account or assistant, and distinguish optional private saving from the course brief's required submissions.
Their existing titles and prompts identify the reasoning to practice.
This shared presentation also keeps the same questions consistent in later chapters and the demo gallery; question text, versions and answer ownership are unchanged.

The linked explorations already supplied scenarios, questions and specific outcomes, but their opening panel emphasized using an agent.
It now explains independent reading first and keeps the agent starting URL as an optional discussion route.
The completion guidance points to changed reasoning and one next check in existing notes, as documented in [the resource contract](agent-learning-resources.md#authored-resources).

Five Chapter 2–3 invitations now name a starting action and retained outcome: prototype ownership, skill adoption, explanation checking, resource optimization and repair evidence.
The optimization experiment and skill-adoption lab are explicitly optional; the downloadable lab repeats that status.
The existing CSV, coverage, local telemetry and Navigator instructions already supplied sufficient purpose, entry steps and outcomes, so their instructions remain unchanged.
Required **Project artifact** checkpoints, grading and submission rules remain governed by the course specifications.

Nine existing unit checks and six Chromium browser cases passed, covering checked answers, private saves/restoration, anonymous and no-JavaScript reading, keyboard/tab navigation, print behavior, source links and desktop/mobile accessibility.
Additional desktop/mobile inspection confirmed the optional guidance, reachable worked answers, independent exploration path and revised invitations; the built skill-adoption ZIP contains the revised README.
Build, types, HTML/local links and formatting passed.
The full link check found no broken links and 15 inconclusive external destinations due to access blocks or service errors.
Logs, screenshots and the highlighted review are retained under ignored `.local/reviews/optional-practice-2026-11-17/`.

At the next pilot walkthrough, ask a learner to choose one optional activity, find its first step, explain what they would retain and distinguish it from the required Establish evidence.
Record any remaining confusion before closing this item; [run-specific orientation](first-run-course-improvements.md#1-improve-run-specific-orientation) remains a separate preparation task.

## 8. Remove the setup guide's small mobile overflow

**Status: closed on 17 November 2026 after reproducing and correcting the guide layout.** Both `/notebook/setup/` and `/agents/` reported a 391 px scroll width at a 390 px viewport in Chromium and WebKit.
The hanging heading link extended to 390.97 px because the guide's 16 px gutter did not reserve enough space for it.
A reduced heading-only example reproduced the overflow; hiding the link removed it.
The course-project section was not the cause.

The [guide container](../site/styles/layout.css) now reserves a minimum 24 px inline gutter, keeping the link and its visible keyboard focus outline inside the viewport.
A separate 320 px check exposed an unbroken prose URL on `/agents/`; guide prose links can now wrap within the reading column.
Long code remains horizontally scrollable within its own block.
The [layout contract](development.md#setup-guide-layout) records these requirements.

The focused browser regression replaces its former one-pixel overflow tolerance with an exact zero check, and verifies heading-link bounds, keyboard entry/exit, visible focus, fragment activation and contained code scrolling at five widths on both guides.
All ten route/width combinations passed.
An additional Chromium/WebKit audit passed all 28 cases: both guides at 320, 360, 375, 390, 414 and 1600 px, plus an ordinary reading chapter at 390 and 1600 px in both engines.
The audit also exercised horizontal wheel scrolling inside long code blocks without moving the page.
Mobile and desktop screenshots were inspected; the Worker build, types, HTML/local-link validation and formatting passed.

Evidence is retained under ignored `.local/reviews/setup-overflow-2026-11-17/`, including the original one-pixel regression and the narrower long-URL failure.
Diagnostic failures are retained separately from product failures: a reduced-motion probe read padding during its transition, and an initial keyboard check assumed that Enter preserved anchor focus after fragment navigation.
The corrected checks wait for settled layout and check keyboard exit before activation; WebKit uses its observed Option-Tab link-navigation mode.
These local layout checks do not establish live Safari connectivity, which remains [task 9](#9-verify-the-live-companion-connection-in-safari).

## 9. Verify the live companion connection in Safari

**Status: closed on 17 November 2026 with a verified connection limitation and recovery path.** A disposable session in actual Safari 27.2 (22625.2.8.11.9), on macOS 27.2.1, failed to connect from `https://scalableweb.dev` to a notebook-only HTTP loopback companion.
No request, including preflight, reached the companion during that attempt.
The same Safari session connected and saved synthetic writing from an allowed local HTTP site.
Playwright WebKit 26.4 reproduced the live failure and explicitly reported blocked mixed content.
This confirms the installed Safari connection limitation, not a result for every historical Safari version or iOS.

Chrome 157.0.8103.79 and Playwright Chromium 148.0.7778.96 connected from the deployed HTTPS site with local-network permission granted, saved synthetic notes and reopened their exact writing after reload.
The existing denied-permission finding remains distinct from Safari's pre-request failure.
The [setup guide](learning-companion-setup.md#browser-connection-support) and HTTPS connection screen now direct students to current Chrome on the same computer.
Changing browsers can reuse the same running companion and stored notebook; unsaved drafts must be copied from the original tab.
Safari remains within the ordinary reading/course browser baseline, but is not supported for this companion connection.
The [workspace contract](learning-workspace.md) and [browser verification guidance](development.md#browser-to-companion-connection) record that scope.
Network-error guidance retains uncertainty and explains that `doctor` checks local setup, not browser access.

A new Chromium regression presents the real reading client at a synthetic HTTPS origin while leaving all companion HTTP requests unmocked.
It verifies exact Origin/CORS handling, notebook saving, disconnect/reload/reconnect, readable persisted writing and absence of model requests.
Only website resources are fulfilled from the local development server; this exercises browser origin policy rather than TLS certificates, the deployed host or Safari.
The independent live audit covers the deployed host with normal browser security and no provider credentials.
The client check and HTTPS regression passed; four desktop/mobile inspections verified the guidance and help link in both panels without horizontal overflow.
The rendered setup guidance, Worker build, types, HTML/local links and formatting also passed inspection or validation.

Evidence, browser versions, request metadata and screenshots are retained under ignored `.local/reviews/safari-connection-2026-11-17/`.
The Safari rehearsal uses programmatic DOM controls after WebDriver's native click did not open the panel; it verifies transport and persistence rather than native input usability.
Retained audit failures also include a case-sensitive save-status check and an incorrect expectation that collapsed note text would be visible; the corrected read check opens Edit and inspects the writing field.
The regression's first run omitted the nondefault address after Disconnect cleared it; the corrected fixture enters the same address again.
No real student records, provider calls or browser-security overrides were used.

## 10. Wrap long tokens in paragraph feedback

**Status: closed on 17 November 2026 after reproducing and correcting intrinsic text sizing.** At 1440 × 900, `PRIVATE_BROWSER_chromium-desktop` expanded the related-feedback panel's single grid column to 262.77 px, producing a 287 px scroll width inside its 238 px interior in both Chromium and WebKit.
A reduced panel containing one card reproduced the cause independently of the page layout and comment scripts.
Removing the card's automatic minimum width alone left overflowing text; `overflow-wrap: break-word` alone retained the oversized grid column.

[Feedback cards](../site/styles/feedback.css) now use `overflow-wrap: anywhere`, which both reduces their minimum-content width and permits long text to wrap.
Nested reply bodies and author names inherit that behavior.
The panel now reports matching 238 px client and scroll widths on desktop, with every text line contained and the header and moderation controls reachable.
The complete literal writing, URLs and names are retained, as required by [the feedback contract](feedback-setup.md#5-student-feedback-flow).

Six new browser cases cover the original moderate token and a long URL/author/reply fixture at 1440, 390 and 320 px.
Five failed before the correction; the original token already fitted at 390 px.
The checks reject clipped-text workarounds by inspecting visible text and its line bounds, and exercise keyboard navigation, moderation controls, closing and adding another comment.
All 14 feedback and moderation browser tests passed after the correction.
An independent audit through the actual Worker handlers passed all 12 Chromium/WebKit cases across those widths for both authors and administrators, using synthetic records and no external requests.
Screenshots were inspected; the Worker build, types, HTML/local-link validation and formatting passed.

The reduced comparisons, failing and passing checks, measurements and screenshots are retained under ignored `.local/reviews/feedback-overflow-2026-11-17/`; the earlier baseline comparison remains under `.local/reviews/feedback-audience-2026-11-17/`.
One post-fix keyboard assertion exposed 0.17 px of stable vertical rounding at the Feature button after native scrolling; its corrected vertical check waits for smooth focus scrolling to settle and allows one CSS pixel while horizontal containment remains exact.
This is separate from the original horizontal overflow; the failure and measured bounds are retained.

## 11. Check logged-out access to public Reader notes

**Status: closed on 17 November 2026 after separating public reading from authenticated commenting.** The Worker already returned the curated Reader note to a logged-out browser, but the paragraph button checked authentication before looking for visible notes.
Both new desktop/mobile regressions reproduced the visible one-note badge opening no panel.

[Paragraph controls](../site/scripts/comments.ts) now open existing visible feedback first.
The shared form entry checks authentication before creating or removing interface elements, covering both an empty paragraph and the related-feedback panel's action.
Logged-out readers see **Sign in to comment**, which opens the existing Account dialog; closing it leaves the public note available.
The [feedback contract](feedback-setup.md#5-student-feedback-flow) records this behavior.
Worker authorization, public projection and stored records are unchanged.

The regression covers keyboard opening, closing and reopening the public note, its Reader note label without private replies or moderation controls, visible GitHub sign-in, and no form or write from either unauthenticated entry point.
All 16 feedback and moderation browser tests passed.
An independent audit through the actual Worker passed four Chromium/WebKit cases at 1440 and 390 px using synthetic author/admin/public sessions and in-memory KV.
It verified that the author retains the original private question and reply, while both the public API response and rendered note omit them and the private identities.
The public UI made no feedback writes, and a separate unauthenticated API POST returned 401 without changing the note.
Desktop/mobile screenshots were inspected; the Worker build, types, HTML/local-link validation and formatting passed.

Initial failures, corrected checks, API projections and screenshots are retained under ignored `.local/reviews/public-reader-note-2026-11-17/`; the earlier reproduction remains under `.local/reviews/feedback-audience-2026-11-17/`.
The first post-fix test expected a bare GitHub sign-in URL; the existing Account contract appends the reading's return destination, so the corrected assertion preserves that behavior.
No production feedback or real student records were used.

## 12. Make the trace demo's revealed reading visible

**Status: closed on 17 November 2026 after reproducing the offscreen result and making it an explicit disclosure.** The original Chapter 3 feedback identified a reveal action that appeared to do nothing; the initial ledger omitted it.
In the current demo, selecting a child span and activating **Reveal authored case reading** changed a header verdict and an inspector note, then disabled the button and lost focus.
In the 390 px WebKit click reproduction, the verdict was above the viewport and the explanation below it, while the disabled button remained visible.
The same check found offscreen explanations in desktop and compact Chromium.

The reading now opens directly after the control as a labelled region containing the request verdict, selected span and complete authored interpretation.
Opening it brings it into view and focuses it; the button reports its expanded state and can hide or reopen it.
Selecting another span updates the interpretation; selecting another request hides it and requires new child-span evidence.
The [resource contract](agent-learning-resources.md#public-mcp-server) records these controls as trace activity version 3.
The authored cases, timings and interpretation remain unchanged.

Four new chapter/gallery regressions at desktop/mobile widths failed before the change because no visible reading region existed.
The earlier test passed because it only checked the changed header text.
All five Chromium regressions passed after the change.
Eight built-page checks passed in Chromium and WebKit across both routes and widths, covering pointer/keyboard reveal, a fully visible focused reading, full interpretation, close/reopen, selected-span updates and request reset.
Screenshots were inspected; the Worker build, types, HTML/local-link validation and formatting passed.
The full link check found no broken links and 13 inconclusive external destinations due to access blocks or service errors.
The first WebKit audit incorrectly assumed plain Shift+Tab included native buttons; a reduced page confirmed that its default navigation uses Option+Shift+Tab, which the corrected check uses without changing browser preferences or native button semantics.
Retained reproduction measurements, screenshots and test logs live under ignored `.local/reviews/trace-reveal-2026-11-17/`.
These checks verify the disclosure and keyboard behavior, not first-time learner comprehension.

## 13. Keep the trace inspector's JSON inside its panel

**Status: closed on 17 November 2026 after reproducing and correcting the disclosure's minimum width.** Opening **Inspect conceptual span record** expanded the inspector's implicit grid column to the long JSON line's width.
On the 1440 px chapter page, the inspector had a 300 px client width but a 384 px scroll width in Chromium and 393 px in WebKit.
The same cause reproduced on the chapter and gallery at 390 and 320 px.
This is the concrete trace-demo finding, separate from task 1's unattributed assistant observation.

A reduced inspector containing only the disclosure reproduced the overflow in both engines.
Limiting only the preformatted viewer's maximum width left the oversized grid column unchanged.
The [record disclosure](../site/styles/demos.css) now has `min-inline-size: 0`, allowing the existing viewer's internal scrolling to contain the complete literal record.
Its named keyboard target and focus indicator already existed; the record data, interpretation and activity version are unchanged.
The [resource contract](agent-learning-resources.md#public-mcp-server) records the containment and scrolling behavior.

All six new chapter/gallery regressions failed before the fix after successfully parsing the full authored JSON.
All 11 Chromium trace-demo tests now pass, including inspector/page containment, complete record fields, visible keyboard focus, arrow-key scrolling, Tab exit and replacement when another span is selected.
Twelve built-page Chromium/WebKit cases passed across both routes and all three widths, including reaching the final characters horizontally without losing the literal text.
Screenshots were inspected; the Worker build, types, HTML/local-link validation, formatting and diff checks passed.

The first post-fix regression run exposed 0.23–0.45 px of native vertical focus-scroll rounding; the corrected check allows one CSS pixel vertically while retaining exact horizontal containment.
The separate WebKit audit reproduced a missed instantaneous synthetic arrow press in a standalone native scroll box, and a rapid key sequence stopped short at 320 px.
Held keys and observed animation completion reached the last character without changing the page's keyboard behavior; the corrected audit uses that bounded sequence.
Initial failures, reduced comparisons, exact geometry, successful checks and screenshots are retained under ignored `.local/reviews/trace-record-2026-11-17/`.

## 14. Preserve the learner's thinking in a reviewed notebook draft

**Status: implemented on 17 November 2026 with explicit exchange review.** The selected-suggestion handoff copied only the assistant reply, losing the learner's question or response from the proposed note.
It also silently cut reply text to the Notebook's 16,000-character limit.

**Use as a notebook draft** now opens a preview of the selected reply and its nearest preceding student turn, with separate editable fields and inclusion controls.
**Prepare notebook draft** retains the chosen text with speaker labels, the original source and available supplied-note relationships; other turns and browser observations are excluded.
The preview counts the complete body including labels and blocks an over-limit handoff until the learner edits or omits material.
**Write a takeaway** still opens a blank personal draft, and only **Save note** creates a notebook record.

[Preview presentation](../site/scripts/learning-note-preview.ts) owns the selected exchange; the existing tab session preserves its edits independently of polling, navigation and the active discussion.
Closing and reopening the same preview retains the edits, and selecting another exchange asks before replacement.
The existing Notebook replacement guard preserves both drafts when cancelled.
The [workspace contract](learning-workspace.md) and [setup guide](learning-companion-setup.md#capture-and-revisit-your-thinking) document the flow within ADR-034's selected-evidence boundary; no companion release or provider change is required.

Nine unit checks passed for session continuity, literal text, selected speakers, legacy replies, exact assistance-history boundaries and explicit shortening of oversized metadata while retaining message identities.
Eight focused Chromium/WebKit browser checks passed, including polling/reload continuity, replacement cancellation, full source/context retention, actual save/export and the exact 16,000/16,001-character boundary.
Six additional panel/session continuity checks passed; two existing **New note** visibility checks failed in both browsers and reproduced unchanged on the pushed revision, as recorded in [task 26](#26-bring-new-note-context-into-the-visible-notebook-area).
Four built-page desktop/mobile checks passed across both engines, including eight scoped accessibility checks, horizontal containment, editable/omitted parts and an actual notebook save without preview-triggered writes or model requests.
Screenshots were inspected; the Worker build, types, HTML/local-link validation and formatting passed.
The full link check found no broken links and 14 inconclusive external destinations due to access blocks or service errors.

Three baseline cases reached the old reply-only handoff and failed for the missing preview; the fourth stopped at a fixture connection race, so it is not evidence of the product defect.
Later fixture corrections waited for connection/save completion and reselected an omitted field before editing it; the disabled-field behavior remains intentional.
Initial failures and passing checks are retained under ignored `.local/reviews/notebook-exchange-2026-11-17/`.
The opt-in real-provider test was updated for the new review step but was not run; synthetic conversations and disposable notebook storage supplied all records.

## 15. Give Chapter 1 a practical reversibility check

**Status: closed after focused editorial changes and rendered inspection on 17 November 2026.** Chapter 1 introduced decision reversibility and linked its definition, but gave no procedure for applying it to a project choice.
The concept entry already named dependencies, durable effects, cost and recovery evidence, and Chapter 5 already developed commitment points and decision records.

[Chapter 1](../book/01_establish/01_what_is_scalability.md) now supplies four steps at first use: define a safe result, identify dependencies that outlive code, describe reversal work and cost, and rehearse the uncertain part on disposable state.
An illustrative optional category field connects a cheap isolated trial to accepted data and independently deployed clients.
The example rejects a code revert that makes records unreadable or hides their category values, and describes preserving those values while clients transition.
It distinguishes a bounded rehearsal from production recovery evidence and links the existing decision log and Chapter 5 treatment.
Course deliverables, assessment requirements and the concept definition are unchanged.

Independent editorial review checked the method against Chapter 5 and the existing project decision-record requirements; its correction made preservation of category values and treatment of existing clients explicit.
Four rendered Chromium/WebKit checks passed at 1440 and 390 px, covering the four steps, text containment and the forward link's actual destination; screenshots were inspected.
The Worker build, types, HTML/local-link validation, formatting and diff checks passed.
The full link check found no broken links and 13 inconclusive external destinations due to access blocks or service errors.
The first inspection script assumed a fourth-level heading rendered as a semantic heading; the book renders it as bold text, so the corrected inspection locates the actual passage without changing presentation.
Evidence and the initial inspection failure are retained under ignored `.local/reviews/reversibility-2026-11-17/`.
These checks establish the editorial and rendering result, not a learner comprehension study.

## 16. Explain note-tool choice and the submission handoff

**Status: closed after guidance changes and current-workflow verification on 17 November 2026.** The course introduction did not explicitly say students could use another notes tool, while Notebook's preparation guidance did not explain the manual handoff or the different draft audiences.
The existing implementation already exported selected material without submitting it.

The [course introduction](../specifications/00_introduction.md#personal-notes-and-learning-diaries) now explicitly permits preferred note tools, explains the existing learning-diary criteria and separates private individual portfolios from the group's technical bundle.
The [course environment sheet](../specifications/course_environment.md#publish-the-course-workflow) links that guidance separately from coding-agent setup.
The [setup walkthrough](learning-companion-setup.md#prepare-material-for-your-portfolio) explains selecting, building, reviewing and copying/downloading Markdown, then completing the appropriate course portfolio fields and explicitly submitting.
It distinguishes local Notebook writing, course drafts/uploads visible to the student and staff, initial submission, later correction and whole-notebook JSON backups.
Other notes tools can join at the course submission step without importing their material into Notebook.

The [workspace contract](learning-workspace.md#notebook-and-portability) records these existing boundaries.
The sole pre-course requirement edition's introduction and digest were regenerated with the owner under the existing publication policy; the checklist, rubric, deliverables and application behavior are unchanged.
No companion release or UI change is needed.

Four requirement/evidence unit checks and four existing Chromium/WebKit notebook/course workflow cases passed.
Two additional real-companion audits selected one of two synthetic notes, edited and downloaded the exact Markdown, excluded the other note and confirmed no course/model request from preparation.
Opening the course workspace transferred no note text or IDs; actual course submission/privacy was verified separately on the local application server rather than inferred from static-page navigation.
Twelve rendered checks passed across the current introduction, archived introduction and setup guide in both browsers at 1440 and 390 px; screenshots were inspected.
The Worker build, types, HTML/local-link validation, formatting and diff checks passed; the full link check found no broken links and 13 inconclusive external destinations due to access blocks or service errors.

The first link check found that the unpublished environment sheet could not be reached through a relative website link; the corrected owner and snapshot use its existing GitHub publication route.
The first rendered inspection incorrectly required heading accessible names without their permalink labels; the corrected check uses the actual section IDs and verifies their text.
These failures and successful checks are retained under ignored `.local/reviews/note-tools-2026-11-17/`, using synthetic records and no production writes.
This verifies the guidance against the implemented workflow, not first-time learner comprehension.

## 17. Adjust Notebook size after comparing reading space

**Status: resizing deployed and verified on 18 November 2026; navigation remains task 29.** The student requested a resizable Notebook, less unused reading/navigation space and simultaneous Book/Page navigation.
The layout comparison used the same built revision `8c31c37`, synthetic writing and a disposable companion in Chromium at 1440 × 900, 1280 × 720, 1024 × 900 and 390 × 844.
It compared the existing overlay, a 24rem Notebook and a desktop prototype reserving a 25rem column with 12rem navigation, with Notebook alone and both tools open.

At 1280 × 720, narrowing Notebook reduced overlap with the visible paragraph bounding box from 25% to 3%, and with the trace demo from 52% to 39%.
These are box intersections, including whitespace, rather than counts of hidden words.
The narrower Notebook cleared the request selector and reveal control when open alone; Assistant still covered those controls when both were open.
The reserved-column prototype removed Notebook-only overlap but reduced the demo from 835 to 584 pixels and clipped long navigation labels; it also left a small Assistant overlap because that panel was wider than the reserved column.
It retained the original overlay below 1200 pixels and did not address compact navigation access.
These bounded prototypes expose tradeoffs, not an exhaustive evaluation of possible layouts.

Selected change: native width/height sliders and Reset size, retaining [ADR-036's stable book geometry](adrs/implemented/ADR-036-open-notebook-and-assistant-as-independent-panels.md).
The assistant selected this focused implementation within the instructor's authorized feedback work.
The preferred size is browser tab state; effective size fits the viewport and the space above Assistant, with the existing mobile layout and automatic defaults preserved.
This gives control over the requested window size; it does not establish unobscured side-by-side reading at every width.
No companion, model, course or portable-notebook contract changes are needed.

Book/Page navigation remains a separate [task 29](#29-improve-book-and-page-navigation-access).
The short simultaneous-panel allocation remains relevant to [task 26](#26-bring-new-note-context-into-the-visible-notebook-area): at 1280 × 720 Notebook had only 118 pixels of content height, which a width change cannot increase.
Comparison scripts, measurements, synthetic screenshots and the interactive HTML comparison are retained under ignored `.local/reviews/notebook-layout-2026-11-17/`.

Six focused Chromium/WebKit cases passed for keyboard/pointer resizing, reset, accessibility, mobile focus/fallback, unchanged book and assistant geometry, and retained independent drafts/sources/preferences across navigation, reload and temporary clamping.
Resizing and reopening made no companion writes or model requests.
Four session checks passed, including malformed/legacy size fields without loss of unfinished writing; eight additional Chromium visual cases covered 1440, 1280, 1024 and 390 pixel widths.
The first two keyboard cases exposed a real interaction with the global reduced-motion transition duration: the input handler read the old width and temporarily reset the slider value.
Event tracing reproduced it twenty times; twelve differential cases confirmed that immediate Notebook geometry removed the cause, and the final tests wait for exact keyboard destinations before measuring dimensions.
The original failures and event traces are retained alongside the passing results.

Production build, type checks, formatting and validation of 74 HTML files and 6,590 local links passed.
The final full link check found no broken links and 33 inconclusive external URLs, including nineteen GitHub HTTP 503 responses and access challenges elsewhere.
An earlier full check incorrectly overlapped the build and saw incomplete generated output; its 43 missing-file results are retained separately from the stable-build verification.

Commit `7081b9a` passed all six deployment and CI checks.
In production, Chrome and WebKit retained the chosen width after reload and restored the desktop size after switching to mobile; Reset returned to the default.
Chrome briefly showed panel overlap while Assistant opened, then settled with a 16px gap.
Evidence: `.local/reviews/deployment-7081b9a-2026-11-18/`.

## 18. Offer a harder follow-up to three introductory exercises

**Status: implemented for review.** The student singled out the scaling contract, release gates and average-versus-tail exercises.
Each now has an optional problem with a self-check that can be solved on paper:

- [Chapter 1](../book/01_establish/01_what_is_scalability.md): choose the missing comparison before recommending a history cap.
- [Chapter 2](../book/01_establish/02_scalable_development.md): trace a second patch through review and decide whether a late test result belongs to it.
- [Chapter 3](../book/01_establish/03_benchmarking.md): compare the dashboard's completed-response p95 with the fraction of all offered requests that met the user's deadline.

The checked exercises and project submission requirements are unchanged.

## Remaining original feedback to review individually

A second pass over the original feedback on 17 November identified the following findings omitted from the initial ledger or not fully answered by its broader tasks.
These are open review items, not accepted feature designs or assertions that the current implementation is defective.
Reproduce each behavior or review the current teaching contract before choosing a change.

| Task | Finding and next check                                                                                                                                                  | Relevant owner                                                                                                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 19   | Check glossary coverage and first-use links for “agent harness” without confusing it with the project's measurement harness                                             | [Chapter 2](../book/01_establish/02_scalable_development.md) and [concept registry](../shared/book-concepts.ts)      |
| 20   | Check the coding loop's explanation of feedback during implementation against a concrete escalation example and actionable stop/ask rule                                | [Chapter 2](../book/01_establish/02_scalable_development.md)                                                         |
| 21   | Explain whether workspace/harness comparisons are conceptual examples or choices needed for the project, connecting them to the supported setup                         | [Chapter 2](../book/01_establish/02_scalable_development.md) and [setup guide](learning-companion-setup.md)          |
| 22   | Review concept-map and release-diagram readability and the request for a coding-loop diagram; task 6's prose examples did not individually settle these visual requests | [Chapter 2](../book/01_establish/02_scalable_development.md) and [concept presentation](../site/scripts/concepts.ts) |
| 23   | Review whether a visual example would make open-loop and closed-loop arrivals clearer                                                                                   | [Chapter 3](../book/01_establish/03_benchmarking.md)                                                                 |
| 24   | Make the first step of the buffer comparison clear while preserving its stated missing reproduction information                                                         | [Chapter 3](../book/01_establish/03_benchmarking.md)                                                                 |
| 25   | Review the background needed before the browser update-strategy demo, separately from its timing and correctness checks                                                 | [Chapter 3](../book/01_establish/03_benchmarking.md)                                                                 |

The kickoff feedback also reported a GitHub OAuth 404.
The anonymous live entry check on 17 November followed Account → GitHub authorization → GitHub sign-in with statuses 302 → 302 → 200, so the reported 404 did not reproduce.
No sign-in, consent or callback was performed; a completed authenticated round trip remains unverified by this check, and no historical cause is inferred.
Sanitized evidence is retained under ignored `.local/reviews/github-signin-2026-11-17/` without OAuth state, cookies or credentials.

## 26. Bring New note context into the visible Notebook area

**Status: open; discovered during task 14's continuity checks on 17 November 2026.** With both panels open at 1280 × 720, choosing **New note** resets the Notebook's scroll position to zero, but the **Note context** section remains below its visible area.
The reduced Chromium/WebKit reproduction measured the Notebook content viewport at y=223.0–341.4 and the context starting at y=343.8/343.7 respectively.
The context is still reachable by scrolling; the existing test expects it to be in view immediately after the action.

The same reproduction on exact revision `727dad2` produced identical geometry, establishing that this predates the exchange preview.
Review the [Notebook presentation](../site/scripts/learning-pane.ts) reset/scroll target and its [workspace layout](../site/styles/learning-workspace.css), including the existing introductory content, before choosing a correction.
Keep the failed assertion; done means the new note's source is visibly presented after the action at this height and compact widths, without losing the independent assistant state or keyboard focus.
The failed continuity run and reduced working-copy/HEAD comparison are retained under ignored `.local/reviews/notebook-exchange-2026-11-17/continuity-diagnosis/`.

## 27. Align the environment sheet's launcher release wording

**Status: open; found during task 16's guidance review.** The [pilot environment sheet](../specifications/course_environment.md#november-2026-pilot-model-assignments-and-setup) still calls the project launcher prepared and says it requires a locally built package until the next release.
The [setup guide](learning-companion-setup.md#start-a-course-coding-project) already identifies the published 0.4.0 launcher.
Check the remaining release-status references and align the student entry instructions with the verified publication; this does not require another package release or model re-verification.

## 28. Make linked setup headings reliably visible

**Status: open; found during task 16's live deployment verification.** Two WebKit cases followed the correct link from the current/archived course introduction to `/notebook/setup/#prepare-a-submission-from-your-notes`, but the target heading remained outside the viewport.
Four later instrumented WebKit cases reached it without a production change, so those passes do not explain the original failures.
The desktop diagnostic also placed the heading at approximately y=0 beneath the sticky header: a viewport-intersection assertion alone missed the occlusion.
The changed wording and correct destinations were verified; anchor placement remains unverified for consistent visibility.

Reduce navigation, load timing and sticky-header positioning against the published assets before choosing a correction.
Done means clicking the links exposes the intended heading after navigation in Chromium and WebKit at desktop and compact widths, without relying only on the URL or DOM presence.
The first failures, screenshots and diagnostics are retained under ignored `.local/reviews/deployment-8c31c37-2026-11-17/`.

## 29. Improve Book and Page navigation access

**Status: open; separated from task 17's Notebook resizing.** The original request was to see Book and Page navigation together and give useful space back to the material.
At 1440 and 1280 pixels the current tabs remained reachable beside Notebook, and pointer/arrow-key switching worked; this establishes operation rather than resolving the extra switching.
At 1024 pixels both lists were in the page flow above the chapter; at 390 pixels navigation began collapsed and the header launchers scrolled away with the page.
Changing Notebook width does not alter those navigation behaviors.

Compare access to another chapter and to a section of the current chapter while reading lower on the page, including a compact viewport and folded desktop navigation.
Review [book navigation](../site/scripts/book-nav.ts), [layout](../site/styles/layout.css) and [responsive styles](../site/styles/responsive.css) before choosing simultaneous lists, a different placement or another access control.
Preserve the reader's explicit collapse preference; do not silently change it when opening Notebook.
The baseline navigation observations and alternative screenshots are retained with task 17's comparison evidence.

## Closing tasks

Keep each item open until its stated observation or acceptance check has been completed.
When closing it, record the change or finding and the verification result here, or move the remaining task into its owning review with a link.
Retain raw screenshots, synthetic browser records and private experiment logs under ignored `.local/`; do not turn real student notes into fixtures.
Once every substantive item is incorporated or moved, retire this ledger according to [the documentation review policy](README.md#retiring-completed-reviews).
