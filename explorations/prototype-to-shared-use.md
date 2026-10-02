## Scenario

**Invented paper scenario.**
A colleague uses an agent to build a CSV exporter for the event tracker; it correctly exports one selected workspace's event types and timestamps from synthetic data.
The colleague and agent have permission to work only in the sandbox.
The colleague now asks to use it for the team's weekly report with live data.
For this fixture, each reader may export only their authorized workspace and the two named fields.
No operational owner or production access has been agreed.

## Investigate

1. State what the demonstration establishes and which claims about shared use remain untested.
   How would you check that changing a workspace identifier cannot expose another workspace's events?
2. Propose the smallest useful trial within an explicitly granted scope.
   Name who may access which data, who may deploy, what evidence permits each transition, and when the workflow must stop or return for a decision.
3. Assign an owner for correction, support, and retirement; define a rollback trigger and recovery path.
   If the exporter has already written an out-of-scope CSV file, what can reverting its code undo, and what obligation remains?
4. Define a period for assessing useful accepted reports, time saved, and recurring review, correction, and support effort.
   Which result would justify expanding access, revising the workflow, or retiring it?

Keep the proposed trial and remaining unknowns in the existing discussion or learning notes.
This exercise requires no live data, deployment, or additional project feature.

## Further reading

Geoffrey Huntley's [essay on organizational access](https://ghuntley.com/access/) argues for enabling more people to create software while engineering the controls around shared use.
Treat this as a practitioner proposal to examine: easier code generation leaves data access, deployment authority, and ongoing support to be settled.
