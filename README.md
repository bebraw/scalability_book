# Elements of Scalable Web Applications

This is the course book for the [Designing and Building Scalable Web Applications](https://fitech101.aalto.fi/en/courses/designing-and-building-scalable-web-applications) course held at Aalto University.

## Website

The book website is configured through [site.config.jsonc](site.config.jsonc). Use the `chapters` list there to choose which Markdown chapters are published; omitted chapters are not generated, which keeps work-in-progress material out of the site. The file supports `//` and `/* ... */` comments.

```bash
npm install
npm run build
npm start
```

`npm start` serves the site locally at `http://127.0.0.1:3000` with an Edit button on chapter pages. In this mode, all Markdown files under `chapters/` are shown regardless of the `chapters` list in `site.config.jsonc`, so drafts are easy to edit locally. The editor writes changes back to the Markdown chapter files and rebuilds the local static output after saving.

For a read-only static preview, use:

```bash
npm run serve
```

The build emits a static site to `build/` for `scalableweb.dev`. The deployed site remains read-only because the editing API exists only in the local dev server.
