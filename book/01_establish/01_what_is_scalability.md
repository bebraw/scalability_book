# What does scalability mean for web development?

If you ask two developers, they will likely give you different definitions of scalability.
Scalability can be a complex concept, especially in the context of the web.
In this book, we consider the scalability of web applications in particular, although many of the ideas also apply to content-focused websites.
A single site commonly has both characteristics, so this book uses the terms liberally.

In this book, I use scalability to mean a system's ability to continue meeting its goals as the demands around it grow or change.
These demands may be technical, developmental, or organizational.
A system can therefore scale well in one respect while struggling in another.
Performance describes how a system behaves under given conditions, whereas scalability describes how that behavior changes when the conditions change.

Within the broader context of scalability, the web presents its own challenges because of how it is designed and used.
Over the past few years, the web has begun to undergo a major shift in both how we develop for it and how we consume it.
This change is driven in part by the introduction of Large Language Models (LLMs) and agents.
The shift presents a major challenge for developers: while generating code is cheap, developing in a scalable manner is not.
For me, scalability has both hard and soft aspects: a service must work technically, but keeping it maintainable also requires social infrastructure.
Therefore, the purpose of this chapter is to introduce you to scalability-related challenges and get you thinking about the topic.
As you work through the book, you will develop your own view of scalability.

## Dimensions of scalability

Scalability can be considered from multiple viewpoints, ranging from the development process to how web applications perform under load in practice.
I will cover several of these angles next to give you some food for thought.
The list is not exhaustive because the concept is broad, and there are likely other ways to decompose scalability.
That said, I consider five aspects of scalability essential: development process, architecture, infrastructure, data, and business.

> **Sustainability angle**
>
> Scaling a system typically scales resource consumption too.
> Although a system may scale to meet demand technically, doing so may be inefficient.
> I consider ecological sustainability another valuable angle that cuts across the other dimensions.
> Because of this, I have included short callouts throughout the book to offer these kinds of additional perspectives on the topic.

## Scalability of the development process

The way I see it, no matter what kind of web application you are developing, you always have to consider the scalability of your development process.
Eventually, it may become a constraint as your application and ambitions grow.
For a small throwaway application, the development process may not matter much, but it can become important if you plan to develop the application further or over a longer period of time.
These days, the development process must also account for how developers and machines work together.
LLMs have taken over some work that people previously performed manually, shifting responsibilities in the process.
This is why I believe today's web developers should understand how to work with models.

I consider the currently available models to be power tools.
While power tools can be fun to use, they can also cause a lot of damage if not used responsibly.
In other words, it is now easier than ever to accumulate massive amounts of technical debt that may cause problems later.
Before the large-scale introduction of models, reaching similar situations might have required years, and even then the process involved far more human intervention.
Today, developers can build extremely complex applications without spending much time understanding the code.
This can be dangerous because it erodes trust in the result: it may be difficult to tell whether the code is correct or even appropriate.
LLMs are good at generating code, but their output can easily get out of hand.
They cannot replace your understanding of the problem, although they can complement it.

Technical debt may be acceptable and may never need to be repaid.
For certain tasks, such as technical feasibility spikes or ideation, debt might not matter.
Once you understand what you need to build, proper engineering can take place.
Since generating code is cheap, you can use experimentation to deepen your understanding of the problem and arrive at a better solution.

## Scalability of architecture

As a concept, architecture is nebulous because it captures how we shape things and how they relate to one another.
In software, architecture is visible in concepts such as cohesion and modularity.
The way we structure our software has an impact on its scalability because it can either constrain or enable scalability-related factors.
For example, tight coupling between services may make them difficult to deploy to a loosely coupled deployment target.
Coupling relates to boundaries and contracts, which lie at the core of software architecture.
Understanding the responsibilities of different entities is one of the key tasks of a software architect, after all.
A software architect must also consider how the system will evolve because it is rarely fixed and will change over time.
It is worth remembering that LLMs tend to copy patterns available in your codebase.
Therefore, setting a good example has even more value than before because building the right way can save you from a lot of uncertainty and refactoring.
Our current tools are arguably not ideal for LLM-driven development.
It is therefore worth considering which architectural primitives will help LLMs make good decisions as they craft technical solutions for you.

