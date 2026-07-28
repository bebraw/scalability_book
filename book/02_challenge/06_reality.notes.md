## Notes for further development

- Add a concise incident narrative that can be reused in lecture.
- Connect this chapter to benchmarking: measurement reveals some forms of reality before users do.
- Connect this chapter to scaling: the next part should introduce specific techniques only after the pressure is clear.
- Keep changed assumptions as a shared thought experiment or pressure test applied to all three implementations.
  Do not make them a license to change the common functional scope of implementation B.
- Distinguish the immutable acceptance core from scalability scenarios.
  The implementation must satisfy the former; students use the latter to explain what would fail and how the architecture could respond.
- Ask students to compare whether the local and foundation-model implementations exposed different failure assumptions, and whether those differences came from architecture, generated defaults, or team decisions.
- Preserve identical pressure-map headings across phases so the final analysis can compare event volume, concurrency, storage growth, retries, partial failure, and eventual correctness directly.
- Add one prompt about development reality: what happens when model access, latency, privacy requirements, cost, or human review capacity changes?
