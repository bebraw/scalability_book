# Teaching assistant setup and Notebook recovery

::label[set-up-your-notebook-and-assistant]

For lecture notes, start with the [course diary in Obsidian](/diary/).
You can keep a diary and save linked highlights using the book and the starter files alone.
Use this page to connect the optional book teaching assistant, launch a course coding project or [recover notes from the earlier Notebook](/notebook/setup/?legacy=1).

## Start on your computer

The standalone package is [@scalableweb/companion@0.4.0](https://www.npmjs.com/package/@scalableweb/companion/v/0.4.0), maintained by bebraw.
You need Node.js 24 or 26.
To connect the book to the companion, use current Chrome on the same computer. [Browser connection support](#browser-connection-support)
Run the published package from any directory; npm downloads it when needed.
Version 0.4.0 adds the [guided course project launcher](#start-a-course-coding-project), while retaining code-free connection and the macOS Codex authentication fix from 0.3.1.
The older 0.2.0 package uses the previous pairing contract and cannot connect to this website client.

Codex study replies additionally require a separate [Codex CLI installation](#connect-your-agent).
The course project launcher manages its own Codex selection.
Direct API connections and local models work without Codex. Choose **Notebook only** if you are recovering older notes without a model account.
Run the guided setup in your terminal:

```sh
npx --yes @scalableweb/companion@0.4.0 setup
npx --yes @scalableweb/companion@0.4.0 start
```

Choose the option for your provider:

| Choice                        | What you need                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| Notebook only                 | For recovering older notes.                                                                           |
| Replies can be enabled later. |
| Codex with ChatGPT            | Codex CLI and a ChatGPT account with Codex access.                                                    |
| Codex with an OpenAI API key  | Codex CLI and your OpenAI API key.                                                                    |
| API key directly              | An OpenAI, Anthropic (Claude), Gemini, OpenRouter or compatible service's key; no Codex installation. |
| Local model                   | LM Studio running a model you have loaded.                                                            |

Setup guides sign-in or key entry, checks your selected configuration and prints the exact command to start the companion.
API keys are entered in a hidden terminal prompt; do not paste them into the book website.
Saved keys go into your operating system's credential store.
If that store is locked or unavailable, setup explains how to unlock it or explicitly use an environment variable; it never saves a plaintext fallback.
API usage is billed by your provider.
Setup and `doctor` do not generate a paid reply; your first deliberate message checks whether the model can answer.
For recovery without a provider, use `npx --yes @scalableweb/companion@0.4.0 setup --notebook`.

Keep the start command running while you use the assistant or recover your old notes.
It prints a local address and the websites it allows.
In the book, choose **Teaching assistant → More learning tools → Connect**, enter the address if needed, and choose **Connect companion**.
The published 0.4.0 terminal may call this **Notebook → Connect**.
On the book website, use the **Teaching assistant** menu.
The connection instructions offer **Copy setup command** and **Copy start command** with this website's exact origin.
When you already have a connected notebook, both commands retain its directory and port.
If clipboard access is unavailable, the command is selected for keyboard copying.
No pairing code is needed.
If your browser requests permission to reach the local companion, allow it for the book website.
After disconnect, expiry or restart, choose **Connect companion** again; the running companion does not need a restart for reconnection.

Before setup, the only default website is `https://scalableweb.dev`.
Setup saves your chosen website origins and port for subsequent starts.
For local development, pass its exact origin explicitly:

```sh
npx --yes @scalableweb/companion@0.4.0 setup --origin http://127.0.0.1:3000
npx --yes @scalableweb/companion@0.4.0 start
```

Repeat `--origin` to trust several exact websites; supplying it replaces the default list.
The configured website can access your local notebook while the companion runs; opening a panel still does not send a model message.
To continue an existing checkout notebook, follow [Move an existing repository notebook](#move-an-existing-repository-notebook), or pass `--directory` with its existing storage path.

The packaged companion uses a stable directory independently of your current folder and npm's cache:

| System | Default directory                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| macOS  | `~/Library/Application Support/scalableweb-companion/`                                                     |
| Linux  | `$XDG_DATA_HOME/scalableweb-companion/`, or `~/.local/share/scalableweb-companion/` when unset or relative |

Published 0.4.0 passed clean-installation checks on macOS and Linux with Node 24 and 26.
Windows support has not been verified.
The CLI prints your actual storage path; `--directory /absolute/path` selects a separate notebook.
Keep the companion running while using the book; Ctrl+C stops it without removing your work.

### Browser connection support

Use current Chrome for the connection from this website to the companion, and allow local-network access when prompted.
Safari is not currently supported for this connection: it can block the HTTPS book website from reaching the companion's local HTTP address.
You can still read the book and use its online course features in Safari.
The companion must run on the same computer as the browser; its `127.0.0.1` address on a phone refers to the phone, not your computer.

If you have already started the companion, leave it running, open the book in Chrome and connect to the same address.
Saved notes remain in that companion's notebook; you do not need another installation or a new notebook.
Copy any unsaved writing before changing browsers because drafts belong to the original browser tab.
Keep normal browser security settings enabled.

### Try the learning tutorial

On a reading, choose **Cockpit → Tutorial**, or [open the tutorial](/notebook/setup/#try-the-learning-tutorial).
Predict what happens when requests slow down, try the example and download your takeaway as Markdown.
You can try the tutorial without a model or companion.

### Optional first investigation

Open [the cache lab](/demos/#demo-cache-decision-lab) and choose **Explore this idea**.
Predict what a change will do to the result, adjust a control and compare the new reading with your prediction.
Write what you would check next.
Choose **Download takeaway as Markdown** to keep the observation in your diary.

## Capture and revisit your thinking

Use [the course diary guide](/diary/#bring-a-passage-into-your-diary) to keep a passage from the book and your response together.
You can follow the source link when you revisit the entry.

To recover earlier writing, start the companion with the directory that holds your notes and [open Notebook recovery](/notebook/setup/?legacy=1).
Enter the address printed by the companion and choose **Connect companion**.
Choose **Download previous notes as Markdown** and move the file into your vault.
It contains the latest text of every entry, its dates and source link.
Choose **Export notebook backup** for the complete private JSON archive, including earlier revisions and concept judgments.

### Prepare material for your portfolio

The [course diary's portfolio walkthrough](/diary/#prepare-material-for-your-portfolio) explains how to choose evidence, attach written, audio or video files, and submit your individual phase portfolio.

If you recovered earlier notes, open the downloaded Markdown file in your vault and copy the excerpts you want to use into your portfolio draft.

## Start a course coding project

The guided `project` command in companion 0.4.0 prepares the course coding agent and opens it in your application directory.
Run it from any directory:

```sh
npx --yes @scalableweb/companion@0.4.0 project
```

From the checkout, use `npm run companion -- project`.
If you have installed the package directly, use `scalableweb-companion project`.
Choose **Establish**, **Challenge** or **Compare**, then your existing project directory.
Connect to Aalto VPN and have the departmental API key ready.
The command displays the selected model, project, private profile and commands before running them.
It reuses your installed Codex when eligible, reuses an available Aalto key or asks for it at a hidden prompt, and checks a small disposable file task before opening Codex.
You do not need to install Codex globally, copy configuration files, set `CODEX_HOME` or sign in to ChatGPT.

The launcher checks the first executable `codex` on your `PATH` without giving it the model key.
A stable version of 0.154.0 or newer is eligible; if Codex is missing, older, a prerelease, reports an unrecognized version or fails the version probe, the launcher uses a private copy of the verified 0.154.0 baseline.
It never updates your global installation.
Newer versions still need to pass the selected phase's setup check; the version number alone does not prove compatibility.

Establish uses one `zai-org/GLM-5.3-Flash` agent.
Challenge uses one `Qwen/Qwen3.8-27B-FP8` agent; Compare uses the same Qwen model with a coordinator and at most two workers.
After Codex opens, give it one bounded task, inspect its file changes and run your application checks yourself.
The [course environment sheet](https://github.com/bebraw/scalability_book/blob/main/specifications/course_environment.md) links the manual GLM and Qwen guides with full configurations, phase rules and evidence limits.
Students already using OpenCode or another harness may keep it with the assigned model, phase rules and a checked, recorded configuration.

To choose the phase and directory directly, or inspect the plan without changing anything:

```sh
npx --yes @scalableweb/companion@0.4.0 project establish --workspace /path/to/projects/01-establish
npx --yes @scalableweb/companion@0.4.0 project challenge --workspace /path/to/projects/02-challenge --print
npx --yes @scalableweb/companion@0.4.0 project compare --workspace /path/to/projects/03-compare --check
```

For checkout use, replace `npx --yes @scalableweb/companion@0.4.0` with `npm run companion --`.
`--print` displays the plan, configuration, selection policy and conditional commands without probing Codex, creating files, installing software, reading a key or generating a reply.
`--check` reruns the disposable setup check and stops without opening the project agent.
Normal launch reuses a successful check for the exact phase configuration, executable source/path/version, runtime and fixture version.
The setup check uses the departmental model and retains its result; it does not establish that your application is correct.
If it fails, the launcher keeps the evidence and stops without switching Codex versions and repeating model calls automatically.
To deliberately use the private 0.154.0 baseline, for example after an installed-version compatibility failure, add `--managed-codex` to your command.
If a managed profile's course settings were changed, or your project has Codex configuration that could override them, the launcher stops and leaves those files unchanged.
Review the reported file and use your manual harness setup, or deliberately move the conflicting configuration aside before retrying.
Codex's own saved project-trust choices are permitted; project `AGENTS.md` instructions still apply.

Saved keys use the OS credential store.
If `AALTO_LLM_API_KEY` is already exported, it can be used directly; `--api-key-env <name>` selects another existing variable without storing its value.
The key is supplied only to the coding process, after version probing and any installation, and excluded from ordinary shell-tool environments.
Use `--login` to replace the saved project key at a hidden prompt and repeat the check.
`npx --yes @scalableweb/companion@0.4.0 project --forget-key` removes only the launcher-owned saved key; a key reused from the book companion remains under that companion's existing logout flow.
For scripts, `--with-api-key` reads a key from standard input and is available only with `--check`; it saves the key in the OS credential store.
Existing Notebook settings, study conversations and teaching-assistant permissions remain unchanged.
Project profiles and check records live in a separate directory beside the companion's data directory, with `-projects` appended to its name; the command prints its exact path.
This lets the book companion keep running while the project agent is open.
Notebook migration and portable archives do not include these separate project records.
Within that directory, `profiles/` retains phase profiles and Codex sessions; `checks/` retains each disposable attempt and its result.
Installed Codex versions use their own phase profiles, separate from the private baseline and your normal Codex profile.
Check receipts record the executable source, path and version actually used.

Use Codex's own interruption and exit controls while it is open; interrupted work may have already changed files.
Keep the printed evidence location private and share only relevant, redacted results.
Report setup problems through [the book issue tracker](https://github.com/bebraw/scalability_book/issues), including the phase, configuration version and error, without credentials.
The project launcher currently targets macOS and Linux; Windows is unsupported.

## Connect your agent

This section configures the optional book study assistant; the course `project` command above needs none of these additional steps.
Choose Codex, [a direct API key](#use-an-api-key) or [a locally loaded model](#use-a-local-model).
For Codex, install the [Codex CLI](https://learn.chatgpt.com/docs/developer-commands?surface=cli) separately and make it available as `codex` in the terminal where you run the companion.
The adapter was verified with CLI version 0.154.0.
Install that version if needed, then check that the command works:

```sh
npm install -g @openai/codex@0.154.0
codex --version
```

The version check should print `codex-cli 0.154.0`.
If the terminal cannot find `codex`, check the CLI installation and your terminal's `PATH` before continuing.
Installing the companion alone does not supply this command.
Stop any running companion, run `npx --yes @scalableweb/companion@0.4.0 setup`, and choose **Codex with ChatGPT sign-in** or **Codex with an OpenAI API key**.
The guided setup completes the selected authentication flow in Companion's dedicated profile.
For explicit ChatGPT setup commands, use:

```sh
npx --yes @scalableweb/companion@0.4.0 setup --codex
npx --yes @scalableweb/companion@0.4.0 login
npx --yes @scalableweb/companion@0.4.0 doctor
```

For explicit API key login, first run `setup --codex`, then pipe a key already available in your terminal environment:

```sh
printenv OPENAI_API_KEY | npx --yes @scalableweb/companion@0.4.0 login --with-api-key
npx --yes @scalableweb/companion@0.4.0 doctor
```

The key goes through standard input and Codex stores it in the OS keyring for the dedicated profile; it is never a command argument.
Simply setting `OPENAI_API_KEY` does not authenticate Companion's Codex profile.
See [OpenAI's authentication guide](https://learn.chatgpt.com/docs/auth) for API account and billing details.

After the checks pass, start the companion with your dedicated Codex profile:

```sh
npx --yes @scalableweb/companion@0.4.0 start
```

Choose **Connect companion** again in the book.
Setup creates the dedicated profile before login and retains your provider choice.
Login uses Codex's own authentication flow; do not send credentials to the website or a support request.
The dedicated profile separates this learning space from your ordinary coding environment; its credentials are held in the OS keyring.
It must not contain custom configuration, hooks, plugins, rules or custom skills.
You can choose a profile with `--codex-home` or a model available to your account with `--model`.

In **Teaching assistant → Discuss**, write your question and choose **Send message**.
The provider notice beside your message identifies whether replies are enabled.
For a notebook-only connection, Send is disabled; **Set up assistant replies** opens Connect with provider choices and copyable setup/start commands.
Both commands include your connected port and notebook directory so a custom location stays selected.
After enabling the provider, choose **Check connection** and reconnect if asked; your unsent question stays in the tab.
The **Help: … · Settings** disclosure shows the current help choice and contains conversation/source controls, your optional learning goal and support preferences.
Choose a help mode there: a question, hint, direct explanation, reasoning check or reflection support.
This is automated study support through your chosen provider; your instructor remains responsible for course assessment.
You can also indicate where you want support, such as a prerequisite, an unexpected result or trying the next step yourself.
An honest statement of being stuck is enough; you can request a direct explanation immediately and change the amount of help later.
Discuss shows the reading and the context for your question.
Check the source before choosing **Send message**.
The companion supplies that context to your configured provider.
You can reopen a saved conversation or stop a reply.
To keep part of an exchange, choose **Review for diary**, edit the text and choose **Download Markdown**.
Move the file into your diary and add what you want to check independently.
Companion 0.4.0 retains the supplied note identities on each new turn, applies the shared teaching policy and records its version on new replies.
**Connect** identifies the installed policy and **About this reply** shows the recorded setup for a reply; earlier replies retain their original history.
Updating the website alone does not update your local assistant.

With Codex or a verified API/local native-tool configuration, open **Help: … · Settings** for a demo investigation, select its source and use **Save initial thinking** to record your prediction with the companion.
Choose **Include my attempt** if you want to share the prediction with the provider and ask the assistant to inspect or change the demo.
Proposed changes ask for your approval and report actual browser controls and textual outputs.
Keep **Discuss** open during a tool request.
A demo that is absent, starting or unavailable cannot be treated as an executed experiment; open its linked page or use a manual check and the authored assumptions.

## Use an API key

Use this option for assistant replies directly through OpenAI, Anthropic (Claude), Gemini, OpenRouter or another compatible HTTPS service.
No Codex installation or ChatGPT subscription is required.
Stop the companion, run `npx --yes @scalableweb/companion@0.4.0 setup`, and choose **API key directly**.

Choose your provider, enter its key at the hidden prompt, then choose a text model by number or exact identifier.
Setup shows the first twenty model identifiers returned by the provider; you can enter another exact identifier from that provider's catalog.
For a compatible service, supply its HTTPS API base URL when asked.
Custom services must provide an OpenAI-compatible model list and Chat Completions API.
The named provider choices supply their own supported endpoints; use a key issued for the provider and project or workspace you intend to use.
For Anthropic, use a workspace-scoped key; Companion has no option to select a workspace through a custom request header.

Start with the command printed by setup, connect in the book, and send a short question in **Teaching assistant → Discuss**.
Setup checks that the configured model is listed.
Some providers publish their model catalog without authentication, so this does not establish that the key works, that it has generation access or that the model can reliably follow the teaching instructions.
The provider may charge for that first question and later messages.
Only your sent message, selected source/context and retained conversation context are supplied to it.

Direct API mode defaults to **discussion-only** with an estimated context budget of 16,384 tokens and an output allowance of 4,096 tokens.
It cannot inspect a live demo in this mode; share a saved observation or use Chapter guide.
Earlier completed turns may be omitted with a notice to keep within the budget; oversized current selections are rejected while retaining your work.
Change the budget with `--api-context <tokens>` within the selected model's supported context.
Use `--api-output <tokens>` to change the output allowance; models that spend output tokens on reasoning may need more room before they produce a visible answer.
Use `--api-tools native` only after verifying function calls for that model and provider; it uses the existing student approval boundary for demo changes.
The API transport and conversation checks use synthetic responses; actual replies and native-tool reliability across these providers have not yet been verified for this release.

For scripts, supply the name of an environment variable that already contains your key:

```sh
npx --yes @scalableweb/companion@0.4.0 setup --api --api-provider openai --model '<exact-model-id>' --api-key-env OPENAI_API_KEY
npx --yes @scalableweb/companion@0.4.0 start
```

Keep that variable available whenever you run setup, `doctor` or start the companion.
Only its name is saved in settings.
The named provider values are `openai`, `anthropic`, `gemini` and `openrouter`.
Use `--api-provider compatible --api-url https://your-provider.example/v1` for another service.
Replace the example model and URL with your provider's values.
Alternatively, pipe the key on standard input to store it in this computer's OS credential store:

```sh
printenv OPENAI_API_KEY | npx --yes @scalableweb/companion@0.4.0 setup --api --api-provider openai --model '<exact-model-id>' --with-api-key
```

To replace a saved key after API setup, stop the companion and run `npx --yes @scalableweb/companion@0.4.0 login` for a hidden prompt, or pipe the replacement into `login --with-api-key`.
When setup uses an environment variable, `login` keeps that source and does not prompt for a key.
Piping a key into `login --with-api-key` explicitly switches from the environment variable to a saved key for subsequent starts.
Saved API keys are held in the OS credential store and are reused only for their configured endpoint and notebook identity.
The companion directory contains `credential-identity.json`, a nonsecret identifier used to find those entries.
The keys are excluded from browser status, setup preferences, diagnostic reports and portable notebook archives.
On Linux, saved API keys require an available Secret Service credential store in your login session.
If OS credential storage is unavailable or access is denied, unlock or enable it and retry.
For a headless terminal, use the explicit `--api-key-env` option above; Companion never falls back to a plaintext file.
If you change the endpoint, model or tool mode, start a new conversation or restore the original configuration; an old transcript is not silently sent to the new backend.

### Remove saved access

To remove saved access from this computer, stop the companion and run `npx --yes @scalableweb/companion@0.4.0 logout` with the same directory.
For API mode this removes the selected endpoint's keychain entry; for Codex it uses Codex's keyring logout.
Copies of an API notebook that retain the same credential identity on this computer share that entry.
With an environment-backed API setup, logout explains how to unset the variable in your terminal instead.
Removing a local credential does not revoke the provider's API key; revoke it in your provider account when needed.

## Use a local model

Start LM Studio's local server and load the language model you want to use.
Choose its exact identifier from LM Studio; the companion does not download or load weights for you.
Stop the companion before changing its saved provider choice, then run:

```sh
npx --yes @scalableweb/companion@0.4.0 setup --local --local-url http://127.0.0.1:1234/v1 --model google/gemma-4-12b-qat
npx --yes @scalableweb/companion@0.4.0 start
```

Use your own loaded model identifier in place of this verified Gemma example.
No Codex installation, account or `login` command is needed.
Connect the companion in the book and use the same **Teaching assistant → Discuss** panel.
The model server does not need browser CORS permission; only the companion connects to it.
Keep inference local by choosing locally loaded weights, rather than a runner's remote/cloud model.
A loopback address by itself does not establish where inference runs.

Local models default to **discussion-only**.
The panel explains that they cannot inspect live pages or demos; supply a saved demo result or use **Chapter guide** for an actual observation.
The current source, your message and the teaching instructions go to the configured model.
Earlier context is retained privately across restarts, including the original text of notes that you later edit.
**About this reply** records the model identifier; separate notices show when old completed or interrupted turns were omitted from the model's context.
Oversized current selections/tool results are rejected with your work retained, so you can select less context or start a new conversation.
The budget is an estimate; a runner can still reject a request at its actual token limit.

`doctor` reports the selected model, loaded context and advertised maximum separately.
When a compatibility server does not report loaded context, supply `--local-context 8192` using the actual context configured in your runner.
A smaller explicit budget is permitted; a larger one cannot exceed the reported loaded context.
Turn off conflicting output-format settings in LM Studio if it rejects the companion's reply schema.
Ollama and llama.cpp have not yet passed runner verification for this release.

`setup --local --local-tools native` explicitly enables standard function calls for a model/runner configuration you have verified.
This uses the same saved-initial-thinking and student-approval rules as Codex; discussion text is never executed as a tool call.
A model's tool badge, listing or successful reply does not establish reliable demo tools.
Gemma's current exposed configuration passed discussion/replay checks but did not produce native calls in the exploratory probes, so keep its default discussion-only mode.
If you change endpoint, model or tool mode, start a new conversation or restore the original configuration; the companion does not silently send the old transcript to the new backend.

## Compare with peers

In **Teaching assistant → Peer discussion**, sign in using your course account and choose the course run and inquiry activity.
Choose **Write my initial thinking**, record your prediction or uncertainty and choose **Save private attempt**.
Then choose **Reveal peer inquiry**.
Only a declaration that you saved private work reaches the course API; your initial text remains local.
A concrete uncertainty is enough to begin.

Review the text and its audience before sharing.
Group inquiry is scoped to a phase allocation; course-cohort inquiry is visible to active participants in that run after their initial step.
Replies can preserve disagreement and link evidence or tool provenance.
**Optional reasoning and session prompts** offers a short outline: question, competing explanations, evidence/check, current decision and remaining uncertainty.
Use any part or write freely; you need not wait for every member to reply.
Select contributions you want in a draft, then **Prepare summary from selected contributions** if useful.
Review contributor identities, disagreement, evidence limits and any agent assistance before using the ordinary share button; an absent member has not endorsed it.
**Download a diary reflection prompt** gives you Markdown with the discussion link and personal prompts for your diary.
It copies classmates' text only when you deliberately select their contributions.
**Try a related case privately** lets you apply the idea yourself, save a separate attempt or request more help, regardless of the group's decision.
To discuss your reflection with the TA, paste the excerpt you choose into **Discuss**.

New members do not gain older group threads automatically.
Students who leave a group or withdraw retain read-only access to their own contributions and can remove their text.
Public review is a separate opt-in copy of the author's reviewed contribution; it does not publish the thread or classmates' replies.
Course staff review offers, and book editors decide what to publish through the existing Markdown review workflow.
Optional session prompts support your existing operator/challenger/validator practice; arrange meetings yourselves.
For another check, change responsibilities and ask someone other than the operator to explain why the result should be accepted.
Record your own conclusion in the diary, including where you disagree.
Solo learners can continue the Chapter guide and the existing independent human review route; peer replies are not a prerequisite.

## Diagnose a connection

Stop the companion, then run the same release and directory/port options with `doctor`:

```sh
npx --yes @scalableweb/companion@0.4.0 doctor
```

It checks storage/schema compatibility, the loopback port, and your chosen provider: Codex prerequisites, local endpoint/model/context configuration, or a supplied API key and model listing.
It does not run in your browser or test whether the book website can reach the companion; a successful report does not establish that connection.
An available model catalog does not prove the key has generation access; only a deliberately sent message checks that.
The report identifies the selected mode and always checks whether the Codex CLI version is available.
Without a saved provider choice or an explicit option, `doctor` uses notebook-only mode.
In notebook-only, direct API and local-model modes, Codex is optional: a missing or unverified CLI is informational and does not fail the check.
When Codex is selected, a missing or unverified CLI fails the check.
To require the Codex CLI and check dedicated-profile sign-in before selecting Codex, run:

```sh
npx --yes @scalableweb/companion@0.4.0 doctor --codex
```

Use the same `--directory` and `--codex-home` options as your intended setup.
This diagnostic does not change your saved provider choice.
Install the displayed verified provider version when it is missing or unsupported; run `login` for missing dedicated-profile authentication.
An account's access is checked on its first real reply.
For API authentication errors, rerun API setup or `login`; for credit or quota errors, check your provider's billing and limits.
For a keychain error, unlock or enable your OS credential store and retry; headless API users can explicitly select `--api-key-env`.
If a provider rejects a listed model, check its Chat Completions support and choose a compatible text model.
Use `start --notebook` to recover existing Notebook records without a provider.
If a port is busy, stop the other process or select `--port 8789` and connect to that address.
For a storage permission error, select a writable private directory; do not reset the database.

In **Connect**, **Check connection** shows the package/protocol versions and storage path after connecting.
After an expired session or restart, choose **Connect companion** again; your notebook and unsaved browser draft remain available.
For an incompatible protocol, use the version shown in this guide and reload the book.
Browser network errors cannot reliably distinguish a stopped process, an origin mismatch, denied local-network access or a browser restriction on HTTPS-to-HTTP connections.
Check that the companion is running, that its allowed websites include the exact book origin, and that your browser permits local access.
For Safari or a persistent browser-side failure, follow [browser connection support](#browser-connection-support).

`doctor --json` produces a local report containing versions, paths, allowed website origins and check results, without notes, conversations, provider diagnostics, credentials or connection tokens.
Review its filesystem paths before deliberately sharing it for support.
Nothing sends the report automatically.

## Keep your work portable

These instructions cover records from the earlier Notebook.
For your Obsidian diary, back up the vault folder and any separate media files.

The earlier Notebook lives in the per-user directory printed by the CLI.
The [recovery page](/notebook/setup/?legacy=1) connects to that companion and offers a complete JSON archive and a readable Markdown copy of all entries.
To continue writing in Obsidian, move the Markdown file into your vault.

Keep a backup outside the companion's directory.
Your course membership does not give teachers or peers access to the private notebook.

Before updating, export a backup, stop the companion/provider and privately copy its directory and any separately configured profile.
To update an existing notebook, run `npx --yes @scalableweb/companion@0.4.0 start` with the same directory, profile, origin and port options, then connect again.
Release 0.4.0 retains your storage location, setup preferences, dedicated profile and records; the archive and database schemas remain version 1, and the browser connection uses protocol 2.
Existing notebook/provider preferences remain available.
Startup validates database schemas before writing and saves a `.before-schema-1-<id>.backup` snapshot when converting the original unversioned database to schema 1.
An interrupted conversion can be retried after stopping every writer; the backup remains available.
Older releases may reject newer schemas.
To roll back, stop the companion/provider and restore the full pre-update directory copy, retaining the upgraded copy separately; use its compatible release.
For a single schema conversion, privately retain the current database, copy its matching `.backup` file back under its original database filename, then use a compatible release.
Restoring a backup loses subsequent changes in that restored copy; keep exports/current files so you can review and recover them separately.
For the book study assistant's Codex adapter, keep the verified version until a newer version has passed the documented provider check.

Portable notebook archives do not include credentials or raw conversations.
Conversations are stored separately in `conversations.sqlite`, with Codex threads in the dedicated profile, exact local-model context in `local-provider.sqlite` and API conversation context in `api-provider.sqlite` (both schema 1).
To preserve conversation continuity as well, stop the companion and privately back up its directory and any separately configured profile.
The backup retains `credential-identity.json` and conversation data, while saved keys remain in the OS credential store.
Keep the backup private because it contains your learning records.
On another computer, restore your records and sign in again or supply your API key through the configured environment variable.
Moving a Codex profile to another path requires sign-in again even on the same computer.
You can use an excerpt from the Markdown copy to start a new discussion.

### Move an existing repository notebook

Stop the old companion and its Codex process.
Before running packaged setup in the destination, migrate the old directory:

```sh
npx --yes @scalableweb/companion@0.4.0 migrate --from /absolute/path/to/old-notebook --directory /absolute/path/to/new-notebook --confirm-stopped
```

The command shows source/destination, retains the source, and rejects a nonempty destination.
Use `--directory /absolute/path/to/new-location` when you need another destination.
It copies notebook history, conversations, local/API transcripts, nonsecret API credential identity and included Codex profile threads without changing record identities.
It excludes externally created Codex `auth.json` files, including nested copies, while retaining the original source.
Setup preferences are not copied; run `setup --directory /absolute/path/to/new-notebook`, then `doctor` with that same directory.
Choose the original provider/endpoint/model/tool mode for local or API conversation continuity, and restore any configured API key environment variable in the new terminal.
The API identity can locate existing keychain entries on the same computer; another computer requires login.
Codex login is required after moving its profile to a new path.
For a separately located profile, keep it and pass `--codex-home /absolute/path/to/profile` during setup.
Verify sign-in and resumed conversations before removing any old copy.
If continuity is unavailable, keep conversations backed up and start a new conversation from selected retained notes.

### Repository development

To run from source instead of npm, install the checkout and work from its directory:

```sh
git clone https://github.com/bebraw/scalability_book.git
cd scalability_book
npm ci
npm run companion -- setup
npm run companion -- start
```

For the checkout, replace `npx --yes @scalableweb/companion@0.4.0` in the commands above with `npm run companion --`.
The checkout uses `.local/learning-companion/` by default.
Use `--directory` to retain a notebook stored elsewhere, and `setup --origin` to save a local development website's exact origin.
Export and privately copy that directory/profile before updating with `git pull --ff-only` and `npm ci`, or before removing the checkout.
