# Development

This document covers local website development, preview, feedback review, and deployment for the course book.

## Website Configuration

The book website is configured through [site.config.jsonc](../site.config.jsonc).
Use the `chapters` list there to choose which Markdown chapters are published; omitted chapters are not generated, which keeps work-in-progress material out of the site.
Use the `parts` list to group the nine course chapters into the three course sections, point at each part's Markdown intro file, and describe each section's allowed AI assistance mode.
The file supports `//` and `/* ... */` comments.

Markdown source files live under [book/](../book/), with each part intro next to its related chapters.
HTMLisp templates live under [site/](../site/): page-level templates are in `site/layouts/`, and reusable pieces are in `site/components/`.

Scientific references live in [bibliography.bib](../bibliography.bib).
Use `:cite[key]` for a parenthetical citation or `:citet[key]` when the authors form part of the sentence, and place `::bibliography[]` under a `## References` heading in each chapter that cites sources.
The build fails when a citation key is missing from the bibliography.

Scholarmark labels follow the block they identify.
Use `::label[id]` after a heading, paragraph, table, or figure and refer to it with `:ref[id]`.
For a GFM table, place `::caption[Caption text.]` immediately after the table and an optional label after the caption.

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

`npm run dev` serves the site locally at `http://127.0.0.1:3000` with an Edit button on book pages.
In this mode, all Markdown files referenced by `parts` are shown regardless of the `chapters` list in `site.config.jsonc`, so drafts are easy to edit locally.

Development output is kept in `.dev-build/`, separate from the production `build/` directory.
You can therefore build or preview the published site without removing draft chapter routes from a running development server.

The development server watches `book/`, `site/`, the site build helpers, `bibliography.bib`, and `site.config.jsonc`.
Saving CSS hot-swaps the generated stylesheets without losing page state.
Markdown, template, configuration, and browser-script changes rebuild `.dev-build/` and automatically reload the page after the atomic output swap.

The editor writes changes back to the Markdown source files and rebuilds the local static output after saving.
The editor uses EasyMDE for Markdown editing, preview, side-by-side view, and fullscreen mode.

For a read-only static preview, use:

```bash
npm run serve
```

The production build emits a static site to `build/` for `scalableweb.dev`.
The deployed site remains read-only because the editing API exists only in the local dev server.

Run browser-level checks with:

```bash
npm run e2e
```

## Feedback Review

The deployed Worker supports private paragraph-level feedback when `COMMENTS_KV` and GitHub OAuth are configured.
Students sign in with GitHub, use the paragraph comment control, and post comments.
Students see only their own comments and admin replies to those comments.
Admin users listed in `ADMIN_GITHUB_LOGINS` can see all comments, reply to comments, resolve comments, hide comments that should not be shown back to students, and feature curated reader notes publicly.

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
