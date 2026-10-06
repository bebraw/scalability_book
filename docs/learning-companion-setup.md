# Set up your learning notebook

Your notebook is a private space for questions, observations and reflection across the book.
You choose which material becomes a course submission or a shared contribution.
Reading the book does not require a companion or a model account.

## Start on your computer

Install Node.js 24 or newer, then get the book repository and its dependencies:

```sh
git clone https://github.com/bebraw/scalability_book.git
cd scalability_book
npm ci
npm run companion
```

Keep the companion running while you use your notebook.
It prints a local address and a pairing code valid for ten minutes.
In the book, choose **Notebook → Connect**, enter the address and code, and choose **Pair companion**.
If your browser requests permission to reach the local companion, allow it for the book website.
The code works once; restart the companion to obtain a new one after disconnecting, losing a browser session or expiry.

The default website is `https://scalableweb.dev`; local book development at `http://127.0.0.1:3000` is also allowed.
For another development address, pass its exact origin:

```sh
npm run companion -- --origin http://127.0.0.1:3100
```

## Capture and revisit your thinking

Use **Note** beside a paragraph to retain its text and source, or open **Notebook** for the current page.
Quick notes may be short.
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
mkdir -p .local/learning-companion/codex
CODEX_HOME="$PWD/.local/learning-companion/codex" codex login -c cli_auth_credentials_store='"file"'
```

Stop the notebook-only companion, then start it with your dedicated Codex profile:

```sh
npm run companion -- --codex
```

Pair the new code in the book.
The dedicated profile separates this learning space from your ordinary coding environment.
It must not contain custom configuration, hooks, plugins, rules or custom skills.
You can choose a profile with `--codex-home` or a model available to your account with `--model`.

In **Agent**, choose a goal and help mode: a question, hint, direct explanation, reasoning check or reflection support.
Select notebook entries in **Notes** when you want them included.
Sending a question shares that source and those selected entries with your model provider.
You can reopen saved conversations, stop a reply, or keep using the notebook without a model.
**Use as a notebook draft** lets you review and revise a suggestion before saving it with assistance provenance.

For a demo investigation, select its source and save your **Initial thinking** first.
Select that note for context, then ask your agent to inspect the demo.
Proposed changes ask for your approval and report actual browser controls and textual outputs.
Keep the Agent section open during a tool request.
A demo that is absent, starting or unavailable cannot be treated as an executed experiment; open its linked page or use a manual check and the authored assumptions.

## Compare with peers

In **Peers**, sign in using your course account and choose the course run and inquiry activity.
Save initial thinking for that source, then choose **Reveal peer inquiry**.
Only a declaration that you saved private work reaches the course API; your initial text remains local.
A concrete uncertainty is enough to begin.

Review the text and its audience before sharing.
Group inquiry is scoped to a phase allocation; course-cohort inquiry is visible to active participants in that run after their initial step.
Replies can preserve disagreement and link evidence or tool provenance.
**Reflect privately on this inquiry** prepares a local draft for your own revised explanation.
Only notes you later select enter an agent conversation or submission draft.

New members do not gain older group threads automatically.
Students who leave a group or withdraw retain read-only access to their own contributions and can remove their text.
Public review is a separate opt-in copy of the author's reviewed contribution; it does not publish the thread or classmates' replies.
Course staff review offers, and book editors decide what to publish through the existing Markdown review workflow.
Optional session prompts support your existing operator/challenger/validator practice; arrange meetings yourselves.

## Keep your work portable

The notebook is stored on your computer under `.local/learning-companion/` in the repository.
It is excluded from Git and published website output.
You can read and edit it without a model connection while the companion is running.

Use **Connect → Export notebook backup** to save a portable JSON archive.
On another computer, start the companion and use **Import a portable notebook**.
Identical records are retained once; imports with conflicting existing work are rejected without replacing your notes.
Keep both copies and start a separate notebook if you need to inspect a conflict:

```sh
npm run companion -- --directory .local/another-notebook
```

Export before moving or removing your repository directory, and keep a backup outside that directory.
Your course membership does not give teachers or peers access to the private notebook.

Before updating, export a backup and stop the companion.
Run `git pull --ff-only` and `npm ci` in the repository, retain `.local/learning-companion/`, then restart and pair again.
Keep the verified Codex version until a newer version has passed the documented provider check.

Portable notebook archives do not include credentials or raw conversations.
Conversations are stored separately in `conversations.sqlite`, with provider threads in the dedicated Codex profile.
To preserve conversation continuity as well, stop the companion and privately back up its directory and any separately configured profile.
Restoring only the portable notebook lets you start a new conversation from selected notes without depending on an old provider session.
