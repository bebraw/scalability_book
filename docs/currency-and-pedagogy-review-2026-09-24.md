# Currency and pedagogy review — 24 September 2026

The preceding Obsidian additions were committed as `8b58d57`.
This review addresses aging assumptions and presentation in the existing book, with substantive revisions prepared for editorial review.

## Scope and judgment

The review prioritized model comparisons, delegation tools, benchmark claims, web-platform status, and the case studies.
It checked those claims against the course specifications, teaching notes, demonstrations, and selected primary sources.
It is a targeted currency audit, not a claim that every bibliography entry or external link has been revalidated.

The largest problem was a capability ranking embedded in the course design and demos.
Most dated research and incidents still serve a useful purpose when their tasks, configuration, and limitations remain visible.
Updating every example to the newest product would weaken that distinction and create recurring maintenance without necessarily improving learning.

## Revisions implemented

### 1. Make model capability an observation

The course contrasted a “local model” with a “foundation model,” and the Establish specification even prohibited foundation models.
These categories overlap: the [Stanford report introducing foundation models](https://crfm.stanford.edu/report.html) defines them through broad training and downstream adaptability, not hosting location.
Some planning and teaching notes also assumed that the second model would be more capable.

Challenge now uses a second approved **comparison model**, selected to test a stated hypothesis about task quality, cost, or development effort.
Its hosting is declared rather than prescribed by the term.
The revision preserves the local single-agent baseline and the preference for holding B's model constant in the fleet phase.
Establish prohibits unapproved configurations and routes, rather than a model category that could include its own assigned model.
Book prose, assignments, rubric, teaching notes, slides, site labels, diagram source, and example trace use the same terminology.

### 2. Remove product choice from permanent lab instructions

Appendix D's September 2026 product table mixed local harnesses, hosted repository tasks, and application orchestration while identifying Pi as the primary lab.
The course environment sheet had not actually assigned that product.

The replacement table teaches execution location, inherited authority, cancellation, workspace boundaries, and evidence retention across four delegation patterns.
Pi remains an optional source-reading example, and the OpenAI link now targets the [dedicated multi-agent guide](https://developers.openai.com/api/docs/guides/responses-multi-agent), rather than a rolling latest-model page.
Chapter 7 uses the assigned harness.
The environment sheet now requires a small traced preflight to verify the actual single-agent or fleet configuration and repeats that check after material routing or tool changes.

### 3. Remove the demos' predetermined capability ranking

The evaluation demo called its better fictional answers “Stronger model” and its worse answers “Smaller model.”
Those labels supplied the conclusion before students evaluated the outputs.
It also added the same three checkbox points to both answers without separate evidence that either passed those checks.

The demo now uses Attempt X and Attempt Y, keeps protocol checks outside the quality score, and explicitly identifies the sample answers and cost/latency figures as invented examples.
An incomplete pair cannot produce a comparative conclusion.
The fleet simulator likewise uses hypothetical profiles and names the assumed cost/review relationship; its numerical results remain illustrative, not calibrated predictions.

### 4. Keep published metrics attached to their actual study

Chapter 7's Vercel row cited a June product-design account but displayed a figure from a separate January Next.js evaluation.
The surrounding caveat was present, but the table encouraged readers to conflate the two.
The June account now stands on its own, and the 56% non-invocation result has a separate [direct source link and January 2026 scope](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals).
It teaches the distinction between retrieving guidance and following it, rather than a universal ranking of instruction formats.

Stripe's PR volume and integration-suite size now carry their February and March 2026 reporting dates.
Their existing denominator and task-coverage limitations remain explicit.
Slideotter, Webernetes, and Thesis Journey Tracker status statements now refer to the reviewed snapshot or the author's use at review time.
They do not imply ongoing verification of the products' present status.

## Material retained deliberately

- **Scalability laws, HTTP semantics, failure mechanisms, and older incident studies:** age alone does not invalidate their reasoning or teaching value.
- **No-Vary-Search:** the [HTTP Working Group document](https://httpwg.org/http-extensions/draft-ietf-httpbis-no-vary-search.html) was still an Internet-Draft in its 21 September 2026 revision, so the book's draft-status and target-cache verification advice remains appropriate.
- **Named model field notes and bounded harness benchmarks:** keep them as observations of specified configurations, not as current model recommendations or rankings.
- **Experimental tool qualifications:** [Claude Code's team documentation](https://code.claude.com/docs/en/agent-teams) still described the feature as experimental when checked; the catalog was removed for pedagogical durability, not because that qualification was demonstrably false.
- **Company-authored sources:** retain mechanism examples and explicit limitations; activity counts alone do not establish productivity, quality, or a course-wide effect.

## Maintenance before a course run

Complete the environment sheet's existing model, version, credit, data-boundary, and fallback assignments before students begin.
Recheck operational claims against the actual assigned versions, and preserve the observed configurations with student evidence.
A changed product name or benchmark leader is not, by itself, a reason to rewrite the conceptual chapters.
A changed task contract, unsupported setup instruction, invalid comparison, or superseded factual claim is.

## Validation

- `npm run build` completed, including the nine-module study export.
- `npm run validate` passed type checking and validation of 52 generated HTML files.
- Three focused unit tests passed for the progression diagram and fleet-trace fixture.
- Eleven focused browser tests passed across targeted runs for the two changed demos, progression layout, and project navigation/downloads.
- The browser run exposed stale project-link locators from earlier content revisions; those now check the current labels and canonical destinations.
- Both revised four-column tables rendered with a header and four complete data rows.
- Changed files passed Prettier checking and `git diff --check`.

This audit is a separate editorial pass following the earlier Obsidian additions; the Git history records both changes.
