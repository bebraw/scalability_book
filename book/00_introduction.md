# Elements of Scalable Web Development

_Architecture, measurement, scaling pressure, and agentic workflows_

When you open your team's activity feed on Monday morning, you want to know what changed since Friday.
You still want a quick, accurate answer when the feed holds a year of history.
To keep it fast, a developer might cache the latest entries.

Now suppose the team wants completed work to appear first.
A developer can change the query and still leave readers looking at entries in the old order.
The same cache that made the feed fast has made it harder to change.

This book studies [scalability](/concepts/#scalability) in two connected systems.
The application has to keep serving its readers as the history grows.
The people and agents who develop it need tools and practices that let them change a rule and check what readers see, even as the design grows more complex.

> **Sustainability angle**
>
> Serving a quick, accurate feed takes computation, storage, and network traffic.
> As demand grows, how much of each does it take to serve one useful result?

## Why this book now

If I had written this book a few years ago, I would have focused on web technologies.
[Coding agents](/concepts/#agent) changed that.
An agent can implement a feature, leaving the developer to decide what it should do, where it belongs, and whether the result is fit to maintain.
An agent can also be a user of that feature, reaching it through a browser, an API, or a tool.

[Loop engineering](/concepts/#loop-engineering) starts with decisions you face even with one coding agent.
When a check fails, you decide what feedback the agent receives, what it carries into its next attempt, and when it must stop for a person's decision.
The same questions recur when several agents work on a change that someone must review and accept.

While developing this book, I built projects whose complexity would previously have kept me from attempting them.
With [Slideotter](/case-studies/slideotter/), I could generate and export slide decks before I knew which authoring workflow was worth pursuing.
In [Kirjolab](/case-studies/kirjolab/), tests could tell me whether the editor worked.
They gave me less help deciding where the next change belonged.
With [Thesis Journey Tracker](/case-studies/thesis-journey-tracker/), I kept the scope small enough to put a tool to work in my own thesis supervision.

I wrote the chapters so you can consult them independently.
In the course I run at Aalto University, the project gives you room to make mistakes on a small application and form your own judgment about working with agents.

Terminology around coding agents and harnesses is still developing.
The [concept reference](/concepts/) gives working definitions and sources.
Its “Usage in this book” notes explain where a term has a particular meaning in the course.

## How this book was made

I developed this book with GPT-5.5 and GPT-5.6 through the iterative human–agent workflow it studies.
The collaboration let me explore more material and build interactive demonstrations.
I used type and browser checks to verify the publishing system.
I reviewed the arguments, checked how the text used its sources, and read the material as it appeared on the page.
Measuring the effect of that collaboration on productivity or student learning would take a separate study.
Readers can use the online edition's feedback tools to flag passages that still need work.

## One application, three development systems

In the [course project](/project/introduction/), you build the same [Work Activity Tracker](/project/) three times.
What users must be able to do through the browser stays much the same.
You choose how to represent their work, where to store it, and how to serve it.
Each phase starts with a fresh implementation.

1. **Establish.** Build A with one agent using an approved large model.
   Record how the application behaves and what it took to build.
2. **Challenge.** Build B with one agent using an approved small model.
   Test an architectural assumption from A and see which development practices carry over.
3. **Compare.** Build C with a fleet and declare which models it uses.
   Compare the three applications and the work it took to produce them.

{{ import "site/includes/course-progression-figure.html" }}

“Large” and “small” are relative to the models assigned for your course.
The department may host both.
Before each phase, the instructor publishes the model identities, the basis for the size comparison, and the access arrangements and limits.
Use the completed [environment sheet](https://github.com/bebraw/scalability_book/blob/main/specifications/course_environment.md) for your run.
A fleet may use approved small models, large models, or a mixture.
Whether coordination or model choice improves the quality of the accepted work, saves time, or reduces cost is something to investigate.

By the third build, you know things about the application that you had to discover during the first.
If a change comes more easily this time, experience is one possible explanation.
Your design, model, or tools may also have changed.
The shared specification, acceptance checks, pressures, and reporting categories give you a way to examine which explanation fits the evidence you collected.

## How the argument develops

### [Establish — Build and measure a baseline](/parts/establish/)

1. [What does scalability mean for web development?](/chapters/what-is-scalability/) Specify how quickly a growing feed must return the right entries and what evidence would convince you that it does.
2. [How can coding agents support scalable development?](/chapters/scalable-development/) Follow an agent's change from the first instructions through review and correction.
3. [How can we measure web applications and development workflows?](/chapters/benchmarking/) See how a load generator can hide the slowdown you set out to measure, and how counting completed tasks can mislead you about a development workflow.

### [Challenge — Expose architectural assumptions](/parts/challenge/)

4. [How does web architecture shape scalability?](/chapters/architecture/) Trace a request from the browser to the service that decides which data is current.
5. [How does development friction limit web projects?](/chapters/friction/) Follow one optional category field from a browser form through storage, filtering, and deployment.
6. [Which web application assumptions fail under pressure?](/chapters/reality/) Work through a lost response.
   The user may be about to retry a write that already succeeded.

### [Compare — Evaluate workflows and scaling responses](/parts/compare/)

7. [When do agent fleets improve web development?](/chapters/agent-fleets/) Split a feature among agents and check that their changes work together.
8. [How should web applications respond to scaling pressure?](/chapters/scaling/) Find the first limit under load, try one response, and measure the cost it introduces.
9. [What do three agent-assisted implementations teach us about web scalability?](/chapters/recap/) Use the three builds to choose an architecture and a way of working.
   Identify the result that would make you reconsider.

The main chapters provide the shortest path through the argument.
Let your current task or question guide deeper exploration through the [concept graph](/concepts/) and [curated starting points](/explore/).
Each starting point has a URL you can give directly to your agent, with a scenario to investigate one question at a time; you can also work through it yourself.
The [appendices](/parts/appendices/) preserve deeper evaluation methods, implementation details, security controls, and formal models for readers who need them.
