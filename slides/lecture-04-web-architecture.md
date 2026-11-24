---
marp: true
paginate: true
title: "Lecture 4: Web architecture"
---

# How does web architecture shape scalability?

## Lecture 4 · Establish presentations and Challenge launch

Present implementation A.
Which architectural decision would you keep or reconsider in a fresh build?

<!-- [Sources] lecture_plan.md#4-establish-presentations-and-challenge-launch; book/02_challenge/04_architecture.md -->

---

# What did implementation A teach you?

Present from the running project and its evidence.
Here is one way to do it.

- Show the path from a work-item change to its activity event.
- Explain one decision that shaped that path.
- Show a measurement, trace or failure that supports or limits your claim.

What question does that evidence leave open for B?
Use the following architecture prompts where they help explain your decision.

<!-- [Sources] lecture_plan.md#4-establish-presentations-and-challenge-launch; specifications/01_establish.md -->

---

# Four roles clarify a web request

| Role           | Architectural question                                      |
| -------------- | ----------------------------------------------------------- |
| Consumer       | Who or what initiates the interaction?                      |
| Representation | Which document, message, or interface crosses the boundary? |
| Execution      | Where is behavior evaluated?                                |
| Authority      | Which component decides and preserves the current truth?    |

One component may perform several roles.
Keep the responsibilities conceptually separate.

<!-- [Sources] book/02_challenge/04_architecture.md -->

---

# Trace the request before naming the pattern

For one important operation, follow:

**consumer → network boundary → representation → application logic → authority check → data read/write → response**

At every hop, ask:

- What contract is assumed?
- What can fail or become slow?
- Which state is local, copied, or authoritative?
- Who owns compatibility and recovery?

<!-- [Sources] book/02_challenge/04_architecture.md -->

---

# Rendering moves work across time and place

Start with **who builds the next view**:

- MPA example: server HTML, full-page navigation.
- HDA example: server HTML and action controls, targeted updates.
- SPA example: JSON data, browser renders the view (CSR).

Then choose how the **first view** arrives: request-time HTML (SSR), prebuilt HTML (SSG/ISR), or browser rendering (CSR).
An SPA can start with server HTML and render later views in the browser.

Compare their consequences for freshness, cacheability, client work, accessibility, navigation, origin load, and failure.

<!-- [Sources] book/02_challenge/04_architecture.md; https://htmx.org/essays/hypermedia-driven-applications/; https://react.dev/reference/react-dom/client/hydrateRoot -->

---

# Automated consumers change both demand and exposure

Distinguish:

- cooperative crawlers and monitors;
- authorized integrations and agents;
- unknown automation;
- abusive bots and scraping.

`robots.txt` coordinates cooperative crawling; it is not access control.

Authentication, authorization, rate policy, data minimization, and useful error responses protect application boundaries.

<!-- [Sources] book/02_challenge/04_architecture.md; book/04_appendices/C_advanced_web_boundaries.md -->

---

# Organizational boundaries become software contracts

Interfaces often mirror communication and ownership structures.

Ask:

- Which team can change this contract?
- Who coordinates a breaking change?
- Where does cross-team review become a bottleneck?
- Which service boundary exists for organizational convenience rather than runtime pressure?

Team topology and deployment topology are related, but they are not the same design.

<!-- [Sources] book/02_challenge/04_architecture.md -->

---

# Launch Challenge with an architecture hypothesis

Build the same tracker from a clean start with the approved small model and one coding agent at a time across the group.
Keep A’s primary stack unless the instructor approves a change.
Carry forward specifications, acceptance scenarios and lessons.
Leave A’s application code and implementation-specific tests behind.

- Which pressure in A justifies keeping or changing one architectural choice?
- What new obligation follows, and how will you check whether the choice works?

Rotate the team roles and update the capability ownership card for the main event workflow.

<!-- [Sources] specifications/02_challenge.md#team-focus-in-this-phase; specifications/00_common_project.md#8-permitted-transfer-between-implementations; book/02_challenge/04_architecture.md#project-artifact -->
