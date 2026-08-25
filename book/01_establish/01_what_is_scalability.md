# What is scalability?

If you ask two developers, they will likely give you a different definition for what is scalability.
Especially in the context of the web, scalability can be complex as a concept.
Within this book, we consider the scalability of web applications in particular while many of the ideas considered apply to websites as well.
This division to websites and applications is operational since websites are oriented around content and applications around functionality.
It is common that both characteristics are found within a single site and in the context of this book we will use the terms liberally for this reason.

When put to the larger context of scalability, the web has its own challenges related to its design and the way it is used.
Especially during the past few years the web has started to undergo a major shift as both the way we develop for the web and how we consume it have begun to change.
This change has to do with the introduction of Large Language Models (LLMs) and agents.
The shift is a great challenge for developers as while development is cheap, developing in a scalable manner is not.
The purpose of this chapter is to open your mind to especially scalability related challenges and start you to think about the topic as you will develop your own view on the topic by completing this book.

## Dimensions of scalability

Scalability can be considered from multiple viewpoints ranging from development to how your web applications perform under load in practice.
I will cover several of these angles next to give you some food for thought.
The list won't be exhaustive as the idea is broad and there are likely other ways to decompose scalability.
That said, I will consider these five aspects of scalability I consider essential: development process, architecture, infrastructure, and data.

> **Sustainability angle**
>
> Scaling a system usually scales resource consumption too.
> A design that handles 10x traffic by using 20x infrastructure may be technically scalable but inefficient.
> Resource-aware scalability asks how much useful work the system delivers per unit of computation, storage, bandwidth, and operational cost.
> In short, sustainability forms another angle that encompasses many of the other and within the context of this book we define the term through ecological lens, not other forms of sustainability.

### Scalability of the development process

The way I see it, no matter what kind of web application you are developing, you always have to consider the scalability of your development process as eventually it may become a constraining factor as your application and ambitions grow.
For a small throwaway application, development process might not matter much, but it may become a factor if you plan to develop the application further and for a longer period of time.
These days development process also has to consider how developers and machines work together since LLMs have taken a chunk of work people would have been doing manually shifting responsibilities.
This is why I believe web developers should understand how to work with models these days.

I consider the currently available models as power tools.
While power tools can be fun to use, they can also cause a lot of damage if not used responsibly.
In other words, it is now easier than ever to accumulate massive amounts of technical debt that may bite you later.
Since development was so slow before the large scale introduction of models, it may have required years to reach similar situations before and even then there was much more human intervention in the process.
Today developers may build even extremely complex applications without spending a lot of time on understanding code which may be dangerous since it erodes trust in what was done since it can be difficult to tell if what was done is correct or even smart.
It is good to remember that LLMs are good at generating and for that reason what they produce may easily get out of hand as they cannot fully replace your understanding of the problem while they may be able to complement it.

Technical debt may be acceptable and not even meant to be paid ever.
For certain tasks, such as technical feasibility spikes or ideation, debt might not matter.
Once you understand what you need to build, proper engineering can take place.
Since building is cheap, you can use that to your benefit while experimenting to develop your understanding of the problem to come up with a better solution.

### Scalability of architecture

As a concept architecture is nebulous since it captures the way we shape things and how they relate to each other.
In software, architecture is visible for example in the concepts of cohesion and modularity.
The way we structure our software has impact on its scalability as it can either constrain or enable scalability related factors.
For example tight coupling between services may make it complicated to deploy them to a loosely coupled deployment target.
Coupling touches the concepts of boundaries and contracts as those are at the core of software architecture.
Understanding responsibilities of different entities is one of the key tasks of a software architect after all.
On top of this, a software architect has to consider how to evolve this all since often systems are not fixed and change over time.
It is good to remember that LLMs tend to copy patterns available in your codebase.
Therefore, setting good example has even more value than before since building the right way can save you from a lot of uncertainty and refactoring.
It can be argued that our current tools are not ideal for LLM driven development so it is worth thinking about what kind of primitives you want to use in your architecture to allow LLMs to make good decisions as they craft technical solutions for you.

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
