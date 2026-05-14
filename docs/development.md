# Development

This document covers local website development, preview, feedback review, and deployment for the course book.

## Website Configuration

The book website is configured through [site.config.jsonc](../site.config.jsonc). Use the `chapters` list there to choose which Markdown chapters are published; omitted chapters are not generated, which keeps work-in-progress material out of the site. Use the `parts` list to group the nine course chapters into the three course sections, point at each part's Markdown intro file, and describe each section's allowed AI assistance mode. The file supports `//` and `/* ... */` comments.

Markdown source files live under [book/](../book/), with each part intro next to its related chapters. HTMLisp templates live under [site/](../site/): page-level templates are in `site/layouts/`, and reusable pieces are in `site/components/`.

## Local Development

Install dependencies, build the site, and start the local editable server:

```bash
npm install
npm run build
npm start
```

`npm start` serves the site locally at `http://127.0.0.1:3000` with an Edit button on book pages. In this mode, all Markdown files referenced by `parts` are shown regardless of the `chapters` list in `site.config.jsonc`, so drafts are easy to edit locally.

The editor writes changes back to the Markdown source files and rebuilds the local static output after saving. The editor uses EasyMDE for Markdown editing, preview, side-by-side view, and fullscreen mode.

For a read-only static preview, use:

```bash
npm run serve
```

The build emits a static site to `build/` for `scalableweb.dev`. The deployed site remains read-only because the editing API exists only in the local dev server.

## Feedback Review

The deployed Worker supports private paragraph-level feedback when `COMMENTS_KV` and GitHub OAuth are configured. Students sign in with GitHub, use the paragraph comment control, and post comments. Students see only their own comments. Admin users listed in `ADMIN_GITHUB_LOGINS` can see all comments, resolve comments, and hide comments that should not be shown back to students.

Local editing stores feedback data in `.local/comments.json`. To review production feedback locally, pull from Cloudflare KV first:

```bash
npm run comments:pull -- --namespace-id <comments-kv-namespace-id>
npm start
```

After resolving or hiding comments locally, push the moderation state back to KV:

```bash
npm run comments:push -- --namespace-id <comments-kv-namespace-id>
```

`comments:push` only copies local `resolvedAt`, `resolvedBy`, `hiddenAt`, and `hiddenBy` fields to matching remote comments. It does not overwrite comment bodies or delete comments. `comments:sync` runs push first, then pulls the latest KV state back into `.local/comments.json`.

Feedback setup details are in [feedback-setup.md](feedback-setup.md).

## Cloudflare Worker

The site can be deployed through Wrangler as a Cloudflare Worker with static assets bound from `build/`:

```bash
npm run worker:build
npm run worker:dev
npm run deploy
```

`worker:build` generates the static site and a small asset manifest for the Worker. `deploy` publishes [worker/index.ts](../worker/index.ts) using [wrangler.jsonc](../wrangler.jsonc).
