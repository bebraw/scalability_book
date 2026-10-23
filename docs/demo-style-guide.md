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

The shared catalog owns 29 demos grouped into reading investigations, optional depth and project worksheets.
Give an investigation a concrete prediction or decision, inspectable consequences and a question that transfers to a changed case.
Use an explicit mechanism or stated formal model for a simulation; keep capacity, productivity and risk claims tied to observed evidence.
The fleet and scaling worksheets prepare scope, handoffs and trade-offs without forecasting effort or assigning numerical relief scores.
The recap's static Compare evidence index preserves submission prompts without a separate checklist widget.

The constraint feedback loop explicitly labels its candidates and checks as scripted.
Its download is an authored example, separate from executed validation.
The optional [CSV starter](../labs/csv-export/README.md) supplies a working local page, a single serialization gap, a specification and fixed acceptance checks.
Students use their own model and harness, maintain specifications and decision records, and inspect actual downloaded bytes within existing study time.
The unfinished starter must fail its feature checks while its setup preflight passes; validation of a completed candidate belongs in a clean disposable copy.
Do not put a completed solution, model credentials or generated check records in the starter download.

Keep the catalog, includes/scripts, preview images, reading embeds and agent-resource metadata consistent when retiring a demo.
Increment the authored activity version when its meaning changes; browser snapshot schema versions are independent.
Historical notebook entries retain their recorded sources and use the general learning loop when a specialized activity is retired.
See [ADR-053](adrs/implemented/ADR-053-focus-demos-on-evidence-and-offer-executable-starters.md) for the decision and verification boundary.

## Review

Review all demos together at `/demos/`, then check the affected chapter or appendix embeds.
Use desktop and phone widths, change the theme, operate the controls, and inspect expanded records and results.
The gallery tests check shared header styles in all five themes, mobile containment, and control sizes; the accessibility tests check each demo and keyboard focus.
Run the affected interaction tests as well as `npm run build` and `npm run validate`.
Generate a readable working-copy diff with `npm run review`.
