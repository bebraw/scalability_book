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
Inspect these warnings and the report when accepting a publication.
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

## Downloadable labs

Standalone source exercises live in one directory per lab under [labs/](../labs/).
Each lab should contain a README that states how to run or study it, what its evidence establishes, and what remains outside its scope.

The site build packages every lab directory as `/downloads/labs/<directory-name>.zip` with the directory itself as the archive root.
Generated archives are build output and should not be committed.
Transient `.git`, `node_modules`, `playwright-report`, and `test-results` directories and `.DS_Store` files are omitted automatically.
Reader material should normally offer both the repository source and the generated download so students can inspect before downloading.

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

### Setup guide layout

The standalone `/agents/` and `/notebook/setup/` pages use the centered `.guide-main` container and shared `.prose` typography.
Keep code blocks and tables within that reading column at wide and narrow widths.
Run `npx playwright test tests/e2e/book-layout.spec.ts --project=chromium --grep 'setup guides'` for the focused layout regression.

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

Run browser-level checks with:

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
The new account journey runs in Chromium and WebKit, including an actual notebook-only companion, cross-tab email confirmation, reviewed exercise context and retained private writing.
Use a fresh `E2E_LOCAL_DATA_DIR` when testing synthetic enrollments; retained simulation directories must not be relabeled or deleted to bypass isolation checks.

