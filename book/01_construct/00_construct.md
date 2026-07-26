# Construct

Construct is about building the first working version of the course project. The goal is not to create the final architecture immediately, but to make a concrete baseline that can later be inspected, stressed, and changed.

This part also introduces AI-assisted development as a practical force in modern web work. Fast development can be useful for prototypes, but it can also create hidden cost if the result is hard to understand, test, deploy, or modify. Alongside the project work, we consider what scalability means and establish the measurement protocol that will be reused for all three implementations.

---

## Notes for further development

- Replace the old “abundance” framing. Construct is now the locally hosted, single-agent build and establishes the behavioral and measurement baseline for the later comparisons.
- Introduce the common specification and acceptance suite here. Students should understand that they are constructing implementation A, not starting a codebase that will simply become implementations B and C.
- Keep the scope deliberately small so local-model limitations generate useful evidence rather than preventing groups from finishing.
- Explain which artifacts may transfer to later builds. Requirements, acceptance tests, examples, evidence templates, and lessons should transfer; application code should remain separate unless the final specification says otherwise.
- Ask students to record local hardware, model, quantization or serving configuration where relevant, latency, interventions, failed attempts, and active human time. Without that context, comparisons of local-model performance will be misleading.
- Make the benchmarking chapter operational before the Construct deadline. Every group should finish the phase with the first runtime measurement and the first complete development-workflow evidence package.
- Add the first bounded cross-team audit after the build. Its output should be a short external friction report, not ownership of the codebase.
