# Elements of Scalable Web Applications

In this brief book, I discuss the elements behind scalable web applications. The book contains three projects (construct, reconstruct, and deconstruct) for you to complete that each illustrate a facet of scalability. By completing this book, you should understand different ways to build web applications while appreciating the problems that emerge when these applications have to scale. It is not only infrastructure that we have to consider but also the way we build applications. Therefore, scalability is not only a technical concern but also a social one. It has to do with how teams develop and maintain applications while requirements, constraints, and operating conditions change.

> **Sustainability angle**
>
> Scalability also has an environmental dimension. More traffic, more data, more retries, more logs, and more infrastructure all consume resources. Throughout the book, you can ask whether a design scales efficiently, not only whether it scales at all.

## Why should you read this book

By its nature, the book is more on the academic side and I have included references in each chapter for further study. I have tried to keep each chapter to the point, and the additional resources provide a fuller view of each topic. Together, the book and the projects give the concepts a concrete shape and deepen your understanding.

I wrote this book to capture my understanding of how to develop scalable web applications. Although the book is oriented toward the web, several principles discussed here apply more broadly. Even if you are not a web practitioner, you can likely still gain something from reading it.

In the age of AI-driven development, understanding the concepts behind scalability is perhaps more important than ever. For this reason, I focus more on concepts than on specific technical details, which tend to change over time. Through this book and the surrounding course, you will also learn how to use AI technologies critically so they support development while preserving attention to design quality, maintainability, and system constraints.

## Structure of the book

The course book is built around the three course phases: construct, reconstruct, and deconstruct. Across these phases, you build a baseline, change it under new constraints, and then inspect the evidence and trade-offs around the result. The purpose of this book is to support you as you complete these phases. With this goal in mind, I have structured the book in three matching parts: Construct, Reconstruct, and Deconstruct.

The [course project specification](/project/) defines a bounded Work Activity Tracker that each group implements three times. The application behavior remains substantially stable while the development setup changes from a local single agent to a foundation-model single agent and then an agent fleet. The specification leaves the product interpretation, stack, architecture, storage, and interface open so groups can make and compare real engineering choices without losing the common behavioral core.

**Construct:**

1. How to develop in a scalable manner? -- How do the latest improvements to development techniques affect the way we develop? How can we get set with our development efforts the right way?
2. What is scalability? -- How do we define scalability in the first place?
3. How to benchmark and observe web applications? -- How do we define the shared workload and evidence needed to compare all three implementations?

**Reconstruct:**

4. What is the architecture of the web? -- How was the web built and what kind of constraints does that give to our designs? What can the Construct implementations teach us about architecture before Reconstruct?
5. What is friction in software engineering? -- What is friction and how to reduce it?
6. What happens when systems face reality? -- What kind of problems might we encounter as our systems face reality and real users? How can we scale beyond a single machine?

**Deconstruct:**

7. How to coordinate agent fleets? -- How do project instructions, tests, task boundaries, roles, and review loops make agentic development safer and more scalable?
8. How to scale web applications? -- What to consider when scaling our web applications? What kind of scaling techniques exist at a technical level? How does latency caused by physical constraints affect our designs?
9. Recap -- What should we remember from the course after constructing, reconstructing, and deconstructing a scalable web application?

## Project artifacts

Each chapter should help you produce or revise one concrete project artifact. By the end of the course, these artifacts should form a small engineering portfolio around your event tracking system:

- Chapter 1: README, assumptions, and development process notes.
- Chapter 2: scalability dimensions checklist.
- Chapter 3: shared measurement protocol and Construct baseline.
- Chapter 4: architecture reading, Construct architecture analysis, and an implementation B architecture hypothesis.
- Chapter 5: friction audit.
- Chapter 6: changed-assumptions and pressure map for Reconstruct.
- Chapter 7: agent instructions, task boundaries, and review workflow.
- Chapter 8: scaling trade-off table and revised event pipeline.
- Chapter 9: final evidence-based reflection.

## Notes for further development

- Rewrite the opening project description around three independent implementations of one common brief rather than one implementation that is successively changed. Introduce the sequence compactly: local single agent, foundation-model single agent, then agent fleet.
- Explain early that the application requirements stay substantially fixed while the development system changes. This is what makes comparison possible.
- Preserve the traditional scalability thread explicitly. The three-build comparison is a way to study development scalability, but every implementation still has to be discussed in terms of users, data, traffic, failure, architecture, operations, and resource use.
- Replace “the running project” with language that distinguishes the shared problem and acceptance suite from the three separate implementations.
- Preview the bounded cross-team audit as the place where unfamiliar readers test setup, documentation, hidden assumptions, and change friction. Do not promise a full handover-and-return cycle.
- Revise the artifact list after the common specification is settled. Some artifacts should be produced for every build in a comparable evidence package; others should culminate in the final cross-build analysis.
- Use [`docs/three-build-project-direction.md`](../docs/three-build-project-direction.md) as the source of truth during this rewrite.
