# Concern-directed mutation lab

This fixture turns three tracker concerns into testable contrasts.
It contains a deterministic in-memory workspace and one deliberately incomplete test suite.
It also includes a behavior-preserving storage refactor so you can check whether a test rejects correct changes.

The starting requirements are:

- `W1` is active and belongs to `alice`; non-member `bob` has no access.
- Reusing a command identifier for the same logical command is a retry and must not append another event; conflicting reuse is rejected.
- A new command submitted after archival is rejected.

## Establish the starting point

From this lab directory, run the baseline, the storage refactor, and all three mutants:

```sh
npm run lab -- baseline
npm run lab -- storage-refactor
npm run lab -- authorization-bypass
npm run lab -- retry-duplication
npm run lab -- archive-write
```

When working from the book repository root, replace `lab` with `lab:mutation` in these commands.

All five commands initially pass.
A passing mutant has **survived**: the current tests do not distinguish that fault from the baseline.
The storage refactor is a correct variant, not a mutant to kill.
It stores events in one ordered log instead of separate arrays per workspace while preserving the public commands, results, and event order.
The runner exits with `0` when the selected suite passes, `1` when its tests fail, and `2` when the selection is unknown.

## Detect one fault and tolerate a refactor

1. Choose one concern and predict the public behavior that should differ.
2. Add one black-box test to `starter.test.ts`.
   Use only the exported tracker interface; do not branch on the mutation name.
3. Run the baseline.
   It must still pass.
4. Run the chosen mutant.
   Completion is a normal assertion failure from the new test, not a syntax, import, or setup failure.
5. Run `npm run lab -- storage-refactor` with the same tests.
   It must still pass; do not weaken or skip assertions based on the selected mode.
   If it fails, check whether the test depends on internal storage details or whether the claimed refactor changes the contract.
6. Run the other mutants separately.
   Do not treat an incidental kill as proof that the test expresses their concerns well.

Record a small evidence table:

| Concern                     | Baseline outcome     | Mutant outcome                  | Refactor outcome     | Distinguishing observation | What remains unproven                     |
| --------------------------- | -------------------- | ------------------------------- | -------------------- | -------------------------- | ----------------------------------------- |
| _Name the selected concern_ | _Command and result_ | _Command and failing assertion_ | _Command and result_ | _Observable behavior_      | _Realism, completeness, and other limits_ |

The comparison establishes that one test distinguishes one simulated fault from the baseline.
Passing the refactor adds evidence that the test tolerates this particular internal change.
It does not prove the mutant is realistic, that the baseline has no related defect, or that the system satisfies the broader security or reliability requirement.
One correct variant also cannot establish that a test tolerates every valid implementation.

### Optional: hold back defects when evaluating the tests

If you compare ways of generating tests, let a reviewer prepare additional contract-violating variants that the test-producing agent has not seen.
Use one set while improving the tests and reserve another for the final comparison.
Include correct variants too, distinguish broken fixtures from assertion failures, and exclude changes that preserve the tested behavior from the defect count.
Report missed defects and false failures separately; mocks and property assertions are useful when they exercise the intended boundary.
