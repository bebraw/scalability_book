# Working on a course exercise

Read the workspace README and the selected exercise's README, SPEC.md and TASK.md.
The learner selects one exercise; keep changes in that folder and do not solve the other tasks as prerequisites.

- Start with the supplied preflight and preserve its result separately from feature checks.
- Implement only the named function or test unless the learner explicitly expands the task.
- Preserve fixed checks and fixture contracts.
  For mutation, add a black-box assertion to the student test suite; do not change the fixture variants or branch on their names.
- Maintain the selected specification and a consequential decision record.
  Reuse ideas from earlier work only after checking their assumptions.
- Keep records in the exercise's ignored `test-results/` and `.lab-data/` locations; use only synthetic local data.
- Do not move runtime or storage ownership into a shared module, make another exercise's solution a dependency, or add a combined all-exercises feature gate.
- Report the tested observable behavior and remaining limits.
  Do not relabel a setup failure, model prediction or authored example as executed evidence.

The workspace launcher and package setup support all exercises; change them only when that shared setup is the task.
