## Chapter purpose

- Define friction as the practical symptom of technical debt.
- Help students notice friction in their own implementation A systems.
- Show how friction appears in code, tooling, documentation, tests, dependencies, and collaboration.
- Connect friction to agentic development: agents amplify both good structure and bad structure.

## Notes for further development

- Add a friction checklist that students can reuse before implementation B.
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
