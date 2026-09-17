# Choose and test a scaling response

## Presentation

```yaml
version: 1
title: Choose and test a scaling response
```

## Slide: Start with the observed limit

```yaml
id: evidence
type: material
chapter: Read
source: Course book chapter 8; adapted from lecture 08
study:
  explanation: |-
    Choose a response from observed or credibly projected constraints. A technique is not justified merely because it is associated with large systems.

    The book's pressure-to-evidence chain keeps the claim revisable: pressure, binding limit, response, trade-off, and evidence. A failed intervention can challenge the presumed limit as well as the response.
```

![Pressure, binding limit, response, trade-off, and evidence form a revisable engineering argument](./pressure-evidence.svg)

[Read the chapter](./../../../chapters/scaling/)

## Slide: Moving one limit can expose another

```yaml
id: capacity
type: material
chapter: Experiment
source: Course book chapter 8; adapted from lecture 08
demo: ./saturation.html
demoPoster: ./saturation.svg
study:
  explanation: |-
    This rate model gives every attempt one visit to every stage. Initial capacities are API 180/s, database 110/s, workers 150/s, and downstream 130/s. Offered attempts equal new work multiplied by one plus the declared retry fraction.

    The smallest stage capacity limits the pipeline. Admission rejects excess attempts in this model. It does not increase useful capacity, predict latency, or simulate a retry cascade or backlog recovery.
  prompt: Set new work to 150/s with zero retry overhead. Enable admission, then add 40/s at the limit. Where does the limit move and how much excess remains?
  answer: The database initially limits capacity to 110/s, leaving 40/s excess. Admission changes that modeled excess into explicit rejection. Increasing database capacity to 150/s makes downstream capacity of 130/s the new limit, leaving 20/s excess. These are declared attempt rates, not measured useful throughput.
```

Predict the binding stage before adding capacity.

## Slide: Did admission increase capacity?

```yaml
id: check
type: poll
room: study-pilot-responses
chapter: Check
source: Course book chapter 8; adapted from lecture 08
poll:
  question: What does rejecting excess at ingress do in this model?
  options:
    - id: option-0
      label: Raises capacity to 150/s
    - id: option-1
      label: Trades modeled backlog growth for 40/s rejected attempts
    - id: option-2
      label: Proves that end-to-end latency meets the target
  defaultId: option-0
study:
  answer: It trades backlog growth for 40/s rejected attempts. Capacity remains 110/s. Useful completion, latency, fairness, and client retry behavior need separate measurements; a cleaner queue does not prove the original user goal is met.
  correctOption: option-1
```

Offered demand is 150 attempts/s and the binding stage handles 110/s.

## Slide: Test where the cost moved

```yaml
id: obligations
type: material
chapter: Read
source: Course book chapter 8; adapted from lecture 08
study:
  explanation: |-
    Keep workload, dataset, environment, correctness criteria, and repetition rules comparable before and after an intervention. Record both revisions, errors, latency, useful throughput, resource use, and recovery.

    Use an application model at its declared boundary and a separate workflow model when discussing development. A fleet speedup calculation cannot establish an application queue's behavior.
```

| Response      | New obligation to exercise               |
| ------------- | ---------------------------------------- |
| Cache         | Invalidation and cold start              |
| Queue         | Duplicate handling and backlog recovery  |
| Replication   | Freshness and conflict rules             |
| Partitioning  | Routing and rebalancing                  |
| Rate limiting | Identity, fairness, and useful rejection |

## Slide: Define a bounded intervention

```yaml
id: apply
type: question
chapter: Apply
source: Course book chapter 8; adapted from lecture 08
study:
  prompt: Choose one observed limit and one response. State the predicted benefit, comparable workload, rejection criterion, and new failure/recovery check. Which result would make you undo the change?
  answer: For example, a cache may reduce origin reads but fail the goal if it serves stale results beyond the allowed bound. Compare warm and cold behavior, exercise invalidation, and retain raw repetitions. A negative result is useful when the baseline, intervention, and uncertainty are clear.
```

[All modules](./../index.html) or [return to the book](./../../../).
