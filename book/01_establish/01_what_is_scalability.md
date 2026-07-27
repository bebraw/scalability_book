# What is scalability?

You might be familiar with the saying "works on my machine". There's a good reason for the saying since often web applications are developed in isolation at the developer's own machine or occasionally on top of a cloud platform meaning your view on the application is limited. Given the web has many different kinds of consumers, having only your own view can easily lead to a constrained perspective. The idea of heterogenous web is at the core of scalability and discussion around it. If you ask web developers about scalability, you will likely come with different types of answers. The purpose of this chapter is to make you think about different aspects around the topic to form your own idea of the topic.

## Dimensions of scalability

Scalability can be considered from multiple viewpoints ranging from development to how your web applications performs under load in practice. I will cover several of these angles next to give you some food for thought. The list won't be exhaustive as the idea is to get you thinking about the topic. I will cover the following five aspects of scalability I consider essential: development process, architecture, infrastructure, and data. I am sure there are different ways to frame this and you will develop your own ideas but it is a good starting point for discussion at least.

### Scalability of the development process

The way I see it, no matter what kind of web application you are developing, you always have to consider the scalability of your development process. With the introduction of large language models, this aspect has shifted largely now that building is cheap. That does not however mean that maintenance is any cheaper than before and you will have to learn to use models responsibly to avoid problems later on. Simply put, it is now easier than ever to accumulate massive amounts of technical debt. Arriving into these kind of situations might have required years or even decades of work before.

As you know, not all debt is meant to be paid, or paid ever. Therefore understanding the context is valuable. Technical debt may be acceptable for throwaway spikes, for example, where you want to see if a specific direction might make sense. If the direction does make sense, you can still go and re-engineer your solution to capture the technical characteristics you prefer. Consider for example adding a new view to your application. The idea might be to first see if the proposed user interface would make sense to use while working with mock data before wiring in a data model. The same approach can be used for evaluating technical approaches against each other while having specific metrics in mind and we will cover this idea later on in the book.

### Scalability of architecture

As a concept architecture is nebulous since it captures the way we shape things and how they relate to each other. In software, architecture is visible for example in the concepts of cohesion and modularity. The way we structure our software has impact on its scalability as it can either constrain or enable scalability related factors. For example tight coupling between services may make it complicated to deploy them to a loosely coupled deployment target. Coupling touches the concepts of boundaries and contracts as those are at the core of software architecture. Understanding responsibilities of different entities is one of the key tasks of a software architect after all. On top of this, a software architect has to consider how to evolve this all since often systems are not fixed and change over time. That is yet another factor that can have impact on the scalability of a system.

### Scalability of infrastructure

Consider what happens when your product gets discovered by an aggregator like Hacker News and makes it to the top. You can only imagine the amount of traffic you have to be able to deal with at once and it may be far more than you have prepared for. While this is generally a good thing in terms of business, it is also a scaling concern especially in terms of infrastructure since too much traffic can literally crash your site. How do you architect for a sudden spike of traffic like this? Since an event, such as a Hacker News traffic surge, is so short, it is difficult to react to it in time so you will have to prepare upfront. You will have to plan for spikes in time to make sure you can deal with success as otherwise your serves might be hugged to death, momentarily at least.

For infrastructure, the challenge is two-fold as typically you think about in terms of horizontal and vertical scalability. These mean either scaling a single node within infrastructure so that it is stronger, hence vertical or scaling up, or adding more nodes to the system as a form of horizontal scalability or scaling out. (TODO: Add citations for these for more info). It is a good question who is responsible for this portion of scalability since over time companies have moved from their own hosting towards cloud computing and beyond. These days it is possible to pay for function invocations bought from edge hosting providers meaning the economics behind infrastructure have changed considerably over the past few decades as computation has become abstracted and you might not be even aware as a developer where and how your code is running exactly.

### Scalability of data

While a considerable chunk of work has to do with computation and processing, underneath all this you typically have some type of data unless your application is ephemeral by its nature and does not store any permanent records. If you need records, then you will need to store your data somewhere somehow and this is typically the point where you either need a filesystem or a database or both. Data comes with its own sets of problems since you have to consider where it is stored and how. You may also want to backup your data so it does not get lost. To make things worse, you may have to consider how it is read and written while dealing with concurrent usage that may lead to conflicts. As you can see, the topic can get complex fast and this complexity depends largely on your use cases.

TODO: touch CAP and ACID

### Scalability in business context

