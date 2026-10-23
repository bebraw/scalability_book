# Demo style and wording

The demos use the book's theme palette and typography, with a shared outer frame, header, status panel, and control treatment.
Diagrams can use layouts suited to their subject: a trace, statechart, queue, and map need different visual structures.

## Shared structure

Keep each demo's existing ID and `data-demo-anchor` attribute, then add these classes alongside its topic-specific classes:

```html
<section id="demo-example" data-demo-anchor aria-labelledby="example-title">
  <div class="example-header demo-header">
    <div>
      <p class="example-kicker demo-kicker">Example lab</p>
      <h3 id="example-title">Describe what the reader can investigate</h3>
    </div>
    <div class="example-summary demo-summary" aria-live="polite">
      <span>Current result or next action</span>
      <small>Explain the result's scope or a necessary assumption.</small>
    </div>
  </div>
  <!-- Topic-specific controls and results -->
</section>
```

The common rules at the end of `site/styles/demos.css` own this structure.
Change those rules when adjusting the shared treatment; avoid adding another set of header overrides for individual demos.
The gallery provides its own outer frame, while demos embedded in chapters use the shared grid surface and border.

## Visual rules

- Use the theme variables for surfaces, text, borders, and accents, including semantic success, warning, and error colors.
- Use the serif face for the demo title, the UI face for controls and explanatory labels, and the monospace face for code, formulas, and compact section labels.
- Use `--demo-font-label` as the minimum ordinary label size (0.75rem); use larger text for instructions and controls.
- Keep primary buttons, selects, and text/number inputs at least 2.5rem high; the inline help buttons use a 1.5rem target.
- Preserve the shared visible keyboard focus indicator and give scrollable records a keyboard focus target.
- Use square frames for panels and controls; rounded diagram nodes, status dots, and badges may communicate their own meaning.
- Stack the shared header at narrow widths, and contain wide diagrams or logs inside their own scroll regions.
- Inspect SVG text at its rendered size because its coordinate system can scale text independently of CSS labels.

## Wording rules

Titles should name an action or question, and control labels should describe what changes.
Explain metaphors before relying on them; prefer “Trade-offs” to “Waterbed lens” in a control panel.
Keep technical terms when they are the subject of the lesson, with a short explanation nearby.

Distinguish entered observations, browser measurements, model outputs, and invented teaching scenarios in the result itself.
For example, use “2 loops (simulated)” for a hypothetical workflow and “Elapsed time including frame waits” for the browser experiment.
Keep units and observation boundaries visible, and carry the qualification into copied output.
An illustrative score does not establish a measured performance improvement or a calibrated risk estimate.

## Learning value and local practice

The shared catalog owns 16 demos grouped into reading investigations and optional depth.
Give an investigation a concrete prediction or decision, inspectable consequences and a question that transfers to a changed case.
Use an explicit mechanism or stated formal model; keep capacity, productivity and risk claims tied to observed evidence.
The project direction, friction, fleet delegation and scaling prompts are now editable chapter templates rather than form-driven widgets.
Boundary traces, API exchanges, activation steps, the Goodhart case and changed-assumption incident are static evidence activities.
The Little’s Law exercise includes timestamped arrivals/completions and competing observation boundaries; numerical equality alone is not a measurement validation.
Model evaluation uses the learner’s actual preserved attempts, a frozen rubric and attributed observations; missing elapsed time or cost stays unknown.

The tail population exposes all 60 ordered records, nearest-rank p95 at rank 57 and the count missing the objective; it models no concurrency or queue.
The saturation model separates offered, admitted and completed rates, queue growth and rejection, with before/after capacity changes and separately revealed measurement hints.
The latency map uses neutral distances and direct hypothetical service timings; batching assumes unchanged results and query execution with at most two dependency rounds.
The web architecture lens models three exchanges—document, HTML fragment and JSON—with explicit draft restoration and no invented payload sizes.
The statechart accepts a premature RELEASE proposal and visibly rejects it; supplied TESTS_PASS events are not actual tests.
Replica convergence in orchestration is separate from simulated HTTP success; running-but-broken v2 returns 500, and rollback restores v1 responses without erasing the failures.
The contention and reliability models retain their explicit assumptions and corrected boundary interpretations.

ACID, retry and telemetry are short orientations.
ACID separates acknowledgement timing from transaction choice on restart; its ledgers and concurrency programs are authored rather than executed SQL.
Retry qualifies displayed and copied counts as modeled, then links to persisted process evidence.
Telemetry starts at a root span, asks for child-span evidence before revealing an interpretation, then offers a bounded instrumentation recipe for an existing project.
Do not require a local implementation of every model or add telemetry infrastructure for this orientation.

The [local practice workspace](../labs/README.md) supplies one setup and four independent exercises: CSV serialization, concern-directed mutation, persisted retry and HTTP cache.
Students select one exercise, use their own model/harness, maintain its specification and decision notes, and retain actual checks in its own evidence directory.
One unfinished exercise must not block another; the common preflight checks setup, not completed features.
Browser installation is optional for the mutation and retry exercises.
The CSV, retry and cache gaps fail their feature checks initially; the mutation starter needs a strengthened check that rejects a named fault while preserving baseline and the harmless storage refactor.
Completed candidates belong in disposable copies, never public starter sources.
Keep solutions, credentials, generated evidence and private reference code out of archives.

Keep the catalog, includes/scripts, preview images, reading embeds and agent-resource metadata consistent when retiring a demo.
There are no existing students; remove obsolete contracts and special compatibility paths.
All retained activities use bounded generic browser snapshots; activity versions describe authored meaning independently of snapshot schemas.
[ADR-055](adrs/implemented/ADR-055-consolidate-local-practice-and-retire-low-value-demo-interactions.md) records the consolidation and cuts, following [ADR-053](adrs/implemented/ADR-053-focus-demos-on-evidence-and-offer-executable-starters.md) and [ADR-054](adrs/implemented/ADR-054-correct-demo-inference-and-add-bounded-local-experiments.md).
The exploratory run must still test the learning benefit and time required.

## Review

Review all demos together at `/demos/`, then check the affected chapter or appendix embeds.
Use desktop and phone widths, change the theme, operate the controls, and inspect expanded records and results.
The gallery tests check shared header styles in all five themes, mobile containment, and control sizes; the accessibility tests check each demo and keyboard focus.
Run the affected interaction tests as well as `npm run build` and `npm run validate`.
Generate a readable working-copy diff with `npm run review`.