Run `npm run companion -- --origin http://127.0.0.1:3000` for the optional local private notebook service beside the development website.
Only `https://scalableweb.dev` is trusted by default; specify exact development origins explicitly.
It stores records under `.local/learning-companion/`, independently of the development server's course and feedback data.
See [the learning-workspace guide](learning-workspace.md) for code-free connection, exact origins, portability and the current implementation boundary.
Use `npm run companion -- --codex --origin http://127.0.0.1:3000` for the optional first provider after following [the dedicated-profile setup](learning-companion-setup.md).
For direct local models, load a language model in LM Studio and use `npm run companion -- setup --local --model <exact-model-id>`, then start with the required `--origin`.
Local mode defaults to discussion-only; `--local-url`, `--local-context` and `--local-tools none|native` configure the explicit loopback provider.
The CLI also supports `setup`, `login`, `doctor` and `migrate`; for example, `npm run companion -- setup --codex` creates the development profile before `npm run companion -- login`.
Focused checks are `node --test tests/learning-notebook.test.ts tests/learning-companion.test.ts tests/learning-agent.test.ts tests/learning-storage.test.ts tests/learning-client.test.ts tests/course-inquiry.test.ts`.
Run `npx playwright test tests/e2e/learning-workspace.spec.ts tests/e2e/learning-onboarding.spec.ts tests/e2e/learning-demo-bridge.spec.ts tests/e2e/learning-peer-inquiry.spec.ts` for the notebook, packed-release onboarding, all declared demo controls and course-backed peer flow in Chromium/WebKit.
The opt-in real-provider check and voluntary learner evaluation are documented in [the workspace guide](learning-workspace.md#verification).

### Learning cockpit and reading investigations

For shared learning loops, run `node --test tests/reading-investigation.test.ts` and `npx playwright test tests/e2e/reading-investigation.spec.ts tests/e2e/learning-cockpit.spec.ts --project=chromium --project=webkit`.
The cockpit checks exercise every authored demo snapshot, source-scoped reading/reflect/revisit continuity, selected-note and checked-exercise handoffs, lazy entry points, accessibility and compact dark presentation.
Run `npx playwright test tests/e2e/learning-tutorial.spec.ts --project=chromium --project=webkit` for skippable/replayable first-use guidance, independent drafts, unavailable storage, compact dark accessibility and an actual notebook-only companion's reviewed save path.
The tutorial's example reply is authored; these checks assert no model calls and distinguish preparing a draft from saving a note.
Use a fresh `E2E_LOCAL_DATA_DIR` for synthetic browser records.
The browser check runs an actual companion and synthetic local model, checking submitted activity context rather than model teaching quality.
Manually test with an enabled provider before reporting an actual generated explanation; restart an older companion so authenticated status advertises `learning-loop` and every demo activity version.
See [the inline activity contract](learning-workspace.md#explore-an-idea-in-the-reading) for the state and observation boundaries.

### Build and release the standalone package

`packages/learning-companion/` owns `@scalableweb/companion`; its executable is `scalableweb-companion`.
The package is built from the same CLI, notebook, conversation, provider and authored-resource modules as the repository command.
Its per-user default is independent of the repository's development directory.
The package has no runtime dependencies; its `files` allowlist includes only the launcher, compiled module, release metadata, README and license.

```sh
npm run companion:pack
npm run companion:check
```

The first command bundles the runtime and records its Git revision in `packages/learning-companion/dist/release.json`, then writes `.local/companion-release/scalableweb-companion-<version>.tgz`.
Both generated locations are ignored.
Dirty builds are marked explicitly and are useful for iteration; publish only from a clean committed revision.
The checker installs that tarball into a clean temporary directory, uses an isolated per-user home, launches without this checkout's dependencies and verifies retained notes across working directories, code-free connection and prerequisite failures.
The onboarding browser check also installs the actual tarball, so pack it before running that test.

[The package workflow](../.github/workflows/learning-companion.yml) runs focused tests, packing and clean installation on macOS/Linux with Node 24/26.
Wait for all declared matrix jobs to pass before claiming platform support or publishing.
The verified Codex adapter currently requires CLI 0.154.0; provider verification uses a real separately authenticated profile, while automatic jobs use synthetic records without credentials.
Local provider tests run with `node --test tests/learning-local.test.ts`; `companion:check` verifies setup, discussion and restart from the actual tarball.
Build the companion first, then run `npx playwright test tests/e2e/learning-local-model.spec.ts` for packed-runtime capability/provenance and actual browser observation/declined/approved changes in Chromium and WebKit.
The model responses in that browser check are synthetic; [the evaluation guide](learning-workspace-evaluation.md) owns the real LM Studio/Gemma teaching review and its limits.
To verify a freshly installed tarball, set `LEARNING_COMPANION_BIN` to its launcher and `LEARNING_CODEX_HOME` to its dedicated authenticated profile when running the opt-in browser check.

The repository prepares 0.3.0 (browser protocol 2) with code-free connection; it is not yet published.
The browser and setup guide use the checkout until registry availability is verified.
For an isolated iteration artifact, set `COMPANION_CHECK_ARTIFACT` to its absolute path in both the checker and onboarding browser test.
The publisher is bebraw, with access to the `scalableweb` npm organization.
Authenticate through `npm login --scope=@scalableweb`, then verify `npm whoami` without reading credentials into logs.
After the artifact, matrix and provider checks pass, publish that exact tarball with public access:

```sh
npm publish .local/companion-release/scalableweb-companion-0.3.0.tgz --access public
```

If npm requires a browser/2FA step, complete its own authentication flow and rerun publishing.
That interactive flow needs both stdin and stdout attached to a terminal.
On macOS, a coding-agent terminal can use `rtk proxy script -q /dev/null npm publish .local/companion-release/scalableweb-companion-0.3.0.tgz --access public` to provide a full terminal through RTK.
The scope must already exist as an npm organization; a free organization supports this public package.
If npm stages the release, inspect `npm stage list @scalableweb/companion` and approve its reviewed stage through npm's own 2FA flow or the account's Staged Packages page.
A `0.0.0-stage` placeholder does not establish that the requested version is available; verify the actual version and integrity in the registry before updating student instructions.
See [npm's staged publishing instructions](https://docs.npmjs.com/staged-publishing/).
After registry publication, run `gh workflow run learning-companion.yml -f verify-published=true` and confirm that the registry tarball passes the matrix as well.
Source-built tarballs can have different bytes across build installations; this explicit check verifies the exact distributed artifact.
Record the release's source revision, tarball integrity and verification in ADR-030, and remove any pending-publication wording from the student guide only after registry availability is verified.
Future releases update the package manifest and shared release metadata together, explain compatible protocol/schema/provider changes, and repeat the packed-artifact checks.

## Feedback Review

The deployed Worker supports private paragraph-level feedback when `COMMENTS_KV` and GitHub OAuth are configured.
Students sign in with GitHub, use the paragraph comment control, and post comments.
The feedback sign-in button opens the shared Account view; reader feedback continues to use its GitHub identity, independently of a course email session.
Signing out through Account clears feedback controls and refreshes their GitHub status in place.
Students see only their own comments and admin replies to those comments.
Admin users listed in `ADMIN_GITHUB_LOGINS` can see all comments, reply to comments, resolve comments, hide comments that should not be shown back to students, and feature curated reader notes publicly.
Admins can open `/admin/feedback/` (or choose `Review all` from a chapter's feedback controls) to search and filter feedback from across the whole book.

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
