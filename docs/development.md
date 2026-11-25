# Development

This document covers local website development, preview, feedback review, and deployment for the course book.

## Development contracts and decisions

Use [ARCHITECTURE.md](../ARCHITECTURE.md) to find runtime and state owners and [the ADR index](adrs/README.md) for lasting decisions.
Accepted ADRs describe agreed changes awaiting implementation; current course behavior is documented in [course-system.md](course-system.md).
The student-facing contracts in [specifications/](../specifications/README.md) own course requirements.
Update the owning documents in the same change as behavior, and record meaningful architectural choices using the [ADR workflow](adrs/README.md#authoring-and-maintenance).

Before materially expanding a capability, identify its entry point, state authority, public contract, and dependency direction.
Review correctness against a concrete user action and outcome, including relevant failure cases.
For bugs, reproduce and minimize the trigger before fixing the cause; add a regression test when a stable boundary makes it useful.
Prefer tests of observable behavior over checks that repeat private implementation details.

## Engineer the verification loop

Before implementation, state the observable acceptance criteria and one plausible wrong outcome a check should reject.
For a bug, establish a failing reproduction before changing the implementation.
Ground expected results in the owning contract, independently specified examples, or domain invariants; avoid calculating expectations with the same production logic under test.
Review agent-generated checks for shared assumptions and whether they tolerate behavior-preserving changes.
The [book's verification-loop method](../book/04_appendices/A_evaluating_agentic_workflows.md#design-the-verification-loop) explains complementary end-to-end, property-based, and differential checks.

Keep repair runs focused and reproducible with isolated state, controlled external inputs, and recorded random seeds where applicable.
Additional generated-input runs can vary seeds; retain meaningful reduced failures as regression cases.
Preserve the first failure and distinguish product defects from test or environment failures; a passing retry alone does not resolve intermittent behavior.
Run the affected-surface checks below before acceptance, and report unresolved instability or omitted verification.

Review ownership, dependency direction, and maintenance consequences alongside behavioral evidence.
Bind reported checks to the revision and environment they exercised.
Improve the loop when a recurring failure exposes a missing constraint, diagnostic, or check; assess the improvement through accepted outcomes and correction effort.
Use existing tools and scale the evidence to the change, including manual inspection for reversible prose edits.

For work that spans sessions, an optional short handoff can live under ignored `.local/handoffs/`.
Keep only the current objective, relevant revision, unresolved decisions or blockers, next check, and links to authoritative documents or retained evidence.
Recheck those sources when resuming; remove completed entries once the change or owning documentation records the outcome.
This is temporary task context, not a second requirements document or a source of additional authorization.
The [retained-state comparison](../book/04_appendices/A_evaluating_agentic_workflows.md#check-retained-workflow-state) explains how to test whether it reduces repetition without introducing stale assumptions or excessive context cost.

## Verification by change

Use targeted checks during iteration, then verify the affected surface before declaring the change ready.
The following commands use the existing repository tools; they are not new automatic gates.

| Change                                           | Relevant verification                                                                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Internal Markdown documentation and ADRs         | Prettier on changed files; inspect relative links, ADR IDs/status/index, and `git diff --check`.                                                                                     |
| Published book, course briefs, or site templates | `npm run worker:build`, `npm run validate`, and `npm run check:links`; inspect the affected rendered pages.                                                                          |
| TypeScript behavior                              | `npm run types:check` and relevant unit tests, such as `node --test tests/courses.test.ts`; run `npm run test:unit` when shared behavior or a broad change affects multiple suites.  |
| Browser interactions                             | The affected Playwright test, such as `npx playwright test tests/e2e/course-workspace.spec.ts --project=chromium`; include other configured browsers when compatibility is affected. |
| Course persistence or Worker bindings            | The course verification and local Worker checks in [course-system.md](course-system.md#verification).                                                                                |
| Review report tooling                            | `npm run test:review`.                                                                                                                                                               |
| Course workload runner or download               | `npm run test:benchmark`, the build and download inspection; private reference checks and clean-unpack validation follow [the tooling guide](course-tooling.md).                     |
| PDF layout or publication ordering               | `npm run pdf` and inspection of the affected exported pages.                                                                                                                         |

Check formatting with `npx prettier --check <changed-files>` and apply it with `npx prettier --write <changed-files>`.
Use `npm run format:check` for a repository-wide formatting check when appropriate.
Broaden verification when a new failure, dependency, or unresolved concern justifies it; a passing check does not replace reviewing the changed contract.
Record which checks ran and any material limitations in the change description.

### Published link checks

After building, run `npm run check:links` before committing and pushing published content.
Use `npm run worker:build` before validation on a clean checkout: it builds the site and generates the ignored Worker asset manifest needed by type checking.
The checker reads generated HTML, resolves local pages, downloads and anchor fragments against that build, and checks each distinct external HTTP(S) URL with an anonymous GET that follows redirects.
Missing local targets or anchors and external `404`/`410` responses fail the command and identify the referring HTML files.
An absent or empty build also fails.
The checker uses the site's configured domain, so absolute links to our own pages are checked against the candidate build rather than an older deployment.

`npm run validate` includes the local checks without network access; `npm run check:links -- --local-only` runs that part directly.
The explicit `npm run deploy` command runs the full link check before publishing.
[The Published links workflow](../.github/workflows/links.yml) runs on pushes to `main`, pull requests, manual dispatch, and Monday mornings at 05:23 UTC to detect later external link rot.
It builds and validates the candidate revision and retains `.local/link-check/report.json` as a workflow artifact, including results and referring pages.
Repository check requirements and independently configured automatic deployment ordering remain hosting settings; a parallel CI failure alone does not stop an independently started deployment.

External requests have bounded concurrency and timeouts, with one retry for network errors, rate limits, or server errors.
Bot blocks, authentication responses, timeouts, and other non-success responses besides `404`/`410` are reported as **inconclusive**, not silently counted as verified links or treated as proof of a missing page.
The checker identifies confirmed Cloudflare challenges through the documented [`cf-mitigated: challenge` response header](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/detect-response/), regardless of HTTP status.
A plain `403` remains access denied with an unconfirmed cause; the server name alone does not establish bot protection.
Console warnings group inconclusive results by final destination host, status and reason, so a publisher's challenge after a DOI redirect is attributed to the publisher.
The JSON report retains every original URL, final destination, referring page and check result for inspection.
Inspect these warnings and the report when accepting a publication; a challenge is neither retried nor counted as a verified destination.
External fragments, soft-404 pages returning `200`, and whether a working destination supports the surrounding claim still need editorial review.
Run `node --test tests/link-check.test.ts` when changing the checker.

Coding agents must prefix shell commands with `rtk` as specified in [AGENTS.md](../AGENTS.md); use `rtk proxy` when a command needs unfiltered output.

## Website Configuration

The book website is configured through [site.config.jsonc](../site.config.jsonc).
Use the `chapters` list there to choose which Markdown chapters are published; omitted chapters are not generated, which keeps work-in-progress material out of the site.
Use the `parts` list to group the nine course chapters into the three course sections and to collect the optional appendices after them.
Each entry can point at its own Markdown introduction and contain its ordered reading list.
The file supports `//` and `/* ... */` comments.

Markdown source files live under [book/](../book/), with each part intro next to its related chapters.
Appendix source files use an uppercase letter prefix such as `A_topic.md`; the build labels them as appendices and publishes them below `/appendices/`.
HTMLisp templates live under [site/](../site/): page-level templates are in `site/layouts/`, and reusable pieces are in `site/components/`.

Chapter pages show their creation and latest-update dates from Git author history.
The build follows file renames and omits the date row when Git history is unavailable.
If a deployment checkout is shallow, the build fetches the full history before calculating dates.
The build fails if that fetch cannot complete, so it cannot publish misleading dates.

Scientific references live in [bibliography.bib](../bibliography.bib).
Use `:cite[key]` for a parenthetical citation or `:citet[key]` when the authors form part of the sentence, and place `::bibliography[]` under a `## References` heading in each chapter that cites sources.
The build fails when a citation key is missing from the bibliography.

ScholarMark labels follow the block they identify.
Use `::label[id]` after a heading, paragraph, table, or figure and refer to it with `:ref[id]`.
Every book table should place `::caption[Caption text.]` immediately after the GFM table and a unique `::label[table:descriptive-id]` after the caption.
ScholarMark numbers captioned tables and figures within each chapter (for example, `Table 4.2`), attaches the postfix label directly to the semantic block, and supplies its default reference title; the site adds a caption permalink.
Introduce the table with a semantic reference such as `:ref[table:descriptive-id]{text="The table below"}` so prose and anchors stay connected if content moves.

Course brief tables share the spacing, borders, and row styling of captioned book tables, including when the course table has no caption.
Assessment tables give numeric columns room for a single line; compact tables scroll horizontally when needed.
The grade-threshold table uses a compact width and left-aligned percentage ranges, with a narrow right-aligned grade column.
Chapter 3's buffer comparison lets its three short columns fit side by side on a phone so readers can check delivery time and delivery percentage together.

## Course project starter

The optional [student starter](../course-tools/project-starter/README.md) is separate from the book runtime and the short practice labs.
Its three phase directories each run with Node's standard library and have no installation step or shared application dependency.
Use the pinned `.nvmrc` runtime when rehearsing the student setup.

```sh
node --test tests/project-starter-download.test.ts tests/zip.test.ts
cd course-tools/project-starter/projects/01-establish
npm test
npm start
```

Repeat the smoke check in `02-challenge` and `03-compare`.
Build with `npm run worker:build`, then unpack `build/downloads/project/project-starter.zip` into a clean directory outside the repository and run all three copies, including one phase with its siblings absent.
The tests cover the explicit archive boundary, provenance and independent runtime baseline; the smoke checks establish only setup, not application acceptance.
Keep generated rehearsal files under `.local/` or a temporary directory.
Run `npm run validate`, `npm run check:links`, and the affected `tests/e2e/project-specification.spec.ts` browser check for changes to its public download entry.
Inspect the rendered project page and the stub in a browser.
The [tooling guide](course-tooling.md#student-project-starter) owns the distribution and first-session workflow.

## Downloadable labs

The [local practice workspace](../labs/README.md) groups CSV export, concern-directed mutation, persisted retry and HTTP cache under one npm setup and exercise index.
From `labs/`, run `npm ci`, `npm run preflight`, then `npm run lab -- <exercise> <command>`; the index documents available commands and expected initial failures.
`npm run browser:install` installs Chromium only when needed by CSV or cache work.
The common preflight verifies setup only; feature checks are selected per exercise and an unrelated unfinished task must not block the selected one.
Keep specifications, decision notes, fixtures and generated evidence inside each independent exercise directory.

[scripts/lib/lab-downloads.ts](../scripts/lib/lab-downloads.ts) owns archive composition.
The primary `/downloads/labs/course-workspace.zip` contains allowlisted root setup files and the four exercise directories.
The same sources also generate independent `/downloads/labs/<directory-name>.zip` archives; the journey and skill-adoption labs remain separate.
Generated archives are build output and should not be committed.
Transient `.git`, `.lab-data`, `node_modules`, `playwright-report`, `test-results`, `.local`, `.env` and `.env.*` files are excluded.
Do not package solutions or private reference inputs.
Reader material links the primary workspace and source.
Run `node --test tests/lab-workspace.test.ts tests/zip.test.ts` for archive boundaries and selected-command failure propagation, then inspect and clean-unpack the actual build ZIP.
Verify its root `npm ci`, setup preflight and selected exercise checks without depending on this checkout’s install.

For [the CSV starter](../labs/csv-export/README.md), run `npm run preflight` in its directory to check the supplied server independently of the unfinished serializer.
`npm run check` retains preflight, contract and browser logs in ignored `test-results/evidence/`; feature failures are expected in the untouched starter.
Verify the seven contract checks and three browser cases with a completed candidate in a separate clean-unpacked copy, preserving both the initial failures and completed results.
Inspect the ZIP to exclude dependencies, generated evidence and any completed solution; verify its pinned `npm ci` setup outside this checkout.

The [persisted retry starter](../labs/persisted-retry/README.md) uses built-in Node SQLite and has five contract tests plus two actual process cases, including a fresh-key negative control.
The [HTTP cache starter](../labs/http-cache/README.md) has six contract tests and three Chromium cases; its browser baseline passes before implementation while the feature cases fail.
Both expose `preflight` and `check` scripts and retain logs in ignored `test-results/`.
Validate completed clean-unpacked candidates and retain the expected unfinished results separately.
Challenge retry checks with an autocommit-only receiver and HTTP checks with always-200 or no-store responses; do not weaken checks to accept those candidates.
The HTTP browser checks use real cache behavior without request routing/mocks; keep manual preview servers off their test port or use `HTTP_LAB_PORT`.
These optional labs use existing practice time and are independent of the private audit reference.

To keep a block of draft material in a chapter without publishing it, wrap it in a Markdown comment block:

```md
::: comment

## A section still under consideration

This content remains in the source but is omitted from the rendered page and table of contents. :::
```

The opening and closing markers must be on their own lines.
An unclosed comment block causes the build to fail with its starting line number.
Markers inside fenced code blocks are rendered as examples rather than interpreted.

## Local Development

Install dependencies, build the site, and start the local editable server:

```bash
npm install
npm run playwright:install
npm run build
npm run dev
```

The same server exposes public learning retrieval at `http://127.0.0.1:3000/mcp`.
Run `node --test tests/public-mcp.test.ts tests/concept-export.test.ts tests/explorations.test.ts` for the retrieval boundary and current/legacy MCP client checks.
For Worker changes, also run `npm run worker:build` and `npx wrangler deploy --dry-run --outdir .local/mcp-worker-dry-run`; exercise the endpoint through `wrangler dev --local` before deployment.
With a server running, use `node scripts/check-public-mcp.ts http://127.0.0.1:8790/mcp` (or the deployed HTTPS endpoint) to compare three retrieval tasks with the published guide and graph through both protocol eras.
This check makes no model calls and does not evaluate an external agent's teaching behavior.
See [the public tool contract](agent-learning-resources.md#public-mcp-server) and [student setup](external-agent-setup.md).

`npm run dev` serves the site locally at `http://127.0.0.1:3000` with an Edit button on book pages.
In this mode, all Markdown files referenced by `parts` are shown regardless of the `chapters` list in `site.config.jsonc`, so drafts are easy to edit locally.

Development output is kept in `.local/dev-build/<port>/site/`, separate from the production `build/` directory.
The default port therefore uses `.local/dev-build/3000/site/`; previews on different ports have separate output.
Rebuilds use `site.next/` and `site.previous/` within that same port directory and remove them after a successful swap or a failed build.
On the next rebuild after an interrupted swap, the server restores the previous site if necessary and removes stale staging output.
Set `BUILD_DIR` to override the served directory; its `.next` and `.previous` companions follow the same cleanup rules.
You can therefore build or preview the published site without removing draft chapter routes from a running development server.
To clear all default development output, stop the dev servers and remove only `.local/dev-build/`.
Local feedback and saved exercise answers live elsewhere in `.local/` and should be retained.

The development server watches `book/`, `explorations/`, `site/`, `shared/`, `specifications/`, `requirements/`, the site build helpers, `bibliography.bib`, and `site.config.jsonc`.
Saving CSS hot-swaps the generated stylesheets without losing page state.
Markdown, template, configuration, and browser-script changes rebuild the development output and automatically reload the page after the atomic output swap.

The editor writes changes back to the Markdown source files and rebuilds the local static output after saving.
The editor uses EasyMDE for Markdown editing, preview, side-by-side view, and fullscreen mode.

For a read-only static preview, use:

```bash
npm run serve
```

The production build emits a static site to `build/` for `scalableweb.dev`.
The deployed site remains read-only because the editing API exists only in the local dev server.

### Chapter navigation

The [chapter navigation](../site/components/BookNavigation.html) contains the chapter list and the current page's outline in one native disclosure.
On wide screens both lists scroll independently in the sidebar.
Folding the sidebar gives figures and demos more room.
The [navigation script](../site/scripts/book-nav.ts) remembers the reader's desktop fold choice across chapters.
At 76rem and below, **Navigation** opens the same lists from a button in the lower left.
When a learning tool occupies the bottom of a phone screen, the button sits just above it.
Opening navigation keeps the learning tool available after a section is selected.
Following a section link closes the panel and moves keyboard focus to its heading.
Escape returns focus to **Navigation**.
With JavaScript disabled, the native disclosure and both sets of links still work.
The [shared layout](../site/layouts/BaseLayout.html) disables smooth scrolling on pages with book navigation when JavaScript is disabled.
This lets a reader follow a second section link immediately, even after opening a deep link near the end of a chapter.
The [outline](../site/scripts/toc-highlight.ts) marks the current section as the reader scrolls.
Any scrolling needed to reveal the active link belongs to its own list.
Run `npx playwright test tests/e2e/toc-highlight.spec.ts` for the chapter and section journeys, including keyboard and native disclosure use.
The native keyboard check opens the chapter at **Summary**, selects **Four pressures organize the course** and checks that the heading is on screen with both default and reduced motion.

### Course diary starter

To evaluate a change, run `npm run dev` and open `/diary/`.
Download the ZIP and open its extracted **Course diary** folder as a fresh Obsidian vault.
Test the plain Markdown walkthrough first, then enable the bundled community plugin and try its commands.
Use synthetic writing.
Check that the selected passage reopens its book section and that the portfolio draft contains only the chosen excerpt.
The [student guide](course-diary.md) describes each action.
The build reads the five numbered notes from `docs/diary-pilot/` and the plugin from `packages/obsidian-course-diary/`.
Download contents and plugin behavior have focused tests in the unit suite. [ADR-066](adrs/implemented/ADR-066-keep-course-diaries-in-obsidian.md) records ownership and recovery.

### Setup guide layout

The standalone `/diary/`, `/agents/` and `/notebook/setup/` pages use the centered `.guide-main` container and shared `.prose` typography.
Keep code blocks and tables within that reading column at wide and narrow widths.
The guide's minimum inline gutter reserves room for hanging heading links and their keyboard focus outlines.
Long prose links can wrap within the guide's reading column.
The guides should avoid document-level horizontal scrolling; long code remains scrollable inside its own block.
Run `npx playwright test tests/e2e/book-layout.spec.ts --project=chromium --grep 'setup guides'` for the focused layout regression.

Links to guide headings should land with the whole heading visible.
The heading's scroll margin leaves room for the sticky site header, including the extra row its controls can occupy on narrower screens.
On phones the header scrolls away with the page.
The shared reduced-motion rule uses a zero transition duration.
A positive duration, even 0.01ms, lets WebKit measure an intermediate layout when following a fragment on a fresh page.
Run `npx playwright test tests/e2e/setup-guide-navigation.spec.ts` to follow the submission walkthrough links from both editions of the course introduction in Chromium and WebKit.

### Compact site header

At 48rem and below, the book title and primary navigation share a row when there is room.
On a narrower phone the title gets its own line.
The next row groups Cockpit, Diary, Teaching assistant, Account, Theme and any available Tools in keyboard order.
The controls can wrap and their labels stay visible.
The compact homepage checks in [the theme browser suite](../tests/e2e/theme-initialization.spec.ts) cover the 390-pixel height budget, keyboard access and theme selection.

### Homepage project cards

The two [homepage cards](../site/layouts/siteIndex.html) stack the heading, description and link at widths up to 48rem.
Above that width, the heading and description share the space left by the link so its label and arrow fit inside the card.
Run `npx playwright test tests/e2e/book-layout.spec.ts --grep 'homepage project links'` to check both sides of the layout change.

### Theme initialization

The shared layout runs [the inline theme bootstrap](../scripts/lib/theme-bootstrap.ts) before loading stylesheets.
It selects a configured saved theme, or falls back to the system color preference when storage is unavailable or the saved value is invalid.
It also sets the initial browser color scheme and keeps it through slow stylesheet loads.
The deferred `theme.js` bundle connects the picker and site tools; changing the picker hands the color scheme back to CSS.
Keep theme selection ahead of styles and page content so dark readers do not see a light frame while scripts load.
Both the document root and body use the theme background, including during navigation transitions.

[The theme initialization browser tests](../tests/e2e/theme-initialization.spec.ts) delay the deferred bundle and inspect the first rendered frames in Chromium and WebKit.
They also delay stylesheets and check link navigation, system defaults, saved overrides, unavailable storage, and picker changes after startup.

### Asset URLs and caching

Production builds publish compiled site CSS and JavaScript with a content hash in the filename, such as `/styles.0123456789abcdef.css`.
The hash uses the first 16 hexadecimal characters of SHA-256 over the emitted bytes; unchanged assets keep the same URL across builds.
The build resolves base-layout and page-specific references through [the asset registry](../scripts/lib/site-assets.ts), and injects the published orchestration bundle URL into its lazy loader before hashing the loader.
Compile dependencies before their loaders and register new assets before rendering pages that reference them.

The Worker gives fingerprinted CSS/JS a one-year `immutable` browser cache lifetime.
HTML and stable CSS/JS URLs use `public, max-age=0, must-revalidate`, retaining ETags for conditional requests.
Stable asset copies remain available for older HTML and direct links; new pages use the fingerprinted URLs.
Previously cached stable assets cannot have their old browser headers revoked, but loading current HTML selects the new URLs.
Each deployment contains its current fingerprints; a page left open across a deployment may need reloading if it subsequently requests a removed lazy bundle.

Editable builds retain stable filenames so CSS hot reload can replace the existing stylesheet URLs.
The pinned exporter owns `/learn/pilot/` asset names and references; its existing revalidation policy still applies.
The publishing decision and verification boundaries are recorded in [ADR-025](adrs/implemented/ADR-025-fingerprint-published-site-css-and-javascript.md).

## Browser support

The interactive site targets Chrome and Edge 111+, Firefox 121+, and Safari/iOS Safari 16.4+.
Use a current browser for ordinary course work.
These explicit floors replace the former Safari 13 declaration, which did not match the site's JavaScript, DOM or CSS requirements.
There are no existing course runs requiring that older baseline.

`package.json` owns the version floors in `browserslist`.
[The target adapter](../scripts/lib/browser-targets.ts) converts those explicit minimum queries to Vite/Oxc targets for every site-owned script and bundle, including the course, learning and lazy orchestration bundles.
Moving queries such as `defaults` are rejected so a dependency update cannot silently change the contract.
Build targets transform syntax; they do not polyfill built-ins, DOM APIs or CSS.
Review those separately before adopting a newer feature or dependency.
The current baseline accommodates dialogs, `crypto.randomUUID()`, `.at()`, `.replaceAll()`, copy-array methods, `color-mix()`, dynamic viewport units and `:has()`.
CSS is emitted without downlevel transformation, and the separately pinned self-study exporter owns `/learn/pilot/` assets.

Run the target regression and affected browser journeys with:

```bash
node --test tests/browser-targets.test.ts
npx playwright test tests/e2e/browser-compatibility-demo.spec.ts tests/e2e/orchestration-demo.spec.ts tests/e2e/course-workspace.spec.ts tests/e2e/account-learning.spec.ts tests/e2e/learning-workspace.spec.ts --project=chromium --project=webkit
```

The compatibility check parses emitted root and `vendor/` JavaScript, including lazy dependencies, and rejects selected post-baseline features with negative controls.
It is a bounded regression guard, not a complete API/CSS compatibility audit.
The runtime journeys use the installed Playwright Chromium and WebKit; they do not run historical minimum versions, branded Safari/iOS or Firefox.
Passing them must not be reported as minimum-version certification.
[ADR-056](adrs/implemented/ADR-056-align-browser-support-with-site-requirements.md) records the baseline rationale and evidence.

### Browser-to-companion connection

The site baseline does not establish support for the optional HTTPS-site connection to the HTTP loopback companion.
The student path currently uses Chrome on the same computer, with local-network access allowed when requested.
Safari is not supported for this connection; this restriction does not change the reading or online course baseline.
See [the setup guide](learning-companion-setup.md#browser-connection-support) for recovery without moving the notebook.

On 17 November 2026, Safari 27.2 on macOS failed to connect from the deployed HTTPS site before any request reached the companion, while the same browser connected and saved a synthetic note from an allowed local HTTP site.
Playwright WebKit reproduced the live failure and explicitly reported blocked mixed content.
Chrome 157.0.8103.79 and Playwright Chromium 148.0.7778.96 connected, saved and reopened synthetic notes through the deployed site with local-network permission granted.
These results are consistent with [WebKit's open loopback mixed-content issue](https://bugs.webkit.org/show_bug.cgi?id=171934); they do not certify historical Safari versions or iOS.
The separate `doctor` command checks local prerequisites, not browser network policy.

Run the browser-origin regression with:

```bash
npx playwright test tests/e2e/learning-https-companion.spec.ts --project=chromium
```

It fulfills only website assets at a synthetic HTTPS origin and uses the real HTTP companion for connection, saving, disconnecting and reconnecting, with explicit local-network permission.
This checks browser origin policy and the production client/server boundary; it does not test TLS certificates, the deployed host or Safari.
For release verification, also rehearse the deployed HTTPS site with normal browser security, a disposable notebook and no model provider, recording the actual browser version and permission state.
The routine HTTP-only journeys cannot replace that check.

Run all configured browser-level checks with:

```bash
npm run e2e
```

## Course workspace

The course submission and assessment workspace runs at `/course/` and `/admin/courses/`.
It includes course rosters, phase groups, frozen source archives, assigned audits, private portfolios, rubric assessment and grade export.
Local records persist separately in `.local/course.sqlite` and `.local/course-files/`.
See [course-system.md](course-system.md) for the instructor workflow, access rules, production bindings and verification commands.
Published requirements are pinned by run; use [requirements/README.md](../requirements/README.md) when changing course briefs or the authored submission checklist.
The build rejects drift from the current archived requirement edition.
Teacher simulation uses the shared interface with separate adapters and a persistent indicator; local records live in `.local/course-simulation/`.
See [the simulation guide](course-system.md#teacher-simulation) for manual controls, scoped mock login/clock/reset, Worker resource markers and the dedicated local binding check.
Compact/larger preparation and grading-review presets use versioned synthetic fixtures; see the guide for expected outcomes, interrupted preparation, the complete three-phase teaching walkthrough and the remaining withdrawal scenario.
Run `npx playwright test tests/e2e/course-simulation-walkthrough.spec.ts --project=chromium` to verify creation, grouping, all submission/audit/portfolio phases, assessment, release and marked final export through the instructor/student interface.

## Learning companion

The website's Account dialog uses `/api/account/status`, with the same verified-session projection in local development and the Worker.
`shared/site-account.ts` owns exercise identity selection; keep existing GitHub/local keys and email course namespaces consistent between adapters.
Development honors explicit test identity overrides for both account status and exercise routes; those headers remain unavailable in the Worker.
Run `node --test tests/site-account.test.ts tests/learning-auth.test.ts tests/course-auth.test.ts tests/course-mail.test.ts` for account/return-context boundaries, and `npx playwright test tests/e2e/account-learning.spec.ts tests/e2e/chapter-exercises.spec.ts tests/e2e/course-email-signin.spec.ts` for the connected browser journeys.
The new account journey runs in Chromium and WebKit, including an actual companion, cross-tab email confirmation and reviewed exercise context.
Use a fresh `E2E_LOCAL_DATA_DIR` when testing synthetic enrollments; retained simulation directories must not be relabeled or deleted to bypass isolation checks.

Run `npm run companion -- --origin http://127.0.0.1:3000` for the optional teaching assistant or Notebook recovery service beside the development website.
Only `https://scalableweb.dev` is trusted by default; specify exact development origins explicitly.
It stores records under `.local/learning-companion/`, independently of the development server's course and feedback data.
See [the learning-workspace guide](learning-workspace.md) for code-free connection, exact origins, portability and the current implementation boundary.
Use `npm run companion -- --codex --origin http://127.0.0.1:3000` for the optional first provider after following [the dedicated-profile setup](learning-companion-setup.md).
For direct local models, load a language model in LM Studio and use `npm run companion -- setup --local --model <exact-model-id>`, then start with the required `--origin`.
Local mode defaults to discussion-only; `--local-url`, `--local-context` and `--local-tools none|native` configure the explicit loopback provider.
The CLI also supports `setup`, `login`, `logout`, `doctor` and `migrate`; for example, `npm run companion -- setup --codex` creates the development profile before `npm run companion -- login`.
Run `npm run companion -- setup` in a terminal for guided notebook, Codex ChatGPT/API-key, direct API or local-model setup.
Setup retains the chosen `--origin` and `--port` for subsequent startup and diagnosis; explicit startup flags override the saved values without changing them.
Direct API setup offers OpenAI, Anthropic, Gemini and OpenRouter presets, plus an explicit compatible HTTPS endpoint; see [API key setup](learning-companion-setup.md#use-an-api-key).
Keys are entered in a hidden terminal prompt, piped with `--with-api-key`, or referenced by `--api-key-env`; never put key values in arguments.
Saved API keys use the OS credential store through pinned `@napi-rs/keyring`; Codex explicitly uses its own keyring credential store.
Linux API storage requires an available Secret Service session; there is no transient keyutils or plaintext-file fallback.
For headless/API environments, explicitly select `--api-key-env`; notebook-only, local-model and environment-backed API use do not load the native keychain module.
Directory migration retains API credential identity and transcripts while excluding Codex `auth.json` files at every depth; moved Codex profiles and another computer require login.
The [student guide](learning-companion-setup.md#use-an-api-key) owns keychain setup, recovery and local logout instructions.
The API model catalog check does not establish inference access or generate a paid reply.
Focused API/authentication checks are `node --test tests/learning-api.test.ts tests/learning-api-credentials.test.ts tests/learning-codex-login.test.ts tests/learning-cli.test.ts`.
The CLI suite includes a synthetic terminal setup journey using Python 3's standard `pty` module on macOS/Linux; automatic checks use synthetic provider responses and injected credential stores, never personal keychain entries.
Native keychain smoke checks, when run, must use a fresh isolated service/account and synthetic value, verify readback/removal and retain their platform-specific limits; they do not verify provider inference.
Focused checks are `node --test tests/learning-notebook.test.ts tests/learning-companion.test.ts tests/learning-agent.test.ts tests/learning-storage.test.ts tests/learning-client.test.ts tests/course-inquiry.test.ts`.
Run `npx playwright test tests/e2e/learning-workspace.spec.ts tests/e2e/learning-onboarding.spec.ts tests/e2e/learning-demo-bridge.spec.ts tests/e2e/learning-peer-inquiry.spec.ts` for read-only Notebook exports, packed-release onboarding, declared demo controls and course-backed peer inquiry in Chromium/WebKit.
The opt-in real-provider check and voluntary learner evaluation are documented in [the workspace guide](learning-workspace.md#verification).

### Course project launcher

The terminal launcher in companion 0.4.0 wraps the course harness with a verified 0.154.0 fallback; it does not add project execution to browser study messages.
From the checkout, use `npm run companion -- project` for guided phase and workspace selection.
Use `npm run companion -- project establish --workspace /absolute/project/path --print` to inspect the selection policy and conditional commands without probing Codex, creating files, reading credentials, installing a harness or contacting the model.
`--check` runs the disposable tool check and stops; normal launch reuses a successful check for the same configuration, actual executable source/path/version, runtime and fixture version.
Unlike `doctor`, this preflight deliberately generates model responses.
An installed version that passes the minimum-version gate must still pass the phase check; failures retain evidence and stop without an automatic fallback and model retry.
Use `--managed-codex` to explicitly select the private pinned baseline for a subsequent run.

The launcher stores project state beside the selected companion directory, in `<directory>-projects`, with its own lease so the book companion can keep running.
`learning-project-config.ts` bundles the phase configuration and check fixtures; package runtime must not read a checkout-only documentation path.
`learning-project-codex.ts` selects the first executable `codex` on `PATH` only when its credential-free version probe reports a stable version at least 0.154.0.
Missing, older, prerelease, unparseable or failed candidates use the private pinned 0.154.0 fallback; no global installation is changed.
Version probes use the isolated `harness-probe/` directory; installed CLI profiles append `-installed-<version>` to the existing phase profile name, preserving the fallback profile.
`learning-project-process.ts` installs the pinned CLI privately with npm lifecycle scripts disabled and a credential-free environment, verifies its version and launches the exact installed entry.
Only the coding process receives the Aalto key, and its configuration excludes that key from ordinary shell tools.
`learning-project.ts` owns the prompt/explicit-option flow, profile preservation, credential lookup and launch; keep it independent of notebook settings and the browser tool broker.
`learning-project-preflight.ts` owns disposable execution, worker-session inspection and success/failure receipts.
`learning-project-boundary.ts` rejects Codex-loaded project configuration from the workspace through the nearest valid `.git` root, following the pinned CLI's default discovery; `AGENTS.md` discovery remains available.
The profile validator accepts only the exact course settings plus strictly parsed Codex project trust records, so ordinary trust decisions can persist without admitting changed model or execution settings.

Run `node --test tests/learning-project*.test.ts` for launcher and process behavior, followed by `npm run companion:pack` and `npm run companion:check` against the distributed artifact.
Verify installed-version selection and fallback, credential-free probes, distinct installed profiles, forced managed selection, changed profiles, failed or tampered checks and interrupted processes through observable launch/refusal behavior; automatic checks use synthetic commands and credentials.
Check that receipts identify the actual executable and that a failed installed-harness preflight cannot trigger another model run through the fallback.
For a live Aalto check, use synthetic inputs, the assigned model, a disposable workspace and an explicit environment reference or endpoint-bound keychain entry; retain first failures and inspect actual worker output for Compare.
Do not claim real-model, platform or package verification from a printed plan alone.
The [student guide](learning-companion-setup.md#start-a-course-coding-project) starts with the published 0.4.0 command and includes checkout usage.

### Learning cockpit and reading investigations

For shared learning loops, run `node --test tests/reading-investigation.test.ts` and `npx playwright test tests/e2e/reading-investigation.spec.ts tests/e2e/learning-cockpit.spec.ts --project=chromium --project=webkit`.
The cockpit checks exercise every authored demo snapshot, source-scoped reading/reflect/revisit continuity, reviewed diary downloads and checked-exercise handoffs, lazy entry points, accessibility and compact dark presentation.
Run `npx playwright test tests/e2e/learning-tutorial.spec.ts --project=chromium --project=webkit` for skippable/replayable first-use guidance, independent drafts, unavailable storage, compact dark accessibility and a local Markdown download.
The tutorial's example reply is authored; these checks assert no model calls and distinguish preparing a draft from saving a note.
Use a fresh `E2E_LOCAL_DATA_DIR` for synthetic browser records.
The browser check runs an actual companion and synthetic local model, checking submitted activity context rather than model teaching quality.
Manually test with an enabled provider before reporting an actual generated explanation; restart an older companion so authenticated status advertises `learning-loop` and every demo activity version.
See [the inline activity contract](learning-workspace.md#explore-an-idea-in-the-reading) for the state and observation boundaries.

### Build and release the standalone package

`packages/learning-companion/` owns `@scalableweb/companion`; its executable is `scalableweb-companion`.
The package is built from the same CLI, notebook, conversation, provider and authored-resource modules as the repository command.
Its per-user default is independent of the repository's development directory.
The package declares pinned `@napi-rs/keyring` as a runtime dependency, with its matching platform-native package installed by npm; its own `files` allowlist includes only the launcher, compiled module, release metadata, README and license.
The native binding stays external to the bundled CLI and is loaded lazily; package checks must inspect the actual installed dependency, not rely on the checkout's `node_modules`.

```sh
npm run companion:pack
npm run companion:check
```

The first command bundles the runtime and records its Git revision in `packages/learning-companion/dist/release.json`, then writes `.local/companion-release/scalableweb-companion-<version>.tgz`.
Both generated locations are ignored.
Dirty builds are marked explicitly and are useful for iteration; publish only from a clean committed revision.
The checker installs that tarball into a clean temporary directory, uses an isolated per-user home, launches without this checkout's dependencies and verifies retained notes across working directories, code-free connection and prerequisite failures.
The checker also runs the CLI authentication, hidden terminal setup and synthetic API conversation contracts against the installed launcher; these checks require Python 3 on macOS/Linux.
The onboarding browser check also installs the actual tarball, so pack it before running that test.

[The package workflow](../.github/workflows/learning-companion.yml) runs focused tests, packing and clean installation on macOS/Linux with Node 24/26.
Wait for all declared matrix jobs to pass before claiming platform support or publishing.
The verified Codex adapter currently requires CLI 0.154.0; provider verification uses a real separately authenticated profile, while automatic jobs use synthetic records without credentials.
Local provider tests run with `node --test tests/learning-local.test.ts`; `companion:check` verifies setup, discussion and restart from the actual tarball.
Build the companion first, then run `npx playwright test tests/e2e/learning-local-model.spec.ts` for packed-runtime capability/provenance and actual browser observation/declined/approved changes in Chromium and WebKit.
The model responses in that browser check are synthetic; [the evaluation guide](learning-workspace-evaluation.md) owns the real LM Studio/Gemma teaching review and its limits.
To verify a freshly installed tarball, set `LEARNING_COMPANION_BIN` to its launcher and `LEARNING_CODEX_HOME` to its dedicated authenticated profile when running the opt-in browser check.

Companion uses browser protocol 2 for code-free connection.
The browser and setup guide switch to a published version only after registry availability and the distributed-artifact checks are verified.
For an isolated iteration artifact, set `COMPANION_CHECK_ARTIFACT` to its absolute path in both the checker and onboarding browser test.
The publisher is bebraw, with access to the `scalableweb` npm organization.
From a clean `main`, select the next version and run the complete publication command:

```sh
npm run companion:release -- 0.4.0
```

The explicit version updates the package manifest, shared release metadata and pinned package README commands, commits only those version changes, pushes `main`, and continues through publication.
Repeating the same version resumes it without another bump or version commit.
It rejects a dirty checkout, an older version or an already published new target before editing files.
If the version is already prepared and pushed, omit the argument: `npm run companion:release`.

Use Node.js 24 or 26, Python 3, Git, npm and an authenticated GitHub CLI (`gh auth login`).
The package manifest and `shared/learning-connection.ts` must agree on the prepared version.
It checks that both versions agree and the current commit is the remote `main`, builds and tests the tarball, waits for the four source-package jobs, completes npm login when needed, publishes that exact artifact, verifies the downloaded registry bytes, and waits for all four published-package jobs.
If no source workflow exists for that commit, it starts one; a failed job stops publication.
Npm retains its normal browser/2FA prompts, so run the command in a regular interactive terminal.
The helper does not read or save authentication tokens.

For a rehearsal of the current revision that builds and checks the package without login, publication or workflow dispatch:

```sh
npm run companion:release -- --dry-run
```

Add a version to `--dry-run` to preview its preparation without editing, committing or pushing it.
An already published current version can be built and checked in dry-run mode; this does not authorize publishing replacement bytes.
Interrupted releases resume by rerunning the same explicit version from the same clean revision.
The ignored `.local/companion-release/` receipt records the source commit, artifact integrity and exact workflow IDs; keep it with the tested tarball until the release is verified.
If npm accepted a publish before the terminal lost its response, matching registry integrity lets the command continue without publishing again.
A different artifact already published under that version, changed source, a modified tarball or an unknown registry response stops the command with recovery guidance.
If a workflow dispatch loses its response before returning a run ID, the receipt records that uncertainty and requires inspection of GitHub Actions before retrying; the command does not guess a run or dispatch another automatically.
For a failed matrix, inspect the linked run, rerun it in GitHub after addressing the failure, and rerun the release command.
The helper will not move the `latest` tag backwards or choose a replacement version automatically.

The package workflow accepts paired `release-version` and `release-integrity` inputs for published verification.
It checks them against the checked-out version and the actual downloaded tarball before running installation tests.
This matters because source-built tarballs can have different bytes across build installations; the published matrix verifies the exact distributed artifact.
The unit checks for release orchestration use synthetic npm/GitHub responses and temporary files, never a real publication.
Run `node --test tests/learning-release.test.ts` when changing the release owner.

Choose the version explicitly; the command never guesses a patch, minor or major increment.
Commit substantive changes and explain protocol/schema/provider changes before running it.
If a version commit or push fails, its changes remain available for inspection; the command does not roll back or force-push.
Website announcements remain reviewed source changes.
The command does not certify real-provider behavior: complete the provider smoke tests described above before release.
Once the published checks pass, record their source revision, integrity and workflow evidence in ADR-030 and update the website's pending-publication wording and student commands.
These website changes follow the normal commit, deployment and live-verification process.

For manual recovery, the existing `companion:pack` and `companion:check` commands remain available.
Publish an explicitly verified tarball using `npm publish ./.local/companion-release/scalableweb-companion-<version>.tgz --access public --registry=https://registry.npmjs.org`.
See [npm publishing](https://docs.npmjs.com/cli/v11/commands/npm-publish/) for its authentication flow.
Staged publishing is a separate optional npm feature; this release command uses direct publishing.

## Feedback Review

The [book backup and recovery runbook](backups.md) covers production feedback, exercise answers, and local-only project data.

The deployed Worker supports private paragraph-level feedback when `COMMENTS_KV` and GitHub OAuth are configured.
Students sign in with GitHub, use the paragraph comment control, and post comments.
The feedback sign-in button opens the shared Account view; reader feedback continues to use its GitHub identity, independently of a course email session.
Signing out through Account clears feedback controls and refreshes their GitHub status in place.
Students see only their own comments and admin replies to those comments.
Admin users listed in `ADMIN_GITHUB_LOGINS` can see all comments, reply to comments, resolve comments, hide comments that should not be shown back to students, and feature curated reader notes publicly.
Admins can open `/admin/feedback/` (or choose `Review all` from a chapter's feedback controls) to search and filter feedback from across the whole book.

The [private feedback MCP](feedback-setup.md#private-feedback-mcp) gives the configured book owner access from Codex, with issue resolution enabled explicitly on the credential.
Run `node --test tests/feedback-mcp.test.ts tests/public-mcp.test.ts` to check private authorization, issue retrieval and resolution, and the independent public endpoint with synthetic records.

Local editing stores feedback data in `.local/comments.json`.
To review production feedback locally, pull from Cloudflare KV first:

```bash
npm run comments:pull -- --namespace-id <comments-kv-namespace-id>
npm run dev
```

After replying, featuring, resolving, or hiding comments locally, push the moderation state back to KV:

```bash
npm run comments:push -- --namespace-id <comments-kv-namespace-id>
```

`comments:push` only copies local moderation fields and admin replies to matching remote comments.
It does not overwrite comment bodies or delete comments. `comments:sync` runs push first, then pulls the latest KV state back into `.local/comments.json`.

Feedback setup details are in [feedback-setup.md](feedback-setup.md).

## Cloudflare Worker

The site can be deployed through Wrangler as a Cloudflare Worker with static assets bound from `build/`:

```bash
npm run worker:build
npm run preview:worker
npm run deploy
```

`worker:build` generates the static site and a small asset manifest for the Worker. `preview:worker` runs that production-style Worker locally through Wrangler; unlike `dev`, it does not provide the local Markdown editor. `deploy` publishes [worker/index.ts](../worker/index.ts) using [wrangler.jsonc](../wrangler.jsonc).
