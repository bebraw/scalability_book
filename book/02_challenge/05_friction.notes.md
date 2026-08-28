## Chapter purpose

- Define friction as the resistance encountered while changing a web system across browser, contract, validation, data, representation, cache, and deployment boundaries.
- Separate protective friction from accidental repeated work.
- Help students identify commitment points and distinguish cheap introduction from safe reversal.
- Ground setup, comprehension, change, migration, and feedback friction in linked cases from Spotify, GitHub, Shopify, Stripe, and Slack.
- Apply one stable change request and audit rubric to implementations A and B.
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
9. Apply the workflow and friction audits to implementations A and B.

## Notes for further development

- Connect this chapter to the peer assessment process: friction is often felt by teammates first.
- Consider including a small before/after example where a tangled event handler is split into clearer validation, storage, and presentation pieces.
- Turn the friction audit into a standardized instrument applied to every build.
  Keep the same setup, comprehension, change, testing, review, operational, and coordination categories so cross-build comparisons are meaningful.
- Make the bounded cross-team audit the primary source of setup and comprehension evidence.
  Authors are poor judges of their own hidden context.
- Define one small common change request that auditors can attempt or estimate against each implementation.
  The change must be narrow enough to fit the audit and stable enough to compare.
- Separate generated-code friction from workflow friction.
  A clean final repository may still have required excessive retries, prompt repair, integration, or human review to produce.
- For implementation C, add fleet-specific coordination friction without changing the base audit rubric.
  This makes the cost of handoffs and parallel work visible as an additional dimension.
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
- Have them identify the three most expensive changes they can imagine making.
- Ask them to improve one feedback loop: setup, tests, linting, seed data, logging, or documentation.
- Ask them to time one focused, affected, baseline, and boundary-specific validation path and explain what distinct evidence each adds.
- Use the optional review-evidence exercise in Appendix A when compressed diffs or repeated agent review are relevant to the project.
