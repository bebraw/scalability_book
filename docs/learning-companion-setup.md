# Set up your learning notebook

Your notebook is a private space for questions, observations and reflection across the book.
You choose which material becomes a course submission or a shared contribution.
The header offers a notebook icon labelled **Notebook** for keeping your thinking and a question-bubble icon labelled **Assistant** for guidance and discussion.
The panel identifies the second experience as **Teaching assistant** and shows its reading context.
They share one companion connection; opening either panel does not send a message or save a note.
On larger screens you can keep both open: the notebook sits above the assistant at the lower right.
Reading the book does not require a companion or a model account.

## Start on your computer

The standalone package is [@scalableweb/companion](https://www.npmjs.com/package/@scalableweb/companion), maintained by bebraw.
Code-free connection is prepared in version 0.3.0 and has not yet been published to npm.
Use the book checkout for now; [repository development](#repository-development) explains how to install it.
The published 0.2.0 package uses the previous pairing contract and cannot connect to this updated website client.
With Node.js 24 or 26 and the repository dependencies installed, run:

```sh
npm run companion -- setup --notebook
npm run companion
```

Keep the companion running while you use your notebook.
It prints a local address and the websites it allows.
In the book, choose **Notebook → Connect**, enter the address if needed, and choose **Connect companion**.
The connection instructions include **Copy command** for the startup command with this website's exact origin.
If clipboard access is unavailable, the command is selected for keyboard copying.
No pairing code is needed.
If your browser requests permission to reach the local companion, allow it for the book website.
After disconnect, expiry or restart, choose **Connect companion** again; the running companion does not need a restart for reconnection.

The only default website is `https://scalableweb.dev`.
For local development, pass its exact origin explicitly:

```sh
npm run companion -- --origin http://127.0.0.1:3000
```

Repeat `--origin` to trust several exact websites; supplying it replaces the default list.
The configured website can access your local notebook while the companion runs; opening a panel still does not send a model message.
The checkout stores its notebook in `.local/learning-companion/`; the future standalone release uses the per-user locations below.
To continue a notebook created by the packaged CLI, pass `--directory` with its existing printed storage path to the checkout commands.

The packaged companion uses a stable directory independently of your current folder and npm's cache:

| System | Default directory                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| macOS  | `~/Library/Application Support/scalableweb-companion/`                                                     |
| Linux  | `$XDG_DATA_HOME/scalableweb-companion/`, or `~/.local/share/scalableweb-companion/` when unset or relative |

Published 0.2.0 passed clean-installation checks on macOS and Linux with Node 24 and 26.
Release 0.3.0 requires its own release checks before publication.
Windows support has not been verified.
The CLI prints your actual storage path; `--directory /absolute/path` selects a separate notebook.
Keep the companion running while using the book; Ctrl+C stops it without removing your work.

### Optional first investigation

After connecting, choose **Teaching assistant → Chapter guide**, or **Connect → Explore this reading**.
The guide follows the chapter you are reading and uses its existing prompts and available demos.
For a first queue investigation, open [the queue lab](/demos/#demo-queue-balance-lab), choose **Teaching assistant → Chapter guide**, and select **Queue balance lab**.
Save a prediction or a concrete uncertainty, change the demo's mean time, then choose **Save demo result**.
This saves the demo's current inputs and displayed result as a private note and shows what was recorded below the button.
Optionally try **Apply it in a different situation**: explain what happens to 300 waiting events when arrivals and processing capacity differ.
Try your explanation before opening **Self-check after my attempt**, or choose your own related case.
**Save my independent attempt** keeps it separately and links your initial thinking and saved observation.
**Ask for help with this case** prepares an editable request; you decide whether to send it.
Reflect in your own words, using **Reflection starters and examples** if useful, then choose **Review my saved notes**.
Pages without demos offer an application to a different system or your project, without requiring a browser observation.
Restart the companion, connect again and reopen those notes to check continuity.
You can leave the investigation for your own question at any point.
This is optional support, with no required answer, minimum length, completion mark or additional course report.

## Capture and revisit your thinking

The header's **Notebook** button is always available for connecting or working on the current page.
Without a text selection, **Write** starts a note about that chapter/page and keeps its reading link.
To attach a passage, select text in the reading, then open **Notebook**; if it is already open, choose **Use selected text**.
Write shows the source; **Preview the selected source** reveals a short quote without copying the whole chapter into your note.
Your writing and Save action come before the note's kind and title, so you can start with your thought and add details later.
The open notebook follows you between chapters, and **Notes** initially shows the current reading's entries; choose **Whole notebook** to see the rest.
Unfinished writing stays attached to its original source when you navigate, until you save it or deliberately start another note.
The assistant remembers its own section, unsent question and active conversation across chapter navigation, with its original source shown explicitly.
Each panel stays open as you move between chapters until you close it.
The header highlights each visible tool; choose its icon again to close just that panel, or use its close button or Escape.
On smaller screens one panel is visible at a time.
Use the other header icon to bring that panel forward; both retain your unfinished work.
Closing the foreground panel reveals the other if you had left it open.
These unfinished drafts stay in this browser tab; save your notes before closing the tab.
**Notebook** has **Write**, **Notes** and **Concepts**.
**Teaching assistant** has **Discuss**, **Chapter guide** and **Peer discussion**.
Selecting notes in Notebook does not change an open assistant discussion.
Choose **Discuss selected notes** to deliberately supply that material as assistant context.
**More learning tools** contains the shared **Connect** settings and, in Notebook, **Prepare**.
Quick notes may be short.
Use **Notes → Revisit** after a delay to recall an idea before rereading your earlier explanation; there is no schedule or completion requirement.
Developed reflections have prompts and examples to help you capture enough evidence and explanation.
There is no single correct conclusion: uncertainty, a failed experiment or a better-supported unchanged view can be useful material.

**Notes** lets you review saved revisions and revisit an earlier idea.
Edit and Revisit ask before replacing unfinished writing; choose Cancel to keep your current draft.
Try explaining it from memory and applying it to a changed situation before rereading your earlier explanation.
**Concepts** records your own revisable judgment and the notebook evidence behind it.
These markers do not grade or certify your understanding.

Select notes, then use **Prepare** to build and revise material for your existing diary or portfolio.
Download or copy the draft and review it against the course requirements before submitting through the course workspace.
Preparation does not expose your other notes or submit anything automatically.
Existing audio/video diary options remain available.

## Connect your agent

Choose Codex or a locally loaded model.
For Codex, the adapter was verified with CLI version 0.154.0.
Install that version if you do not already have it:

```sh
npm install -g @openai/codex@0.154.0
npm run companion -- setup --codex
npm run companion -- login
```

Stop the notebook-only companion, then start it with your dedicated Codex profile:

```sh
npm run companion -- start
```

Choose **Connect companion** again in the book.
Setup creates the dedicated profile before login and retains your provider choice.
Login uses Codex's own authentication flow; do not send credentials to the website or a support request.
The dedicated profile separates this learning space from your ordinary coding environment.
It must not contain custom configuration, hooks, plugins, rules or custom skills.
You can choose a profile with `--codex-home` or a model available to your account with `--model`.

In **Teaching assistant → Discuss**, write your question and choose **Send message**.
The provider notice beside your message identifies whether replies are enabled.
For a notebook-only connection, Send is disabled; **Set up assistant replies** opens Connect with setup links and a copyable Codex start command.
The copied Codex command includes your connected port and notebook directory so a custom location stays selected.
After enabling the provider, choose **Check connection** and reconnect if asked; your unsent question stays in the tab.
The **Help: … · Settings** disclosure shows the current help choice and contains conversation/source controls, your optional learning goal and support preferences.
Choose a help mode there: a question, hint, direct explanation, reasoning check or reflection support.
This is automated study support through your chosen provider; your instructor remains responsible for course assessment.
You can also indicate where you want support, such as a prerequisite, an unexpected result or trying the next step yourself.
An honest statement of being stuck is enough; you can request a direct explanation immediately and change the amount of help later.
Chapter guide can prepare a help request from your current question without sending it automatically.
Use **Notes → Discuss this note** to discuss one note, or select entries and choose **Discuss selected notes**.
Discuss shows the source and selected notebook context before sending; choosing another chapter does not retarget a retained conversation silently.
Sending a question shares that source and those selected entries with your model provider.
You can reopen saved conversations, stop a reply, or keep using the notebook without a model.
**Write a takeaway** opens a blank personal draft; **Use as a notebook draft** prepares the selected suggestion for review and revision.
Both retain the conversation source and available links to the supplied notes, and ask before replacing unfinished writing.
Choose **Save note** to keep your own account; a conversation is not saved as a reflection automatically.
Companion 0.3.0 retains the supplied note identities on each new turn, applies the shared teaching policy and records its version on new replies.
**Connect** identifies the installed policy and **About this reply** shows the recorded setup for a reply; earlier replies retain their original history.
Updating the website alone does not update your local assistant.

With Codex or a verified local native-tool configuration, open **Help: … · Settings** for a demo investigation, select its source and use **Save initial thinking** to write a notebook note first.
Select that note and choose **Discuss selected notes**, then ask your teaching assistant to inspect the demo.
Proposed changes ask for your approval and report actual browser controls and textual outputs.
Keep **Discuss** open during a tool request.
A demo that is absent, starting or unavailable cannot be treated as an executed experiment; open its linked page or use a manual check and the authored assumptions.

## Use a local model

Start LM Studio's local server and load the language model you want to use.
Choose its exact identifier from LM Studio; the companion does not download or load weights for you.
Stop the companion before changing its saved provider choice, then run:

```sh
npm run companion -- setup --local --local-url http://127.0.0.1:1234/v1 --model google/gemma-4-12b-qat
npm run companion
```

Use your own loaded model identifier in place of this verified Gemma example.
No Codex installation, account or `login` command is needed.
Connect the companion in the book and use the same **Teaching assistant → Discuss** panel.
The model server does not need browser CORS permission; only the companion connects to it.
Keep inference local by choosing locally loaded weights, rather than a runner's remote/cloud model.
A loopback address by itself does not establish where inference runs.

Local models default to **discussion-only**.
The panel explains that they cannot inspect live pages or demos; supply a saved demo result or use **Chapter guide** for an actual observation.
Your explicitly selected passage/notes and shared teaching instructions are supplied on each turn.
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
Save initial thinking for that source, then choose **Reveal peer inquiry**.
Only a declaration that you saved private work reaches the course API; your initial text remains local.
A concrete uncertainty is enough to begin.

Review the text and its audience before sharing.
Group inquiry is scoped to a phase allocation; course-cohort inquiry is visible to active participants in that run after their initial step.
Replies can preserve disagreement and link evidence or tool provenance.
**Optional reasoning and session prompts** offers a short outline: question, competing explanations, evidence/check, current decision and remaining uncertainty.
Use any part or write freely; you need not wait for every member to reply.
Select contributions you want in a draft, then **Prepare summary from selected contributions** if useful.
Review contributor identities, disagreement, evidence limits and any agent assistance before using the ordinary share button; an absent member has not endorsed it.
**Reflect privately on this inquiry** prepares a local draft with a discussion link and personal starters.
It copies classmates' text only when you deliberately select their contributions.
**Try a related case privately** lets you apply the idea yourself, save a separate attempt or request more help, regardless of the group's decision.
Only notes you later select enter an agent conversation or submission draft.

New members do not gain older group threads automatically.
Students who leave a group or withdraw retain read-only access to their own contributions and can remove their text.
Public review is a separate opt-in copy of the author's reviewed contribution; it does not publish the thread or classmates' replies.
Course staff review offers, and book editors decide what to publish through the existing Markdown review workflow.
Optional session prompts support your existing operator/challenger/validator practice; arrange meetings yourselves.
For another check, change responsibilities and ask someone other than the operator to explain why the result should be accepted.
You can keep a different private conclusion and choose your own concept judgment.
Solo learners can continue the Chapter guide and the existing independent human review route; peer replies are not a prerequisite.

## Diagnose a connection

Stop the companion, then run the same release and directory/port options with `doctor`:

```sh
npm run companion -- doctor
```

It checks storage/schema compatibility, the loopback port, and your chosen provider: Codex prerequisites or the local endpoint/model/context configuration.
Install the displayed verified provider version when it is missing or unsupported; run `login` for missing dedicated-profile authentication.
An account's access is checked on its first real reply.
Use `start --notebook` to continue writing without a provider.
If a port is busy, stop the other process or select `--port 8789` and connect to that address.
For a storage permission error, select a writable private directory; do not reset the database.

In **Connect**, **Check connection** shows the package/protocol versions and storage path after connecting.
After an expired session or restart, choose **Connect companion** again; your notebook and unsaved browser draft remain available.
For an incompatible protocol, use the version shown in this guide and reload the book.
Browser network errors cannot reliably distinguish a stopped process, an origin mismatch or denied local-network access.
Check that the companion is running, that its allowed websites include the exact book origin, and that your browser permits local access.

`doctor --json` produces a local report containing versions, paths, allowed website origins and check results, without notes, conversations, provider diagnostics, credentials or connection tokens.
Review its filesystem paths before deliberately sharing it for support.
Nothing sends the report automatically.

## Keep your work portable

The packaged notebook lives in the per-user directory printed by the CLI.
Removing a package or clearing npm's cache does not remove it.
You can read and edit it without a model connection while the companion is running.

Use **Connect → Export notebook backup** to save a portable JSON archive.
On another computer, start the companion and use **Import a portable notebook**.
Identical records are retained once; imports with conflicting existing work are rejected without replacing your notes.
Keep both copies and start a separate notebook if you need to inspect a conflict:

```sh
npm run companion -- start --directory /absolute/path/to/another-notebook
```

Keep a backup outside the companion's directory.
Your course membership does not give teachers or peers access to the private notebook.

Before updating, export a backup, stop the companion/provider and privately copy its directory and any separately configured profile.
To update an existing notebook, start the updated checkout with the same directory, profile, origin and port options, then connect again.
Release 0.3.0 retains your storage location, setup preferences, dedicated profile and records; the archive and database schemas remain version 1, and the browser connection uses protocol 2.
You do not need to repeat setup or create a new profile for this update.
Startup validates database schemas before writing and saves a `.before-schema-1-<id>.backup` snapshot when converting the original unversioned database to schema 1.
An interrupted conversion can be retried after stopping every writer; the backup remains available.
Older releases may reject newer schemas.
To roll back, stop the companion/provider and restore the full pre-update directory copy, retaining the upgraded copy separately; use its compatible release.
For a single schema conversion, privately retain the current database, copy its matching `.backup` file back as `notebook.sqlite`, `conversations.sqlite` or `local-provider.sqlite`, then use a compatible release.
Restoring a backup loses subsequent changes in that restored copy; keep exports/current files so you can review and recover them separately.
Keep the verified Codex version until a newer version has passed the documented provider check.

Portable notebook archives do not include credentials or raw conversations.
Conversations are stored separately in `conversations.sqlite`, with Codex threads in the dedicated profile and exact local-model wire context in `local-provider.sqlite` (schema 1).
To preserve conversation continuity as well, stop the companion and privately back up its directory and any separately configured profile.
Restoring only the portable notebook lets you start a new conversation from selected notes without depending on an old provider session.

### Move an existing repository notebook

Stop the old companion and its Codex process.
Before running packaged setup in the destination, migrate the old directory:

```sh
npm run companion -- migrate --from /absolute/path/to/old-notebook --directory /absolute/path/to/new-notebook --confirm-stopped
```

The command shows source/destination, retains the source, and rejects a nonempty destination.
Use `--directory /absolute/path/to/new-location` when you need another destination.
It copies notebook history, conversations, local-model transcripts and an included dedicated profile without changing record identities.
After migration, run `setup --notebook`, `setup --codex` for the copied profile, or `setup --local` with the same endpoint/model/tool mode for local conversation continuity, then run `doctor`.
For a separately located profile, keep it and pass `--codex-home /absolute/path/to/profile` during setup.
Verify sign-in and resumed conversations before removing any old copy.
If continuity is unavailable, keep conversations backed up and start a new conversation from selected retained notes.

### Repository development

The book checkout retains the same companion for development:

```sh
git clone https://github.com/bebraw/scalability_book.git
cd scalability_book
npm ci
npm run companion -- setup --notebook
npm run companion
```

This development command retains `.local/learning-companion/` as its default.
Use `npm run companion -- setup --codex`, then `npm run companion -- login` for its dedicated provider profile.
Export and privately copy that directory/profile before updating with `git pull --ff-only` and `npm ci`, or before removing the checkout.
