# Concern-directed mutation lab

This fixture turns three tracker concerns into testable contrasts.
It contains a deterministic in-memory workspace and one deliberately incomplete test suite.

The starting requirements are:

- `W1` is active and belongs to `alice`; non-member `bob` has no access.
- Reusing a command identifier for the same logical command is a retry and must not append another event; conflicting reuse is rejected.
- A new command submitted after archival is rejected.

## Establish the starting point

From the repository root, run the baseline and all three mutants:

```sh
npm run lab:mutation -- baseline
npm run lab:mutation -- authorization-bypass
npm run lab:mutation -- retry-duplication
npm run lab:mutation -- archive-write
```

All four commands initially pass.
A passing mutant has **survived**: the current tests do not distinguish that fault from the baseline.
The runner exits with `0` when the selected suite passes, `1` when its tests fail, and `2` when the selection is unknown.

## Kill one mutant

1. Choose one concern and predict the public behavior that should differ.
2. Add one black-box test to `starter.test.ts`.
   Use only the exported tracker interface; do not branch on the mutation name.
3. Run the baseline.
   It must still pass.
4. Run the chosen mutant.
   Completion is a normal assertion failure from the new test, not a syntax, import, or setup failure.
5. Run the other mutants separately.
   Do not treat an incidental kill as proof that the test expresses their concerns well.

Record a small evidence table:

| Concern                     | Baseline outcome     | Mutant outcome                  | Distinguishing observation | What remains unproven                     |
| --------------------------- | -------------------- | ------------------------------- | -------------------------- | ----------------------------------------- |
| _Name the selected concern_ | _Command and result_ | _Command and failing assertion_ | _Observable behavior_      | _Realism, completeness, and other limits_ |

The comparison establishes that one test distinguishes one simulated fault from the baseline.
It does not prove the mutant is realistic, that the baseline has no related defect, or that the system satisfies the broader security or reliability requirement.
