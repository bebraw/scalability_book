# Elements of Scalable Web Applications

In this brief book, I discuss the elements behind scalable web applications. The book contains three projects (construct, reconstruct, and deconstruct) for you to complete that each illustrate a facet of scalability. By completing this book, you should understand different ways to build web applications while appreciating the problems that emerge when these applications have to scale. It is not only infrastructure that we have to consider but also the way we build applications. Therefore, scalability is not only a technical concern but also a social one. It has to do with how teams develop and maintain applications while requirements, constraints, and operating conditions change.

> **Optional: Sustainability angle**
>
> Scalability also has an environmental dimension. More traffic, more data, more retries, more logs, and more infrastructure all consume resources. Throughout the book, you can ask whether a design scales efficiently, not only whether it scales at all.

## Why should you read this book

By its nature, the book is more on the academic side and I have included references in each chapter for further study. I have tried to keep each chapter to the point, and the additional resources provide a fuller view of each topic. Together, the book and the projects give the concepts a concrete shape and deepen your understanding.

I wrote this book to capture my understanding of how to develop scalable web applications. Although the book is oriented toward the web, several principles discussed here apply more broadly. Even if you are not a web practitioner, you can likely still gain something from reading it.

In the age of AI-driven development, understanding the concepts behind scalability is perhaps more important than ever. For this reason, I focus more on concepts than on specific technical details, which tend to change over time. Through this book and the surrounding course, you will also learn how to use AI technologies critically so they support development while preserving attention to design quality, maintainability, and system constraints.

## Structure of the book

The course book is built around the three course phases: construct, reconstruct, and deconstruct. Across these phases, you build a baseline, change it under new constraints, and then inspect the evidence and trade-offs around the result. The purpose of this book is to support you as you complete these phases. With this goal in mind, I have structured the book in three matching parts: Construct, Reconstruct, and Deconstruct.

**Construct:**

1. How to develop in a scalable manner? -- How do the latest improvements to development techniques affect the way we develop? How can we get set with our development efforts the right way?
2. What is scalability? -- How do we define scalability in the first place?
3. What is the architecture of the web? -- How was the web built and what kind of constraints does that give to our designs? How do the constraints of the web shape API design?

**Reconstruct:**

4. What is friction in software engineering? -- What is friction and how to reduce it?
5. How to benchmark and observe web applications? -- Why is benchmarking important? How to benchmark effectively? What is observability?
6. What happens when systems face reality? -- What kind of problems might we encounter as our systems face reality and real users? How can we scale beyond a single machine?

**Deconstruct:**

7. How to coordinate agent fleets? -- How do project instructions, tests, task boundaries, roles, and review loops make agentic development safer and more scalable?
8. How to scale web applications? -- What to consider when scaling our web applications? What kind of scaling techniques exist at a technical level? How does latency caused by physical constraints affect our designs?
9. Recap -- What should we remember from the course after constructing, reconstructing, and deconstructing a scalable web application?

## Project artifacts

Each chapter should help you produce or revise one concrete project artifact. By the end of the course, these artifacts should form a small engineering portfolio around your event tracking system:

- Chapter 1: README, assumptions, and development process notes.
- Chapter 2: scalability dimensions checklist.
- Chapter 3: architecture and data-flow diagrams.
- Chapter 4: friction audit.
- Chapter 5: measurement and observability plan.
- Chapter 6: changed-assumptions and pressure map for Reconstruct.
- Chapter 7: agent instructions, task boundaries, and review workflow.
- Chapter 8: scaling trade-off table and revised event pipeline.
- Chapter 9: final evidence-based reflection.
