# Instructor-only Audit Change Probes

> Do not include this file in the student-facing site or distribute all three prompts at the start of the course.
> Release only the prompt for the implementation that has already been submitted.

These probes measure how an unfamiliar group traces and changes one small vertical slice.
They use different product language but deliberately preserve the same technical shape.
Familiarity with the general probe pattern remains a practice effect and must be acknowledged in the final comparison.

## Common acceptance contract

Each probe adds one work-item property with exactly three supported string values.
The implementation must:

1. use the stated default when the property is omitted during creation;
2. allow a user to choose a supported value when creating a work item;
3. show the stored value in the primary view that shows the work item's current state;
4. preserve the value across an ordinary application restart;
5. reject an unsupported value without creating the work item or its creation event;
6. add or update at least one automated test covering a non-default or invalid value;
7. keep the existing validation command passing.

The probe does not require editing the property after creation, filtering by it, adding a new activity-event type, or migrating an external production database.
An implementation may perform an ordinary local schema migration if its chosen storage requires one.

## Establish probe: urgency

Add an `urgency` property to work items.

- Supported values: `routine`, `normal`, `urgent`
- Default: `normal`
- Acceptance: apply the common acceptance contract without adding unrelated scope.

## Challenge probe: effort

Add an `effort` property to work items.

- Supported values: `small`, `medium`, `large`
- Default: `medium`
- Acceptance: apply the common acceptance contract without adding unrelated scope.

## Compare probe: work type

Add a `work_type` property to work items.

- Supported values: `task`, `defect`, `experiment`
- Default: `task`
- Acceptance: apply the common acceptance contract without adding unrelated scope.

## Release and audit procedure

1. Freeze the phase submission before releasing its probe.
2. Give the auditing group only the current prompt and the common acceptance contract.
3. Complete setup and the ordinary audit before starting the change-probe clock.
4. Allow exactly thirty minutes for the probe.
5. Do not allow implementation authors to guide the auditors during the time box.
6. Collect the disposable patch or diff and the friction report required by the common specification.
7. Return the report to the authors after the audit; do not merge the probe into the submitted implementation.

## Comparison rubric

Use the report as evidence rather than reducing the audit to completion alone.

| Dimension | Record |
| --- | --- |
| Setup | Whether the documented path ran, elapsed setup time, and the first blocker |
| Comprehension | Time to locate the likely interface, application, domain, persistence, and test paths |
| Propagation | Boundaries and files changed, repeated representations, and hidden coupling |
| Validation | Existing and new checks run, their results, and missing evidence |
| Outcome | Complete, partial, blocked, or not attempted, plus acceptance items satisfied |
| Uncertainty | Assumptions, unfamiliar-stack effects, auditor changes, and unresolved questions |

Do not rank groups by raw completion time across different auditors or environments as though those conditions were controlled.
Compare the three audits within a group primarily through the recorded path, evidence, and sources of friction.
