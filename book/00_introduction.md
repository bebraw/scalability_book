# Elements of Scalable Web Development

_Architecture, measurement, scaling pressure, and agentic workflows_

Scalability describes the relationship between changing pressure and the behavior people expect a system to maintain.
For a web application, that pressure may come from users, data, traffic, failures, geography, or new requirements.
The response may involve architecture and infrastructure, but it can also change cost, complexity, ownership, and the speed at which the application can evolve.

This book therefore studies two connected systems.
The first is the web application that receives requests, moves data, preserves authority, and produces browser-visible behavior.
The second is the development system of people, agents, tools, instructions, tests, and review that changes the application.
Scaling one while ignoring the limits of the other does not create a scalable project.

Coding agents make this connection especially important.
Writing every line of a web application by hand is no longer a sensible default for most projects: agents can now perform substantial parts of the implementation loop from a specification and feedback from their environment.
That added production capacity does not remove the need for software engineering.
It moves more human attention toward intent, architecture, constraints, validation, integration, and ownership while making weak feedback loops more consequential.

Agents are consequently treated here in the context of web development rather than as a separate subject.
The central question is how application behavior and the development process can continue to meet their goals as pressure grows.

> **Sustainability angle**
>
> Scalability also has an environmental dimension.
> More traffic, more data, more retries, more logs, and more infrastructure all consume resources.
> Throughout the book, you can ask whether a design scales efficiently, not only whether it scales at all.

## Why this book now

If I had written this book only a few years ago, it would have focused strictly on web technologies rather than development itself.
Coding agents changed that.
Developers can now delegate substantial parts of implementation, moving more of their attention toward specification, architecture, validation, and ownership.
Agents are also becoming consumers of web applications through browsers, APIs, and tools.
This step up in abstraction brings its own opportunities and challenges, and this book examines how web development changes when agents participate on both sides of the application boundary.

During the past few months, I have developed projects whose complexity would previously have kept me from attempting them.
The case studies examine several of them, including [Slideotter](/case-studies/slideotter/), [Kirjolab](/case-studies/kirjolab/), and [Thesis Journey Tracker](/case-studies/thesis-journey-tracker/).
Each taught me something different: generation can outpace product judgment, architecture can lag behind implementation, and deliberately narrow scope can turn the same capability into dependable software.
Reading about other people's experience helps, but there is also value in making bounded mistakes of your own and forming your own judgment.

While the book was developed to support a course I run at Aalto University, I have tried to keep the chapters independent so that you can use it as reference material.
The course project complements the book and lets you experience different ways of developing web applications with agents.

## How this book was made

I developed this book with GPT-5.5 and GPT-5.6 through the kind of iterative human-agent workflow it studies.
That collaboration let me explore more material and build interactive web demonstrations, but it also made validation and curation the central editorial work.
I kept the main path relatively light by moving deeper investigations into case studies and appendices.
The online edition remains a living book, and its feedback tools are part of that continuing review.

The broader implication is that agents can help a person create a book tailored to a topic they want to study.
Producing text is no longer the main constraint; validation and curation are.
The way I developed this book reflects how I now develop web software in collaboration with models, and many of the lessons extend beyond web development.

## One application, three development systems

The course project implements the same [Work Activity Tracker specification](/project/) three times.
The required browser-visible behavior remains substantially stable while product interpretation, stack, rendering, storage, interfaces, and architecture remain open to justified choices.

Each phase begins from a fresh implementation and changes the development setup deliberately:

1. **Establish:** a locally hosted model in a single-agent workflow produces implementation A and its evidence baseline.
2. **Challenge:** a foundation model in a single-agent workflow produces implementation B while the course exposes architectural assumptions and development friction.
3. **Compare:** a declared agent fleet produces implementation C before all three applications and development workflows are compared.

The comparison is bounded rather than perfectly controlled.
You enter each later phase with greater domain knowledge; implementations may make different design choices, and model or tool configurations can change.
The shared specification, acceptance material, pressures, and reporting categories make those differences discussable without pretending that the course establishes a universal ranking.

Each main chapter ends with a **Project artifact** section.
These sections are staged checkpoints for building the current phase's evidence; they do not silently create separate submissions.
The [common project specification](/project/) and current phase specification provide the authoritative deliverable checklist, and one clearly structured artifact may satisfy several chapter checkpoints.

> **Protect learning, not only output**
>
> Immediate task performance is not the only outcome worth protecting.
> Across three randomized experiments involving short arithmetic and reading-comprehension tasks, brief AI assistance improved work while it was available but reduced later unaided performance and persistence; the decline was concentrated among participants who used AI for direct solutions, while hint-oriented users did not differ significantly from the control group :citep[liu2026assistance].
> These tasks do not establish the long-term effect on professional programming, but they support a practical course rule: use agents for hints, critique, and verification when the underlying skill must remain yours.

## How the argument develops

### [Establish — Build and measure a baseline](/parts/establish/)

1. [What does scalability mean for web development?](/chapters/what-is-scalability/) defines scalability through maintained goals, pressures, constraints, and evidence.
2. [How can coding agents support scalable development?](/chapters/scalable-development/) examines how intent, authority, validation, correction, and ownership shape agent-assisted work.
3. [How can we measure web applications and development workflows?](/chapters/benchmarking/) creates comparable runtime and development evidence for implementation A.

### [Challenge — Expose architectural assumptions](/parts/challenge/)

4. [How does web architecture shape scalability?](/chapters/architecture/) traces how responsibility moves across servers, cloud, edge, rendering, data, and caches.
5. [How does development friction limit web projects?](/chapters/friction/) follows the cost of changing one web behavior across those boundaries.
6. [Which web application assumptions fail under pressure?](/chapters/reality/) uses documented incidents and the course project to connect failed assumptions, signals, and recovery.

### [Compare — Evaluate workflows and scaling responses](/parts/compare/)

7. [When do agent fleets improve web development?](/chapters/agent-fleets/) grows one agent into a bounded fleet and makes correction part of the workflow.
8. [How should web applications respond to scaling pressure?](/chapters/scaling/) selects architectural responses from measured limits rather than from a technique catalog.
9. [What do three agent-assisted implementations teach us about web scalability?](/chapters/recap/) synthesizes a justified target architecture and development workflow from the three builds.

The main chapters provide the shortest path through the argument.
The [appendices](/appendices/) preserve deeper evaluation methods, implementation details, security controls, and formal models for readers who need them.
