## Scenario

A classifier must name the single layer affected by a proposed change, choosing `interface` or `data`.
In an invented policy-development batch of 20 single-layer changes, every output chooses `interface` with confidence `0.9` and passes schema validation.
The fixture's independently adjudicated reference labels are assumed correct: 12 are `interface` and eight are `data`.
These are teaching inputs, rather than results from Clef or another model.

## Investigate

1. Calculate the observed reference agreement for this confidence group.
   Compare it with the reported confidence: what does each quantity measure, and what would you need before trusting the score on future changes?
2. Suppose one change alters authorization and the project's policy requires human review.
   Does a valid label or a higher confidence score satisfy that requirement?
   Name the independent gate that should enforce it.
3. Change the input: a diff crosses both layers, or the model receives an incomplete diff.
   What can neither label express, and when should the workflow abstain, retrieve more evidence, or escalate?
   Define that path even if the model returns a high score.

Use development cases to set the policy, then freeze it and evaluate on fresh held-out cases using the [routing outcome and cost accounting](/appendices/evaluating-agentic-workflows/#from-evaluation-to-routing).
Record reference-label uncertainty, incorrect routes, abstentions, missing context, and changed task families; one confidence group does not describe calibration over every workload.
Keep the findings in the existing evaluation notes.

## Further reading

[Guo and colleagues' calibration paper](https://proceedings.mlr.press/v70/guo17a.html) defines the calibration question.
The numbers here are invented teaching inputs, not measurements from that paper or Clef.