## Scalability of infrastructure

Consider what happens when your product gets discovered by an aggregator like Hacker News and makes it to the top.
You can only imagine the amount of traffic you have to be able to deal with at once, and it may be far more than you have prepared for.
While this is generally a good thing in terms of business, it is also a scaling concern especially in terms of infrastructure since too much traffic can literally crash your site.
How do you architect for a sudden spike of traffic like this?
Since an event, such as a Hacker News traffic surge, is so short, it is difficult to react to it in time so you will have to prepare upfront.
You will have to plan for spikes in time to make sure you can deal with success as otherwise your serves might be hugged to death, momentarily at least.

For infrastructure, the challenge is two-fold as typically you think about in terms of horizontal and vertical scalability.
These mean either scaling a single node within infrastructure so that it is stronger, hence vertical or scaling up, or adding more nodes to the system as a form of horizontal scalability or scaling out.
It is a good question who is responsible for this portion of scalability since over time companies have moved from their own hosting towards cloud computing and beyond.
These days it is possible to pay for function invocations bought from edge hosting providers meaning the economics behind infrastructure have changed considerably over the past few decades as computation has become abstracted, and you might not be even aware as a developer where and how your code is running exactly.

## Scalability of data

While a considerable chunk of work has to do with computation and processing, underneath all this you typically have some type of data unless your application is ephemeral by its nature and does not store any permanent records.
If you need records, then you will need to store your data somewhere somehow and this is typically the point where you either need a file system or a database or both.
Data comes with its own sets of problems since you have to consider where it is stored and how.
You may also want to back up your data so it does not get lost.
To make things worse, you may have to consider how it is read and written while dealing with concurrent usage that may lead to conflicts.
As you can see, the topic can get complex fast, and this complexity depends largely on your use cases.

## Scalability in business

Another way to look at scalability is to consider an established, even decades old service, that generates revenue yet requires maintenance and new features.
Here the challenge is to make changes without breaking anything that used to work as that could be expensive.
Furthermore, there is likely organizational structure to consider, and the system might simply be too big for a single developer to be able to make all the changes needed.
On top of that, the stack used by the system might be considered antiquated or not following the latest technological trends at least.
These examples illustrate inertia within older systems and affect their technical scalability.
These systems might still scale well performance-wise, but it might be difficult to scale them otherwise due to technical or social concerns.

## Scalability is multidimensional

As you can see, scalability is a multidimensional concept going beyond technical concerns.
As a topic, it is open to interpretation and often different aspects of scalability are interrelated.
They can also be conflicting which means that likely you cannot optimize each are at the same time, but you may have to compromise.
That is an important part of the engineering challenge and also the impetus behind this book as I want you to develop your own thinking around scalability.

The demonstration below applies growth pressures to the five dimensions introduced in this chapter.
Select the pressures that matter for the event tracker and observe which dimensions receive the most strain.
A single pressure can affect several dimensions, and some combinations may leave multiple dimensions equally exposed.

{{ import "site/includes/scalability-dimensions-demo.html" }}

Use the radar to identify which dimensions require attention before choosing techniques.
As you can see, a system can scale in one dimension while becoming worse in another.

## Summary

As you can see, scalability is a multidimensional construct and there is no single right way to define it.
I like to split it to its development process related and technical portions.
It is arguable how to divide those technical portions and often different scalability concerns are interrelated.
It is even possible that by improving some specific aspect, you may inadvertently worsen another.
Therefore, compromises are common in scalability type of work, although there are some kind of good practices to follow that we will cover in this book in the coming chapters.
