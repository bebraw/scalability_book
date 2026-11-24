# Modern Web Guidance – Treating current knowledge as a tested dependency

A developer asks a coding agent to add a logout confirmation.
A click outside the dialog should dismiss it.
A click on the question inside should leave it open.
An agent can produce a convincing dialog and still get the second click wrong.
How would we tell whether giving the agent a guide helped?

This is one of the tasks in Modern Web Guidance, a collection of web-platform guides for coding agents.
The project released version 1.0 on 10 November 2026, with participation from the Chrome, Edge, and Firefox teams.
Its maintainers publish both the guidance and the checks they use to judge its effect. [Release announcement](https://developer.chrome.com/blog/modern-web-guidance-v1)

## From a search result to a browser decision

The agent searches for a behavior and retrieves a guide by its identifier.
A developer can inspect the same search results and guide before installing the skill.
This lets a project draw on a changing collection while bringing only the relevant material into the task. [Search and retrieval](https://developer.chrome.com/docs/modern-web-guidance/get-started#explore-before-installation)

For the logout dialog, the guide recommends opening a native `<dialog>` with `showModal()` and setting `closedby="any"` so the browser handles dismissal.
Whether the team can rely on that attribute depends on the browsers its readers use.
The project can declare a Baseline target in its agent instructions.
Modern Web Guidance defaults to Baseline Widely available.
For browsers without the attribute, the guide shows how to distinguish a click on the backdrop from one inside the dialog.
Both paths should produce the same result for the reader. [Dialog guide](https://github.com/GoogleChrome/modern-web-guidance-src/blob/888035b5f606f5366e6c9226e6782ce49af83a6f/guides/ui-behaviors/light-dismiss-a-dialog/guide.md) · [Browser support policy](https://developer.chrome.com/docs/modern-web-guidance/get-started#baseline)

## The guidance has an evaluation loop

The maintainers can run the same task from the same starting application with and without access to the guidance.
They calibrate the task checks against implemented solutions and the unmodified application.
In their published 20 November run, Codex using GPT-6.1-Sol passed 49% of the checks without guidance and 85% with it.
The run covered 229 tasks and 1,961 checks.
The 36-percentage-point gain describes what those checks rewarded. [Evaluation method and dated results](https://github.com/GoogleChrome/modern-web-guidance-src/blob/888035b5f606f5366e6c9226e6782ce49af83a6f/README.md#recent-eval-results-snapshot)

The dialog guide's own grader shows why the distinction matters.
One check clicks a heading or paragraph inside the open dialog and observes that it stays open.
Another looks for `getBoundingClientRect` and `.close()` in the page's script text as evidence of a fallback.
Both strings could be present in a handler that never runs.
Try three clicks in a browser that needs the fallback.
The question and the empty padding around it should keep the dialog open.
Only the backdrop should dismiss it. [Dialog grader](https://github.com/GoogleChrome/modern-web-guidance-src/blob/888035b5f606f5366e6c9226e6782ce49af83a6f/guides/ui-behaviors/light-dismiss-a-dialog/grader.ts)

## Field note — Updating the guide in Vibe Template

I adopted the guidance in Vibe Template so an agent facing a browser decision could look up the relevant feature.
The upstream installer can update the guidance automatically.
I wanted to be able to tell which advice an agent had received, so the template pins the reviewed release and disables telemetry. [Original integration decision](https://github.com/bebraw/vibe-template/blob/4428c4351b98769c4ba839d55bc32672ffe02c8b/docs/adrs/implemented/ADR-052-adopt-scoped-modern-web-guidance.md)

The upgrade to 1.0.0 offered a way to check that decision.
The release added a scanner for older web patterns.
During the upgrade, a test form that marked required fields invalid before the user had interacted with them produced the expected finding.
The template uses the scanner for explicit modernization reviews.
A maintainer can keep a flagged fallback when the project's browser policy still calls for it. [November upgrade and verification](https://github.com/bebraw/vibe-template/blob/a6800aee4ca7e400ee839e5346ca4a4a047d7e6e/docs/adrs/implemented/ADR-072-adopt-modern-web-guidance-v1.md)

That test establishes that the scanner can find the example we gave it.
Whether the guide improves a change in the template remains an open question.
For the next browser change, keep the task, supported browsers, and acceptance checks fixed.
Give one run the pinned guide and compare the behavior a reader can actually exercise.
