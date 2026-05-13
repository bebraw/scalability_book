# What is scalability?

You might be familiar with the saying "works on my machine". Often web applications are developed in the context of a local computer, or these days even on a service directly on top of a cloud platform, meaning your view on the application is limited. As systems become more complex, they also become easier to break. That is where the concept of scalability comes in. But what is scalability exactly?

## Dimensions of scalability

There are multiple ways to look at scalability. Consider for example what happens when a web-based product of a startup becomes popular and gains more users than the company might have ever imagined to be possible. It is in this case that normally the performance boundaries of a service are discovered as most likely the quality of the service will begin to degrade in one way or another. When people think about scalability, performance is perhaps the first aspect that comes to their mind but it is not the only aspect.

Another way to look at it is to consider an established, even decades old service, that generates revenue yet requires maintenance and new features. Here the challenge is to make changes without breaking anything that used to work as that could be expensive. Furthermore, there is likely organizational structure to consider and the system might simply be too big for a single developer to be able to make all the changes needed. On top of that, the stack used by the system might be considered antiquated or not following the latest technological trends at least. These examples illustrate inertia within older systems and affect their technical scalability. These systems might still scale well performance-wise but it might be difficult to scale them otherwise due to technical or social concerns.

Most software dies not because it was bad, but because it was successful.

It gets more users than expected, more data than imagined, more teams than planned, and more change than it was ever designed to tolerate. The result is familiar: outages, frantic hotfixes, late-night incident calls, slowing delivery, growing complexity, and mounting fear of touching “that part of the system.”

This book is about designing and evolving systems _so that success doesn’t kill them_.

We’ll approach this through a narrative: a single product that starts small, finds traction, then grows into a large-scale, long-lived system. Along the way we’ll make choices, hit limits, refactor, and sometimes regret what we did three chapters earlier.

Before we dive into that story, this chapter sets the stage:

- What it means for a system to “scale”
- How scalability differs from performance and resilience
- Why constraints are not obstacles, but design inputs
- Why most systems fail _after_ they become successful
- How we’ll use a project arc to turn abstract principles into concrete engineering decisions

## 2.1 The Course Narrative & Project Arc

Rather than present scalability as a catalog of patterns and technologies, we’ll follow a single system over time.

Imagine we're building a product: an event tracking application that records meaningful activity in a chosen domain. One group might track a conference, another might track a classroom workflow, a shop, a game, a sensor network, or a support process. At first, the application may only track a few event types for a small number of users. Later, the same idea has to support many domain instances, many users, high event volume, unreliable networks, and delayed processing.

At the beginning, it’s just:

- A small backend API
- A database
- A simple web dashboard
- A handful of users

It works. It’s simple. It’s fine.

Then success arrives:

- Traffic grows from dozens to millions of requests per day
- Customers demand stricter SLAs and compliance
- Product and sales teams multiply
- The data we store grows from megabytes to terabytes
- The system must integrate with many other systems
- Features must ship faster, not slower

Our project arc will follow this journey through distinct phases:

1. **Prototype and early traction**
   - “Get something working.”
   - Single service, single database, minimal infrastructure.
   - Engineering priorities: speed of development and correctness.

2. **First scaling pain**
   - Traffic spikes, outages, slow queries, brittle deployments.
   - “We just need to make it stop falling over.”
   - Introduce basic observability, caching, and capacity planning.

3. **Growing teams, growing complexity**
   - New product lines, multiple teams contributing, conflicting priorities.
   - Conway’s Law starts to show up in the architecture.
   - Move from a single codebase mindset to modular boundaries.

4. **System as a platform**
   - Other teams and external partners now depend on our APIs and data.
   - We need stable contracts, versioning, backward compatibility.
   - The system becomes infrastructure, not just an app.

5. **Operating at scale under constant change**
   - Large volumes of traffic and data, constant experiments, frequent deploys.
   - We must manage risk, blast radius, resilience, and cost.
   - Architecture and organization choices become deeply intertwined.

Each chapter will live inside this narrative:

- We’ll introduce a _pressure_ (more users, data, teams, or change).
- We’ll make or evaluate design choices under real constraints.
- We’ll look at tradeoffs: when a pattern helps and when it hurts.
- We’ll revisit earlier decisions with the clarity of hindsight.

The aim is not to design the “perfect” architecture, but to learn how to:

- Recognize scaling dimensions early
- Use constraints to focus design
- Reduce the cost of change over time
- Grow a system in a way that stays understandable and operable

## 2.2 The Dimensions of Scalability

“Can it scale?” is one of the most overused and underexplained questions in software.

Scale _what_, exactly?

Scalability is multi-dimensional. Different dimensions stress different parts of your system and often demand different design responses. In this book, we’ll focus on four primary dimensions:

1. **Users**
2. **Data**
3. **Teams**
4. **Change**

You cannot treat “scaling” as a single problem when these four often push in different directions.

> **Optional: Sustainability angle**
>
> Scaling a system usually scales resource consumption too. A design that handles 10x traffic by using 20x infrastructure may be technically scalable, but it is inefficient. Resource-aware scalability asks how much useful work the system delivers per unit of computation, storage, bandwidth, and operational cost.

### 2.2.1 Scaling Users

User scalability is the most obvious and most visible dimension: the ability of the system to handle increased load from more clients, more requests, or more concurrent activity.

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

Change scaling is central to this book because the project itself changes shape. Construct asks for a simple working application. Reconstruct changes the assumptions. Deconstruct asks students to explain what happened and why. A scalable system is not only one that handles more load. It is one that can survive being changed by people who did not make the original decisions.

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

> **Optional: Sustainability angle**
>
> Faster is not automatically more sustainable. A fast endpoint can still waste resources if it performs unnecessary queries, transfers oversized payloads, or runs continuously when no user value is produced. Efficiency needs its own evidence.

Development ideas:

- Use simple graphs: latency vs load, throughput vs workers, recovery time vs failure.
- Include examples where optimizing one property harms another.
- Tie this back to the Reconstruct project: students should name which dimension they are optimizing and what they are sacrificing.

## Constraints as design inputs

Constraints are not merely obstacles. They define the shape of a reasonable design. Time, money, team skill, legal requirements, cloud limits, latency, geography, and existing code all narrow the design space.

For the event tracking project, useful constraints include:

- A limited project duration.
- A small student team.
- Unknown future event volume.
- A domain where delayed correctness may be acceptable.
- Privacy expectations around user or entity behavior.

The goal is not to remove constraints but to use them honestly. A design that ignores constraints is usually not ambitious; it is vague.

## Notes for further development

- The chapter currently mixes draft prose and outline notes. Decide whether to keep the numbered `2.x` structure or align headings with the other chapters.
- Add a small diagram showing the four scalability dimensions around the event tracking project.
- Add a short closing section that previews Technical Debt: once the first project works, the next question is what hidden costs it has accumulated.