Another way to look at scalability is to consider an established, even decades old service, that generates revenue yet requires maintenance and new features. Here the challenge is to make changes without breaking anything that used to work as that could be expensive. Furthermore, there is likely organizational structure to consider, and the system might simply be too big for a single developer to be able to make all the changes needed. On top of that, the stack used by the system might be considered antiquated or not following the latest technological trends at least. These examples illustrate inertia within older systems and affect their technical scalability. These systems might still scale well performance-wise, but it might be difficult to scale them otherwise due to technical or social concerns.

::: comment

### Premature scaling

Becoming too successful can kill a software product. That is essentially what dealing with scale is about, although it is important to keep in mind that premature scaling can also work against you. Now with agentic development tools, generating prototypes and learning about your market is faster than ever. Ideally you would be able to both iterate towards software business that works while being able to do it in a scalable manner. It is not only about technical scalability, but also about how you scale your development efforts. How can you retain your momentum as your product and company grow?

### Planning is good, reality has its own ideas

While we might have the best of plans, typically reality does not follow our assumptions. That said, it is better to plan than not, as planning gives us claims that evidence can challenge. In this book, three independent implementations address the same bounded application while shared pressure scenarios reveal where each design would become insufficient. We keep the scope primarily within the technical realm so you can form and defend your own view of technical scalability.

:::

### Scalability is multi-dimensional

As you can see, scalability is a multi-dimensional concept going beyond technical concerns. As a topic, it is open to interpretation and often different aspects of scalability are interrelated. They can also be conflicting which means that likely you cannot optimize each are at the same time but you may have to compromise. That is an important part of the engineering challenge and also the impetus behind this book as I want you to develop your own thinking around scalability.

I set up a simple demonstration to showcase the multi-dimensionality of scalability to show how different growth pressures affect different dimensions related to a project. Different pressures lead to different kinds of pressures to consider. The example highlights how projects can differ depending on their pressures within the same domain.

{{ import "site/includes/scalability-dimensions-demo.html" }}

Use the radar before choosing techniques. A system can scale one dimension while becoming worse in another.

## What scalability is not?

## Summary

TODO: Summary goes here

::: comment

## 2.2 The Dimensions of Scalability

“Can it scale?” is one of the most overused and underexplained questions in software.

Scale _what_, exactly?

Scalability is multi-dimensional. Different dimensions stress different parts of your system and often demand different design responses. In this book, we’ll focus on four primary dimensions:

1. **Users**
2. **Data**
3. **Teams**
4. **Change**

You cannot treat “scaling” as a single problem when these four often push in different directions.

> **Sustainability angle**
>
> Scaling a system usually scales resource consumption too. A design that handles 10x traffic by using 20x infrastructure may be technically scalable, but it is inefficient. Resource-aware scalability asks how much useful work the system delivers per unit of computation, storage, bandwidth, and operational cost.

### 2.2.1 Scaling Users

User scalability is the most obvious and most visible dimension: the ability of the system to handle increased load from more clients, more requests, or more concurrent activity.

The pressure may also appear inside the browser. More users often lead to larger and more dynamic views, and interactions can become slower as changes invalidate styles across a growing DOM even when the server remains fast. The benchmarking chapter returns to this as a client-side measurement problem.

Typical stress signals:

- API latency grows as request volume rises
- CPU and memory utilization spike under peak load
- Throttling and rate limiting become necessary
- “It was fine in staging; production dies under load”

User scaling forces you to think about:

- Concurrency and resource contention
- Load balancing and statelessness
- Caching and replication
- Capacity planning and autoscaling

But more users don’t just mean _more of the same_. They also change the distribution of behavior: edge cases become daily cases, rare bugs become common, and timing issues become deterministic.

### 2.2.2 Scaling Data

Data scalability is about both volume and variety:

- How much data can we store?
- How quickly can we write incoming events?
- How efficiently can we query old events?
- How long do we keep data, and in what form?
- How do schemas evolve when event types change?

In the project, data growth begins quietly. A small version might create only a few thousand events. A larger platform can produce millions of records across user actions, device readings, workflow transitions, status changes, and analytics. At that point, the system has to distinguish between the write path, the read path, and the analytical path.

Development ideas:

- Explain append-only event storage as a natural fit for tracking systems.
- Contrast normalized relational models with event logs and derived read models.
- Discuss retention, aggregation, deletion, and privacy.
- Use the project to ask: which data must be exact, which can be summarized, and which can be delayed?

### 2.2.3 Scaling Teams

Team scalability is about the ability of multiple people or groups to work on the system without constantly blocking or breaking each other.

Typical stress signals:

- Small changes require knowledge of the whole codebase.
- Ownership is unclear.
- Different groups make incompatible assumptions about shared data.
- Pull requests become large because boundaries are weak.
- New contributors need too much hidden context before they can work safely.

