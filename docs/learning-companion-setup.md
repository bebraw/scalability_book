# Set up your learning notebook

Your notebook is a private space for questions, observations and reflection across the book.
You choose which material becomes a course submission or a shared contribution.
The header offers **Notebook** for keeping your thinking and **Teaching assistant** for guidance and discussion.
They share one companion connection; switching does not send a message or save a note.
Reading the book does not require a companion or a model account.

## Start on your computer

The standalone package is [@scalableweb/companion](https://www.npmjs.com/package/@scalableweb/companion), maintained by bebraw.
These commands use the verified release 0.1.0.
Install Node.js 24 or 26, then set up a notebook without cloning the book:

```sh
npx @scalableweb/companion@0.1.0 setup --notebook
npx @scalableweb/companion@0.1.0 start
```

Keep the companion running while you use your notebook.
It prints a local address and a pairing code valid for ten minutes.
In the book, choose **Notebook → Connect**, enter the address and code, and choose **Pair companion**.
If your browser requests permission to reach the local companion, allow it for the book website.
The code works once; restart the companion to obtain a new one after disconnecting, losing a browser session or expiry.

The default website is `https://scalableweb.dev`; local book development at `http://127.0.0.1:3000` is also allowed.
For another development address, pass its exact origin:

```sh
npx @scalableweb/companion@0.1.0 start --origin http://127.0.0.1:3100
```

The packaged companion uses a stable directory independently of your current folder and npm's cache:

| System | Default directory                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| macOS  | `~/Library/Application Support/scalableweb-companion/`                                                     |
| Linux  | `$XDG_DATA_HOME/scalableweb-companion/`, or `~/.local/share/scalableweb-companion/` when unset or relative |

The published release passed clean-installation checks on macOS and Linux with Node 24 and 26.
Windows support has not been verified.
The CLI prints your actual storage path; `--directory /absolute/path` selects a separate notebook.
Keep the companion running while using the book; Ctrl+C stops it without removing your work.

### Optional first investigation

After pairing, choose **Teaching assistant → Chapter guide**, or **Connect → Explore this reading**.
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
Restart the companion, pair its new code and reopen those notes to check continuity.
You can leave the investigation for your own question at any point.
This is optional support, with no required answer, minimum length, completion mark or additional course report.

## Capture and revisit your thinking

The header's **Notebook** button is always available for connecting or working on the current page.
Without a text selection, **Write** starts a note about that chapter/page and keeps its reading link.
To attach a passage, select text in the reading, then open **Notebook**; if it is already open, choose **Use selected text**.
Write shows the source and a short preview of the selected quote; it does not copy the whole chapter into your note.
The open notebook follows you between chapters, and **Notes** initially shows the current reading's entries; choose **Whole notebook** to see the rest.
Unfinished writing stays attached to its original source when you navigate, until you save it or deliberately start another note.
The assistant remembers its own section, unsent question and active conversation across chapter navigation, with its original source shown explicitly.
Closing either experience keeps the shared panel closed on later pages.
These unfinished drafts stay in this browser tab; save your notes before closing the tab.
**Notebook** has **Write**, **Notes** and **Concepts**.
**Teaching assistant** has **Discuss**, **Chapter guide** and **Peer discussion**.
**More learning tools** contains the shared **Connect** settings and, in Notebook, **Prepare**.
Quick notes may be short.
Use **Notes → Revisit** after a delay to recall an idea before rereading your earlier explanation; there is no schedule or completion requirement.
Developed reflections have prompts and examples to help you capture enough evidence and explanation.
There is no single correct conclusion: uncertainty, a failed experiment or a better-supported unchanged view can be useful material.

**Notes** lets you review saved revisions and revisit an earlier idea.
Try explaining it from memory and applying it to a changed situation before rereading your earlier explanation.
**Concepts** records your own revisable judgment and the notebook evidence behind it.
These markers do not grade or certify your understanding.

Select notes, then use **Prepare** to build and revise material for your existing diary or portfolio.
Download or copy the draft and review it against the course requirements before submitting through the course workspace.
Preparation does not expose your other notes or submit anything automatically.
Existing audio/video diary options remain available.

## Connect your agent

The first adapter uses the Codex CLI; it was verified with version 0.154.0.
Install that version if you do not already have it:

```sh
npm install -g @openai/codex@0.154.0
npx @scalableweb/companion@0.1.0 setup --codex
npx @scalableweb/companion@0.1.0 login
```

Stop the notebook-only companion, then start it with your dedicated Codex profile:

```sh
npx @scalableweb/companion@0.1.0 start
```

Pair the new code in the book.
Setup creates the dedicated profile before login and retains your provider choice.
Login uses Codex's own authentication flow; do not send credentials to the website or a support request.
The dedicated profile separates this learning space from your ordinary coding environment.
It must not contain custom configuration, hooks, plugins, rules or custom skills.
You can choose a profile with `--codex-home` or a model available to your account with `--model`.

In **Teaching assistant → Discuss**, choose a goal and help mode: a question, hint, direct explanation, reasoning check or reflection support.
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
Turn-linked notebook identities require an updated source-built companion; old conversations and the published 0.1.0 package remain readable without inferred links.
The updated source companion also applies the shared teaching policy and records its version on new replies.
**Connect** identifies the installed policy and **About this reply** shows the recorded setup for a reply; older replies retain their original history.
The published 0.1.0 package keeps its earlier instructions until a later package release.
Updating the website alone does not update your local assistant.

For a demo investigation, select its source and save your **Initial thinking** first.
Select that note for context, then ask your teaching assistant to inspect the demo.
Proposed changes ask for your approval and report actual browser controls and textual outputs.
Keep **Discuss** open during a tool request.
A demo that is absent, starting or unavailable cannot be treated as an executed experiment; open its linked page or use a manual check and the authored assumptions.

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
npx @scalableweb/companion@0.1.0 doctor
```

It checks storage/schema compatibility, the loopback port, and the optional Codex prerequisites.
Install the displayed verified provider version when it is missing or unsupported; run `login` for missing dedicated-profile authentication.
An account's access is checked on its first real reply.
Use `start --notebook` to continue writing without a provider.
If a port is busy, stop the other process or select `--port 8789` and pair that address.
For a storage permission error, select a writable private directory; do not reset the database.

In **Connect**, **Check connection** shows the package/protocol versions and storage path after successful pairing.
A failed or expired code needs a restart and a fresh single-use code.
An expired companion session needs pairing again; your notebook and unsaved browser draft remain available.
For an incompatible protocol, use the version shown in this guide and reload the book.
Browser network errors cannot reliably distinguish a stopped process, an origin mismatch or denied local-network access.
Check that the companion is running, that its allowed websites include the exact book origin, and that your browser permits local access.

`doctor --json` produces a local report containing versions, paths and check results, without notes, conversations, provider diagnostics, credentials or connection tokens.
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
npx @scalableweb/companion@0.1.0 start --directory /absolute/path/to/another-notebook
```

Keep a backup outside the companion's directory.
Your course membership does not give teachers or peers access to the private notebook.

Before updating, export a backup, stop the companion and privately copy its directory.
Choose a documented newer package version explicitly; retain the same storage directory, then restart and pair again.
Startup validates database schemas before writing and saves a `.before-schema-1-<id>.backup` snapshot when converting the original unversioned database to schema 1.
An interrupted conversion can be retried after stopping every writer; the backup remains available.
Older releases may reject newer schemas.
To roll back, stop the companion/provider and restore the full pre-update directory copy, retaining the upgraded copy separately; use its compatible release.
For a single schema conversion, privately retain the current database, copy its matching `.backup` file back as `notebook.sqlite` or `conversations.sqlite`, then use a compatible release.
Restoring a backup loses subsequent changes in that restored copy; keep exports/current files so you can review and recover them separately.
Keep the verified Codex version until a newer version has passed the documented provider check.

Portable notebook archives do not include credentials or raw conversations.
Conversations are stored separately in `conversations.sqlite`, with provider threads in the dedicated Codex profile.
To preserve conversation continuity as well, stop the companion and privately back up its directory and any separately configured profile.
Restoring only the portable notebook lets you start a new conversation from selected notes without depending on an old provider session.

### Move an existing repository notebook

Stop the old companion and its Codex process.
Before running packaged setup in the destination, migrate the old directory:

```sh
npx @scalableweb/companion@0.1.0 migrate --from /absolute/path/to/scalability_book/.local/learning-companion --confirm-stopped
```

The command shows source/destination, retains the source, and rejects a nonempty destination.
Use `--directory /absolute/path/to/new-location` when you need another destination.
It copies notebook history, conversations and an included dedicated profile without changing record identities.
After migration, run `setup --notebook`, or `setup --codex` and `doctor` to check the copied profile.
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
