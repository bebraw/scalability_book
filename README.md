# Elements of Scalable Web Applications

This is the course book for the [Designing and Building Scalable Web Applications](https://fitech101.aalto.fi/en/courses/designing-and-building-scalable-web-applications) course held at Aalto University.

## Website

The book website is configured through [site.config.jsonc](site.config.jsonc). Use the `chapters` list there to choose which Markdown chapters are published; omitted chapters are not generated, which keeps work-in-progress material out of the site. The file supports `//` and `/* ... */` comments.

```bash
npm install
npm run build
npm start
```

The build emits a static site to `build/` for `scalableweb.dev`.