Team scaling forces you to think about modules, ownership, documentation, testing, and contracts. In the project, a small team can move quickly with informal coordination, but later phases should expose the cost of implicit knowledge. If the event model, API, or storage assumptions are unclear, reconstruction becomes harder.

Development ideas:

- Connect team scalability to Conway's Law.
- Show how API contracts and module boundaries reduce coordination cost.
- Treat documentation as an operational part of the system, not an afterthought.
- Relate agentic development to team scalability: agents also need explicit context and boundaries.

### 2.2.4 Scaling Change

Change scalability is the ability to keep evolving the system as requirements, tools, regulations, traffic patterns, and organizational needs shift.

Typical stress signals:

- The system works, but nobody wants to touch it.
- New features require risky rewrites.
- Dependencies cannot be upgraded.
- Tests are slow, flaky, or absent.
- Old design decisions are no longer documented.

Change scaling is central to this book because three development systems address the same required behavior independently. Implementation A establishes a baseline, implementation B supplies a second architectural hypothesis, and implementation C adds a fleet-produced result before students compare the evidence. A scalable system is not only one that handles more load. It is one that can survive being changed by people who did not make the original decisions.

Development ideas:

- Discuss technical debt as reduced change capacity.
- Explain why "easy to rewrite" is often an illusion.
- Introduce migration thinking: compatibility, staged rollout, data backfills, and rollback.
- Connect to later chapters on friction, observability, and fortification.

## Scalability, performance, and resilience

These terms often appear together, but they are not the same.

- Performance asks how fast or efficient the system is under given conditions.
- Scalability asks how the system behaves as some dimension grows.
- Resilience asks how the system behaves when parts fail.

A system can be fast but not scalable if it performs well only at one size. It can be scalable but fragile if a single dependency failure takes it down. It can be resilient but expensive if it survives failure by overprovisioning everything. The engineering task is to understand which property matters most under the current constraints.

> **Sustainability angle**
>
> Faster is not automatically more sustainable. A fast endpoint can still waste resources if it performs unnecessary queries, transfers oversized payloads, or runs continuously when no user value is produced. Efficiency needs its own evidence.

Development ideas:

- Use simple graphs: latency vs load, throughput vs workers, recovery time vs failure.
- Include examples where optimizing one property harms another.
- Tie this back to implementation B: students should name which dimension they are optimizing and what they are sacrificing.

## Constraints as design inputs

Constraints are not merely obstacles. They define the shape of a reasonable design. Time, money, team skill, legal requirements, cloud limits, latency, geography, and existing code all narrow the design space.

For the event tracking project, useful constraints include:

- A limited project duration.
- A small student team.
- Unknown future event volume.
- A domain where delayed correctness may be acceptable.
- Privacy expectations around user or entity behavior.

The goal is not to remove constraints but to use them honestly. A design that ignores constraints is usually not ambitious; it is vague.

## Project artifact

Students should create a scalability dimensions checklist for their project. The checklist should name which dimensions matter now, which dimensions are intentionally out of scope, and what evidence would show that a dimension is becoming important.

## Notes for further development

- The chapter currently mixes draft prose and outline notes. Decide whether to keep the numbered `2.x` structure or align headings with the other chapters.
- Add a small diagram showing the four scalability dimensions around the event tracking project.
- Replace the preview of cumulative reconstruction with a comparison question: once one implementation works, what evidence lets us compare it fairly with a fresh implementation produced through another development system?
- Use the chapter's multiple dimensions to prevent the AI comparison from swallowing the course. Require every build to address the same runtime pressures as well as development throughput, cost, review, and coordination.
- Add a compact table separating application scalability from development-system scalability. Candidate development dimensions include model latency, human review capacity, context size, task decomposability, integration cost, and inference/resource cost.
- Connect constraints to the local-model phase: hardware, privacy, availability, context, and latency are legitimate design inputs, not merely disadvantages to be overcome.
- Define a small set of scalability claims that every implementation must support with the same evidence. These should later become fields in the common specification and rubric.
- Obsidian candidate: `Clippings/_Processed/A Survey on Large Language Model Impact on Software Evolvability and Maintainability the Good, the Bad, the Ugly, and the Remedy.md` could support the "change" dimension. It frames LLM-assisted development as both a maintainability aid and a source of new technical debt, which fits the claim that development practice also has scalability limits.
- Obsidian candidate: `Clippings/_Processed/Every layer of review makes you 10x slower.md` could support the "teams" and "change" dimensions. Use it carefully as an opinionated practitioner piece about coordination latency, review bottlenecks, modularity, and quality systems rather than as a formal source.

:::
