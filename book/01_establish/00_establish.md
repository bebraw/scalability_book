# Establish

Establish defines the question the rest of the book will investigate: what does it mean for a web application—and the process used to develop it—to scale? The part introduces scalability as a multi-dimensional idea, gives students a disciplined AI-assisted development workflow, and establishes the evidence needed for later comparison.

The [Construct project brief](/project/construct/) defines implementation A and its locally hosted, single-agent constraint. The goal is not to create the final architecture immediately, but to produce a concrete behavioral, architectural, and measurement baseline that can later be challenged and compared.

Across the part, students first define scalability, then build a first answer, and finally replace impressions with measurements. Fast development can be useful for prototypes, but it can also create hidden cost if the result is hard to understand, test, deploy, or modify.

---

## Notes for further development

- Replace the old “abundance” framing. Construct is now the locally hosted, single-agent build and establishes the behavioral and measurement baseline for the later comparisons.
- Introduce the common specification and acceptance suite here. Students should understand that they are constructing implementation A, not starting a codebase that will simply become implementations B and C.
- Keep the scope deliberately small so local-model limitations generate useful evidence rather than preventing groups from finishing.
- Explain which artifacts may transfer to later builds. Requirements, acceptance tests, examples, evidence templates, and lessons should transfer; application code should remain separate unless the final specification says otherwise.
- Ask students to record local hardware, model, quantization or serving configuration where relevant, latency, interventions, failed attempts, and active human time. Without that context, comparisons of local-model performance will be misleading.
- Make the benchmarking chapter operational before the Construct deadline. Every group should finish the phase with the first runtime measurement and the first complete development-workflow evidence package.
- Add the first bounded cross-team audit after the build. Its output should be a short external friction report, not ownership of the codebase.
