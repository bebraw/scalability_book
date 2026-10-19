# Elements of Scalable Web Development

_Architecture, measurement, scaling pressure, and agentic workflows_

[Scalability](/concepts/#scalability) describes the relationship between changing pressure and the behavior people expect a system to maintain.
For a web application, that pressure may come from users, data, traffic, failures, geography, or new requirements.
The response may involve architecture and infrastructure, but it can also change cost, complexity, ownership, and the speed at which the application can evolve.

This book therefore studies two connected systems.
The first is the web application that receives requests, moves data, preserves authority, and produces browser-visible behavior.
The second is the development system of people, agents, tools, instructions, tests, and review that changes the application.
Scaling one while ignoring the limits of the other does not create a scalable project.

The central question is how application behavior and the development process can continue to meet their goals as pressure grows.

> **Sustainability angle**
>
> Scalability also has an environmental dimension.
> More traffic, more data, more retries, more logs, and more infrastructure all consume resources.
> Throughout the book, you can ask whether a design scales efficiently, not only whether it scales at all.

## Why this book now

If I had written this book only a few years ago, it would have focused strictly on web technologies rather than development itself.
[Coding agents](/concepts/#agent) changed that.
Developers can now delegate substantial parts of implementation, moving more of their attention toward specification, architecture, validation, and ownership.
Agents are also becoming consumers of web applications through browsers, APIs, and tools.
This step up in abstraction brings its own opportunities and challenges, and this book examines how web development changes when agents participate on both sides of the application boundary.

[Loop engineering](/concepts/#loop-engineering) is a central practice in that development system: designing how agent work starts, uses feedback and retained progress, stays within authority and resource limits, and stops or escalates.
The book follows these choices from one agent's repair loop through fleet coordination and the evidence needed to accept a change.

While developing this book, I built projects whose complexity would previously have kept me from attempting them.
The case studies examine several of them, including [Slideotter](/case-studies/slideotter/), [Kirjolab](/case-studies/kirjolab/), and [Thesis Journey Tracker](/case-studies/thesis-journey-tracker/).
Each taught me something different: generation can outpace product judgment, architecture can lag behind implementation, and deliberately narrow scope can turn the same capability into dependable software.
Reading about other people's experience helps, but there is also value in making bounded mistakes of your own and forming your own judgment.

While the book was developed to support a course I run at Aalto University, I have tried to keep the chapters independent so that you can use it as reference material.
The course project complements the book and lets you experience different ways of developing web applications with agents.

The book uses established vocabulary where possible.
Terminology around coding agents and harnesses is still developing, and some labels describe this course's protocols or organizing framework.
The [concept reference](/concepts/) gives working definitions, related sources, and “Usage in this book” notes where scope or terminology needs explanation.

## How this book was made

I developed this book with GPT-5.5 and GPT-5.6 through the iterative human–agent workflow it studies.
The collaboration let me explore more material and build interactive demonstrations; validation and curation remained my central editorial work.
Type and browser checks helped validate the publishing system; I reviewed the argument, source interpretation, and rendered teaching material.
This account reflects my experience rather than a controlled comparison of productivity or learning outcomes.
The online edition remains a living book whose feedback tools support continuing review.

## One application, three development systems

The [course project](/project/introduction/) implements the same [Work Activity Tracker specification](/project/) three times.
The required browser-visible behavior remains substantially stable while product interpretation, stack, rendering, storage, interfaces, and architecture remain open to justified choices.

Each phase begins from a fresh implementation and changes the development setup deliberately:

1. **Establish:** an approved large model in a single-agent workflow produces implementation A and its evidence baseline.
2. **Challenge:** an approved small model in a single-agent workflow produces implementation B while the course exposes architectural assumptions and development friction.
3. **Compare:** a declared fleet of small models, large models, or a mixture produces implementation C before all three applications and development workflows are compared.

{{ import "site/includes/course-progression-figure.html" }}

Large and small describe the relative model configurations assigned for the course.
The [environment sheet](https://github.com/bebraw/scalability_book/blob/main/specifications/course_environment.md) is the template for the model identities, size basis, access, and limits the instructor must publish before each phase.
Use the completed assignment for your course run; “To be announced” is not a usable model configuration.
Both may be hosted by the department; hosting location is separate from size.
Neither hosting location nor model size establishes which workflow will perform better on the course tasks.
The large-model first phase gives students a starting environment for learning the workflow; the small-model phase tests which practices transfer, and the fleet phase investigates coordination and model assignment.
Whether those choices improve accepted quality, time, or cost remains a question for the evidence.

The comparison is bounded rather than perfectly controlled.
You enter each later phase with greater domain knowledge; implementations may make different design choices, and model or tool configurations can change.
The shared specification, acceptance material, pressures, and reporting categories make those differences discussable without pretending that the course establishes a universal ranking.

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

7. [When do agent fleets improve web development?](/chapters/agent-fleets/) selects coordination structures for bounded work and makes integration and correction part of the workflow.
8. [How should web applications respond to scaling pressure?](/chapters/scaling/) selects architectural responses from measured limits rather than from a technique catalog.
9. [What do three agent-assisted implementations teach us about web scalability?](/chapters/recap/) synthesizes a justified target architecture and development workflow from the three builds.

The main chapters provide the shortest path through the argument.
Let your current task or question guide deeper exploration through the [concept graph](/concepts/) and [curated starting points](/explore/).
Each starting point has a URL you can give directly to your agent, with a scenario to investigate one question at a time; you can also work through it yourself.
The [appendices](/parts/appendices/) preserve deeper evaluation methods, implementation details, security controls, and formal models for readers who need them.
