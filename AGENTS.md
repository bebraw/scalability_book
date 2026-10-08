# Repository guidance

@/Users/juhovepsalainen/.codex/RTK.md

## Find the relevant contract

- [ARCHITECTURE.md](ARCHITECTURE.md) maps the current runtime, state, and documentation owners.
- [docs/development.md](docs/development.md) owns development commands and verification guidance.
- [docs/adrs/README.md](docs/adrs/README.md) records lasting decisions and their implementation status.
- `book/` owns the reading material; `case-studies/` owns supporting examples.
  Follow the publishing and ScholarMark conventions in the development guide.
- `specifications/` contains student-facing course contracts, not software implementation specs.
  Course behavior and operating instructions live in [docs/course-system.md](docs/course-system.md).

Read the documents relevant to the task and follow their links as needed.
Accepted ADRs describe agreed future work; they do not mean that behavior exists today or expand the scope of the current task.

## Make changes reviewable

For highlighted HTML reviews, serve the report over loopback HTTP, open and inspect it in the browser, and provide the live review URL.
Keep the review server running until the user asks to close it; a local HTML file link alone is insufficient.
Follow [docs/reviewing-changes.md](docs/reviewing-changes.md).

Update the owning documentation in the same change as a behavior or contract change.
Add or update an ADR when choosing between meaningful architectural alternatives, establishing a lasting constraint, or superseding a decision.
Use the lifecycle in the ADR guide; leave small, reversible implementation choices in the code and ordinary change description.

Before materially expanding a capability, identify its entry point, state owner, public contract, and dependency direction.
Keep domain rules shared between the local server and Worker.
Review ownership when a module becomes difficult to change; split by responsibility when justified, rather than by an arbitrary line count.

For a bug, reproduce a concrete trigger, reduce it, fix the cause, and verify the observable result.
Add a regression test when it protects meaningful behavior at a stable boundary.
Use the smallest relevant checks while iterating and the development guide's checks before calling the work ready.
Do not add tests that merely repeat the implementation or introduce tooling solely to check a reversible prose edit.

Keep generated output and local records in their documented locations.
Never use real student records as test fixtures.
Honor the user's existing authorization within its scope; do not introduce a separate approval ritual for routine work.
