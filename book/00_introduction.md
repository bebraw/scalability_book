# Elements of Scalable Web Applications

Building scalable web applications is not easy especially since there are multiple definitions for scalability.
In this book, I will discuss scalability from both development and technical perspectives.
The book has been split into three parts during which you will learn more about the topic and implement a project.
The project will remain the same but the way you implement it will change to give perspective on development level scaling.
You will pick up ideas behind technical scaling during this process.

> **Sustainability angle**
>
> Scalability also has an environmental dimension.
> More traffic, more data, more retries, more logs, and more infrastructure all consume resources.
> Throughout the book, you can ask whether a design scales efficiently, not only whether it scales at all.

## Why you should read this book

This book captures my current understanding how to develop web applications in a scalable way and in the book I share my latest learnings about the topic.
I finished my doctorate recently (2025) and I have been active in the scene for the past twenty years.
Besides the doctorate, [I have completed plenty of research about the topic](https://survivejs.com/research/).
If I had been writing this book last year (2025), it would have looked quite different.
Now in 2026 the shape of web development has changed as agent driven development through large language models has become a thing.
I believe this has changed the way we develop web applications for good (or worse).
The days of writing our applications fully by hand are over.

This shift in the scene meant I had to change my thinking about this book and understand what agentic web development is about.
Besides learning to develop the agentic way myself, I ran a conference called [Future Frontend](https://futurefrontend.com/) related to the topic and both of these moves gave me greater appreciation of the topic.
The important thing to note is that this book represents a snapshot of what I consider the current good practices, and you should always make up your own mind about scalability.
I can only give you some directions where to look.

If web development and scalability are close to your heart, then this might be a good book for you to read even if you skip the book projects.
I have tried to structure the book so that each chapter works on its own though understandably there are some subtle references between the chapters.
While researching the book, I came up with far more material than I could possibly include to it, so I have tried to include further references for you to study where relevant.
I think the key thing is to adopt a scalability oriented mindset so you understand why the topic is important and where to look when you hit the issues, preferably before.

## Structure of the book

The book follows three pedagogical moves: establish a baseline, challenge its assumptions, and compare the alternatives.
Across three independent implementations of one shared web application, you will learn to recognize scaling pressure, collect comparable evidence, make architectural trade-offs, and determine when additional computational or organizational capacity creates value rather than merely more complexity.

The subject of the book is scalable web applications.
The three AI-assisted development setups are the experimental lens through which we study them.
Application behavior remains substantially stable while the development setup changes, allowing the class to compare both application architectures and the systems used to produce them.

The [course project specification](/project/) defines a bounded Work Activity Tracker that each group implements three times.
The application behavior remains substantially stable while the development setup changes from a local single agent to a foundation-model single agent and then an agent fleet.
The specification leaves the product interpretation, stack, architecture, storage, and interface open so groups can make and compare real engineering choices without losing the common behavioral core.

**Establish:**

1. What is scalability? -- What has to remain useful as users, data, traffic, teams, and change grow?
2. How can development remain scalable? -- How do we constrain, generate, validate, and maintain software produced with AI assistance?
3. How do we measure and observe web applications? -- How do we define the shared workload and evidence needed to compare all three implementations?

**Challenge:**

4. How does web architecture shape scalability? -- Which boundaries and constraints shaped implementation A, and what architectural hypothesis should guide implementation B?
5. Where does development friction come from? -- Where does the cost of understanding, changing, testing, reviewing, and operating a system accumulate?
6. What happens when assumptions meet reality? -- Which assumptions fail under real users, data, concurrency, failures, costs, and constraints?

**Compare:**

7. How do we coordinate agent fleets? -- How do project instructions, tests, task boundaries, roles, and review loops make agentic development safer and more scalable?
8. How should systems respond to scaling pressure? -- How do all three implementations respond to the same pressures, and what would a justified target architecture retain or change?
9. What can the three implementations teach us? -- What conclusions does the evidence support, and which application architecture and development workflow would we choose under stated constraints?

## Project artifacts

Each chapter should help you produce or revise one concrete project artifact.
By the end of the course, these artifacts should form a small engineering portfolio around your event tracking system:

- Chapter 1: scalability dimensions checklist.
- Chapter 2: README, assumptions, and development process notes.
- Chapter 3: shared measurement protocol and implementation A baseline.
- Chapter 4: architecture reading, implementation A analysis, and an implementation B architecture hypothesis.
- Chapter 5: friction audit.
- Chapter 6: challenged-assumptions and pressure maps for implementations A and B.
- Chapter 7: agent instructions, task boundaries, and review workflow.
- Chapter 8: three-way scaling comparison, target design, and scaling trade-off table.
- Chapter 9: final evidence-based reflection.

## Notes for further development

- Preserve the traditional scalability thread explicitly.
  The three-build comparison is a way to study development scalability, but every implementation still has to be discussed in terms of users, data, traffic, failure, architecture, operations, and resource use.
- Preview the bounded cross-team audit as the place where unfamiliar readers test setup, documentation, hidden assumptions, and change friction.
  Do not promise a full handover-and-return cycle.
- Revisit the artifact list after the common specification is settled.
  Some artifacts should be produced for every build in a comparable evidence package; others should culminate in the final cross-build analysis.
- Use [`docs/three-build-project-direction.md`](../docs/three-build-project-direction.md) as the source of truth during this rewrite.
