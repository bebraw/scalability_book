Course narrative & project arc
Dimensions of scalability (users, data, teams, change)
Scalability vs performance vs resilience
Constraints as design inputs
Why most systems fail after success

---

You might be familiar with the saying "works on my machine".
Often web applications are developed in the context of a local computer, or these days even on a service directly on top of a cloud platform, meaning your view on the application is limited.
As systems become more complex, they also become easier to break.
That is where the concept of scalability comes in.
But what is scalability exactly?

## Dimensions of scalability

There are multiple ways to look at scalability.
Consider for example what happens when a web-based product of a startup becomes popular and gains more users than the company might have ever imagined to be possible.
It is in this case that normally the performance boundaries of a service are discovered as most likely the quality of the service will begin to degrade in one way or another.
When people think about scalability, performance is perhaps the first aspect that comes to their mind but it is not the only aspect.

Another way to look at it is to consider an established, even decades old service, that generates revenue yet requires maintenance and new features.
Here the challenge is to make changes without breaking anything that used to work as that could be expensive.
Furthermore, there is likely organizational structure to consider and the system might simply be too big for a single developer to be able to make all the changes needed.
On top of that, the stack used by the system might be considered antiquated or not following the latest technological trends at least.
These examples illustrate inertia within older systems and affect their technical scalability.
These systems might still scale well performance-wise but it might be difficult to scale them otherwise due to technical or social concerns.




Most software dies not because it was bad, but because it was successful.

It gets more users than expected, more data than imagined, more teams than planned, and more change than it was ever designed to tolerate. The result is familiar: outages, frantic hotfixes, late-night incident calls, slowing delivery, growing complexity, and mounting fear of touching “that part of the system.”

This book is about designing and evolving systems *so that success doesn’t kill them*.

We’ll approach this through a narrative: a single product that starts small, finds traction, then grows into a large-scale, long-lived system. Along the way we’ll make choices, hit limits, refactor, and sometimes regret what we did three chapters earlier.

Before we dive into that story, this chapter sets the stage:

- What it means for a system to “scale”
- How scalability differs from performance and resilience
- Why constraints are not obstacles, but design inputs
- Why most systems fail *after* they become successful
- How we’ll use a project arc to turn abstract principles into concrete engineering decisions

---

## 1.1 The Course Narrative & Project Arc

Rather than present scalability as a catalog of patterns and technologies, we’ll follow a single system over time.

Imagine we’re building a product: a multi-tenant SaaS application that lets companies run experiments on their own products—feature flags, A/B tests, and rollout strategies.

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

- We’ll introduce a *pressure* (more users, data, teams, or change).
- We’ll make or evaluate design choices under real constraints.
- We’ll look at tradeoffs: when a pattern helps and when it hurts.
- We’ll revisit earlier decisions with the clarity of hindsight.

The aim is not to design the “perfect” architecture, but to learn how to:

- Recognize scaling dimensions early
- Use constraints to focus design
- Reduce the cost of change over time
- Grow a system in a way that stays understandable and operable

---

## 1.2 The Dimensions of Scalability

“Can it scale?” is one of the most overused and underexplained questions in software.

Scale *what*, exactly?

Scalability is multi-dimensional. Different dimensions stress different parts of your system and often demand different design responses. In this book, we’ll focus on four primary dimensions:

1. **Users**
2. **Data**
3. **Teams**
4. **Change**

You cannot treat “scaling” as a single problem when these four often push in different directions.

### 1.2.1 Scaling Users

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

But more users don’t just mean *more of the same*. They also change the distribution of behavior: edge cases become daily cases, rare bugs become common, and timing issues become deterministic.

### 1.2.2 Scaling Data

Data scalability is about both volume and variety:

- How much data can we store?
