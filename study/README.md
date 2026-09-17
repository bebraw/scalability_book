# Self-study pilot

The site build exports two reviewed learning modules to `/learn/pilot/`.
The public sequence is deliberately smaller than the nine university lectures.
Obsidian remains the source for live teaching; `pilot/` is the versioned publication source.

## Build and preview

Run `rtk npm run build` or `rtk npm run dev` as usual.
For an independent export, run `rtk npm run study:export -- /tmp/study-review-1` with a new destination, then serve that directory over HTTP.
Do not open the generated pages through `file://`.

`exporter.json` pins the public Lecture Studio repository to a full commit.
On the first build, `scripts/lib/study-build.ts` fetches that commit into `.local/study-exporter/<revision>` and runs `npm ci` with the upstream lockfile and install scripts disabled.
Git, Node 24+, npm, and network access to GitHub and npm are required for this first build.
Later builds reuse the cached toolchain.
Only the generated public bundle is copied into the site output; the Studio server and source decks are never hosted.

Update the pin deliberately when Studio changes, then rebuild and review the complete bundle.
An npm exporter package can replace this checkout adapter later without changing the course configuration or public content.

## Editing and publication

1. Review changes to the Markdown, public `study` explanations, activities, and referenced assets in `pilot/`.
2. Keep slide IDs stable.
   Update diagrams/posters along with the model they explain.
3. Run the site build, unit checks, and `rtk npm run e2e -- tests/e2e/self-study.spec.ts`.
4. Review the pages under `/learn/pilot/`, including narrow screens and reading without JavaScript.
5. Deploy the complete site through its normal deployment process; do not overlay individual chunks from different exports.

Local Markdown images and `demoPoster` assets are embedded by the exporter.
The pilot includes the book's pressure-to-evidence SVG, Amdahl's model, and the lecture's Little's Law demo.
These are illustrative models, with assumptions and public explanations beside them.
The SVG posters are authored static illustrations, not recorded demo state.
Studio hides posters only after a demo initializes successfully; print, failed-demo, and no-JavaScript views retain them.

`study.exclude` removes classroom logistics.
Speaker notes remain private to the source deck.
The two `PRIVATE_…` markers in the scalability source exercise these export boundaries; they must not appear in the emitted site.
Public JSON contains formative answers by design.
Reflections have no invented correct option.
Progress and demo state stay in the learner's browser, keyed by module revision; changed public content starts fresh progress.

The production Worker and development server use `shared/study-headers.ts` to sandbox direct demo responses, serve `.mjs` as JavaScript, and revalidate stable export filenames.
The exporter retains its iframe sandbox and restrictive demo CSP.
Studio commit `186da32` fixes document assembly, duplicate posters, and empty no-JavaScript demo containers.
The site uses the generated bundle directly, without HTML normalization or CSS fallback patches.
No audience service, authentication, or Studio server is required to use the pilot.

Canonical exporter contract: [Lecture Studio self-study handover](https://github.com/bebraw/lecture-studio/blob/186da328a3deea328c85b566d107174ce645552c/docs/self-study-handover.md).
