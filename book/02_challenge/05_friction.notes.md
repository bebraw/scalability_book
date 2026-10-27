## Chapter purpose

- Define friction as the resistance encountered while changing a web system across browser, contract, validation, data, representation, cache, and deployment boundaries.
- Separate protective friction from accidental repeated work.
- Help students identify commitment points and distinguish cheap introduction from safe reversal.
- Ground setup, comprehension, change, migration, and feedback friction in linked cases from Spotify, GitHub, Shopify, Stripe, and Slack.
- Apply phase-specific probes with one stable change shape and audit rubric to implementations A and B.
- Connect friction to agentic development: agents can reduce, amplify, or relocate it.

## Implemented spine

1. Trace one event-category change from the browser to production.
2. Identify setup, comprehension, change, testing, review, deployment, operational, and coordination friction along that path.
3. Separate protective friction from accidental friction.
4. Use a linked table of documented cases as evidence about distinct points in the change path.
5. Identify when an API, data, queue, cache, or deployment choice crosses a commitment point.
6. Reduce friction through versioned environments, traceable responsibilities, and explicit contracts without hiding boundaries.
7. Show how agents can move friction into review, debugging, operations, and ownership.
8. Match the feedback ladder to the changed boundary.
9. Reuse workflow and bounded audit evidence to record one bottleneck, response and check result or justified next step per phase.

## Notes for further development

- Connect this chapter to the peer assessment process: friction is often felt by teammates first.
- Consider including a small before/after example where a tangled event handler is split into clearer validation, storage, and presentation pieces.
- Use the common audit protocol for every build, and retain one compact evidenced friction entry per phase.
  Setup, comprehension, change, testing, review, deployment, operational and coordination categories are optional prompts, not mandatory measurements or separate reports.
- Make the bounded cross-team audit the primary source of setup and comprehension evidence.
  Authors are poor judges of their own hidden context.
- Use the defined thirty-minute change probes and audit rubric.
  Keep the product language phase-specific while holding the affected creation, validation, persistence, display, and testing path stable.
- Separate generated-code friction from workflow friction.
  A clean final repository may still have required excessive retries, prompt repair, integration, or human review to produce.
- For implementation C, use fleet handoffs and parallel work as possible sources of the required finding without changing the base audit rubric or requiring another category report.
- Obsidian candidate: `Clippings/_Processed/Harness engineering for coding agent users.md` could strengthen the chapter's feedback-loop framing.
  The feedforward/feedback distinction maps well to setup instructions, tests, linters, architecture notes, and review prompts as friction reducers.
- Obsidian candidate: `Clippings/_Processed/Every layer of review makes you 10x slower.md` could support a short section on review friction.
  The useful angle is not "skip review", but "move repeatable review comments into tools, tests, formatters, conventions, and smaller module boundaries".
- Keep the company-authored case-study caveat visible and avoid treating reported figures as transferable expectations.
- If cases are replaced later, preserve coverage of project setup and deployment, environment drift, architectural comprehension, live data migration, and feedback-system pressure.

## Drafting scaffold moved from reader content

- The central claim could be: scalability is not only about handling more users.
  A project also has to scale the work of changing it.

### Forms of friction

Possible subsections:

- **Setup friction**: the project is hard to run locally.
- **Comprehension friction**: it is unclear where behavior lives or why decisions were made.
- **Change friction**: small feature changes require edits in many unrelated places.
- **Testing friction**: tests are missing, slow, flaky, or disconnected from important behavior.
- **Review friction**: diffs are large, noisy, or hard to reason about.
- **Operational friction**: logs, errors, configuration, and deployment behavior are unclear.
- **Coordination friction**: people duplicate work or break each other's assumptions.

### Event-tracking examples

Examples to develop:

- Event types are stored as free-form strings, so typos become data quality problems.
- The UI and backend disagree about required event fields.
- Filtering works only because the dataset is tiny.
- There is no seed data, so every reviewer tests with different assumptions.
- The storage model makes simple summaries difficult.
- There is no clear place to add validation.
- AI-generated code works but follows several inconsistent patterns.
- The chosen theme is not documented clearly enough, so later readers cannot tell which domain assumptions are intentional.

### Reducing friction

Possible techniques:

- Make setup reproducible with one documented command.
- Define module boundaries and name responsibilities clearly.
- Add focused tests around the most important behavior.
- Write down assumptions before they become archaeology.
- Use schema validation where data crosses boundaries.
- Keep APIs small and explicit.
- Add useful error messages.
- Keep generated code under the same review standard as human-written code.

### Exercise ideas

- Ask students to perform a friction audit of implementation A.
- As an optional prediction exercise, identify a plausible expensive change, then name the observation that could test the prediction.
- Ask them to improve one feedback loop: setup, tests, linting, seed data, logging, or documentation.
- Ask them to time one focused, affected, baseline, and boundary-specific validation path and explain what distinct evidence each adds.
- Use the optional review-evidence exercise in Appendix A when compressed diffs or repeated agent review are relevant to the project.
