# Follow a request across boundaries

## Presentation

```yaml
version: 1
title: Follow a request across boundaries
```

## Slide: Locate the decisions behind the boxes

```yaml
id: boundaries
type: material
chapter: Read
source: Course book chapter 4; adapted from lecture 04
study:
  explanation: |-
    Architecture determines where computation runs, what crosses interfaces, where authoritative state lives, and who may perform an operation. A useful diagram also exposes ownership and how failures propagate.

    For a write, browser validation can improve feedback, but the component owning the authoritative state must enforce the rule. Name that component and the contract connecting it to the caller.
```

| Role           | Question                         |
| -------------- | -------------------------------- |
| Consumer       | Who expresses intent?            |
| Representation | What crosses the boundary?       |
| Execution      | Where is behavior evaluated?     |
| Authority      | Who preserves the current truth? |

[Read the chapter](./../../../chapters/architecture/)

## Slide: A timeout can follow a successful write

```yaml
id: request
type: material
chapter: Experiment
source: Course book chapter 4; adapted from lecture 04
demo: ./request-path.html
demoPoster: ./request-path.svg
study:
  explanation: |-
    Follow the request through browser, network, API, database, and response. A response lost after commit leaves the caller uncertain even though the effect is durable.

    The retry example assumes the effect and idempotency record are stored atomically. The key has a declared scope and retention period. This simplified model does not guarantee exactly-once effects in an external system.
  prompt: Select Response lost after commit and advance to the response. Repeat with Retry with the same key. Predict the number of durable effects.
  answer: The lost response leaves one durable effect and an uncertain client. A retry using the recorded key returns that result without another effect under the model's atomic-storage, scope, and retention assumptions.
```

Compare the stored effect with the client-visible outcome.

## Slide: What does the timeout establish?

```yaml
id: check
type: poll
room: study-pilot-architecture
chapter: Check
source: Course book chapter 4; adapted from lecture 04
poll:
  question: Which conclusion is justified?
  options:
    - id: option-0
      label: The write definitely failed
    - id: option-1
      label: Retrying with a new identity is always safe
    - id: option-2
      label: The client needs evidence of the stored outcome
  defaultId: option-0
study:
  answer: The client needs evidence of the stored outcome. A timeout describes what the caller observed, not whether the database committed. Reusing a supported idempotency identity or querying the result can resolve uncertainty; inventing a new identity may duplicate the effect.
  correctOption: option-2
```

The client receives no successful response.

## Slide: Who builds the next view?

```yaml
id: views
type: material
chapter: Read
source: Course book chapter 4; adapted from lecture 04
study:
  explanation: |-
    Compare three representative flows: an MPA receives complete server HTML documents; an HDA follows server-provided controls and receives HTML updates; a typical SPA receives data and builds views in the browser using CSR. Both HDA and SPA can update part of a page, so update size alone does not distinguish them.

    Then vary the first load. An SPA can start with server-rendered HTML and take over later rendering. Cached server HTML can serve an MPA or HDA while keeping its views and actions server-defined. Choose using freshness, cacheability, client work, accessibility, origin load, and failure behavior.
```

| Decision                | Examples                                   | Evidence to seek                          |
| ----------------------- | ------------------------------------------ | ----------------------------------------- |
| Construct the next view | Server HTML or browser rendering from data | Who defines views and available actions   |
| Apply the next view     | Whole document or targeted update          | Navigation and local-state behavior       |
| Deliver the first view  | SSR, SSG, ISR, CSR                         | Freshness and work at client/origin       |
| Preserve an invariant   | Authoritative service and store            | Authorization and concurrent-write checks |

## Slide: Make an architectural hypothesis

```yaml
id: apply
type: question
chapter: Apply
source: Course book chapter 4; adapted from lecture 04
study:
  prompt: Draw one write path. Mark its authority, retry identity, and ownership. Propose one boundary change and an observation that could contradict its expected benefit.
  answer: For example, moving optional work to a queue may reduce response time while adding delayed completion, duplicate handling, and recovery work. Measure both the request and completion boundaries. Reject the claim if the response improves only by violating the required completion or correctness goal.
```

[All modules](./../index.html) or [return to the book](./../../../).
