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
