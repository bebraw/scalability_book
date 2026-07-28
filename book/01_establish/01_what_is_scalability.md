# What is scalability?

You might be familiar with the saying "works on my machine".
There's a good reason for the saying since often web applications are developed in isolation at the developer's own machine or occasionally on top of a cloud platform meaning your view on the application is limited.
Given the web has many different kinds of consumers, having only your own view can easily lead to a constrained perspective.
The idea of a web full of different types of consumers is at the core of scalability and discussion around it.
The purpose of this chapter is to make you think about different aspects around the topic to form your own idea of the topic.

## Dimensions of scalability

Scalability can be considered from multiple viewpoints ranging from development to how your web applications performs under load in practice.
I will cover several of these angles next to give you some food for thought.
The list won't be exhaustive as the idea is to get you thinking about the topic.
I will cover the following five aspects of scalability I consider essential: development process, architecture, infrastructure, and data.
I am sure there are different ways to frame this, and you will develop your own ideas, but it is a good starting point for discussion at least.

> **Sustainability angle**
>
> Scaling a system usually scales resource consumption too.
> A design that handles 10x traffic by using 20x infrastructure may be technically scalable, but it is inefficient.
> Resource-aware scalability asks how much useful work the system delivers per unit of computation, storage, bandwidth, and operational cost.

### Scalability of the development process

The way I see it, no matter what kind of web application you are developing, you always have to consider the scalability of your development process.
With the introduction of large language models, this aspect has shifted largely now that building is cheap.
That does not however mean that maintenance is any cheaper than before, and you will have to learn to use models responsibly to avoid problems later on.
Simply put, it is now easier than ever to accumulate massive amounts of technical debt.
Arriving into these of situations might have required years or even decades of work before.

As you know, not all debt is meant to be paid, or paid ever.
Therefore, understanding the context is valuable.
Technical debt may be acceptable for throwaway spikes, for example, where you want to see if a specific direction might make sense.
If the direction does make sense, you can still go and re-engineer your solution to capture the technical characteristics you prefer.
Consider for example adding a new view to your application.
The idea might be to first see if the proposed user interface would make sense to use while working with mock data before wiring in a data model.
The same approach can be used for evaluating technical approaches against each other while having specific metrics in mind, and we will cover this idea later on in the book.

### Scalability of architecture

As a concept architecture is nebulous since it captures the way we shape things and how they relate to each other.
In software, architecture is visible for example in the concepts of cohesion and modularity.
The way we structure our software has impact on its scalability as it can either constrain or enable scalability related factors.
For example tight coupling between services may make it complicated to deploy them to a loosely coupled deployment target.
Coupling touches the concepts of boundaries and contracts as those are at the core of software architecture.
Understanding responsibilities of different entities is one of the key tasks of a software architect after all.
On top of this, a software architect has to consider how to evolve this all since often systems are not fixed and change over time.
That is yet another factor that can have impact on the scalability of a system.

### Scalability of infrastructure

Consider what happens when your product gets discovered by an aggregator like Hacker News and makes it to the top.
You can only imagine the amount of traffic you have to be able to deal with at once, and it may be far more than you have prepared for.
While this is generally a good thing in terms of business, it is also a scaling concern especially in terms of infrastructure since too much traffic can literally crash your site.
How do you architect for a sudden spike of traffic like this?
Since an event, such as a Hacker News traffic surge, is so short, it is difficult to react to it in time so you will have to prepare upfront.
You will have to plan for spikes in time to make sure you can deal with success as otherwise your serves might be hugged to death, momentarily at least.

For infrastructure, the challenge is two-fold as typically you think about in terms of horizontal and vertical scalability.
These mean either scaling a single node within infrastructure so that it is stronger, hence vertical or scaling up, or adding more nodes to the system as a form of horizontal scalability or scaling out. (TODO: Add citations for these for more info).
It is a good question who is responsible for this portion of scalability since over time companies have moved from their own hosting towards cloud computing and beyond.
These days it is possible to pay for function invocations bought from edge hosting providers meaning the economics behind infrastructure have changed considerably over the past few decades as computation has become abstracted, and you might not be even aware as a developer where and how your code is running exactly.

### Scalability of data

While a considerable chunk of work has to do with computation and processing, underneath all this you typically have some type of data unless your application is ephemeral by its nature and does not store any permanent records.
If you need records, then you will need to store your data somewhere somehow and this is typically the point where you either need a file system or a database or both.
Data comes with its own sets of problems since you have to consider where it is stored and how.
You may also want to back up your data so it does not get lost.
To make things worse, you may have to consider how it is read and written while dealing with concurrent usage that may lead to conflicts.
As you can see, the topic can get complex fast, and this complexity depends largely on your use cases.

TODO: touch CAP and ACID

### Scalability in business context

Another way to look at scalability is to consider an established, even decades old service, that generates revenue yet requires maintenance and new features.
Here the challenge is to make changes without breaking anything that used to work as that could be expensive.
Furthermore, there is likely organizational structure to consider, and the system might simply be too big for a single developer to be able to make all the changes needed.
On top of that, the stack used by the system might be considered antiquated or not following the latest technological trends at least.
These examples illustrate inertia within older systems and affect their technical scalability.
These systems might still scale well performance-wise, but it might be difficult to scale them otherwise due to technical or social concerns.

### Scalability is multidimensional

As you can see, scalability is a multidimensional concept going beyond technical concerns.
As a topic, it is open to interpretation and often different aspects of scalability are interrelated.
They can also be conflicting which means that likely you cannot optimize each are at the same time, but you may have to compromise.
That is an important part of the engineering challenge and also the impetus behind this book as I want you to develop your own thinking around scalability.

I set up a simple demonstration to showcase the multidimensionality of scalability to show how different growth pressures affect different dimensions related to a project.
Different pressures lead to different kinds of pressures to consider.
The example highlights how projects can differ depending on their pressures within the same domain.

{{ import "site/includes/scalability-dimensions-demo.html" }}

Use the radar before choosing techniques.
As you can see, a system can scale in one dimension while becoming worse in another.

## Summary

As you can see, scalability is a multidimensional construct and there is no single right way to define it.
I like to split it to its development process related and technical portions.
It is arguable how to divide those technical portions and often different scalability concerns are interrelated.
It is even possible that by improving some specific aspect, you may inadvertently worsen another.
Therefore, compromises are common in scalability type of work, although there are some kind of good practices to follow that we will cover in this book in the coming chapters.
