# Elements of Scalable Web Development

_Architecture, measurement, scaling pressure, and agentic workflows_

Building scalable web applications is not easy especially since there are multiple definitions for scalability.
In this book, I will discuss scalability from both development and technical perspectives.
The book has been split into three parts during which you will learn more about the topic and implement a project.
The project will remain the same but the way you implement it will change to give perspective on development level scaling.
You will pick up ideas behind technical scaling during this process.

While people have built websites and applications for decades, the work was performed largely by developers writing code manually.
That practice has shifted during the past few years as coding agents have begun to write code for us.
The shift allows us to develop more complex web applications faster than before, but it also introduces engineering challenges.
Those challenges are the subject of this book.

You will learn about agents in the context of web development, not as a separate topic.
The goal is to learn how to use them effectively while developing your own understanding of scalability across both the web application and the development process that produces it.

> **Sustainability angle**
>
> Scalability also has an environmental dimension.
> More traffic, more data, more retries, more logs, and more infrastructure all consume resources.
> Throughout the book, you can ask whether a design scales efficiently, not only whether it scales at all.

## Why you should read this book

This book captures my current understanding how to develop web applications in a scalable way and in the book I share my latest learnings about the topic.
I finished my doctorate recently (2025) and I have been active in the scene for the past twenty years.
Besides the doctorate, [I have completed plenty of research related to the topic](https://survivejs.com/research/).
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

## How is the book structured

I structured the book around a single project that is implemented three times to establish a baseline, challenge its assumptions, and finally to compare the alternatives.
In other words, expect three parts with three chapters each that take you to the topic.
By implementing the three projects, you will gain appreciation of different ways of developing web applications.
More specifically, we will touch local models, foundation models, and agent fleets where you have multiple actors working together.
It is within this framing that you will learn to benchmark, architect, and scale your web applications.

The course project has been documented through [a shared specification](/project/) built around a work activity tracker with some ambiguity so that you can make it yours.
While the application behavior remains stable across the different implementations, the way you implement will change as mentioned, and you will have technical choices to make in terms of product interpretation, stack, architecture, storage, and interfaces.
This means you can compare the impact of different engineering choices against the same behavioral core.

> **Protect learning, not only output**
>
> Immediate task performance is not the only outcome worth protecting.
> Across three randomized experiments involving short arithmetic and reading-comprehension tasks, brief AI assistance improved work while it was available but reduced later unaided performance and persistence; the decline was concentrated among participants who used AI for direct solutions, while hint-oriented users did not differ significantly from the control group :citep[liu2026assistance].
> These tasks do not establish the long-term effect on professional programming, but they support a practical course rule: use agents for hints, critique, and verification when the underlying skill must remain yours.

I call the three parts of the book Establish, Challenge, and Compare.
Each of these parts responds to specific scalability related questions and I have covered what to expect briefly below.

**Establish — Build and measure a baseline:**

1. [What does scalability mean for web development?](/chapters/what-is-scalability/) -- In this chapter I consider aspects related to scalability in the context of web development.
2. [How can coding agents support scalable development?](/chapters/scalable-development/) -- Given the shape of development is changing, I consider the implications of artificial intelligence (AI) and agents in this chapter, including how humans and agents divide authority, judgment, and responsibility.
3. [How can we measure web applications and development workflows?](/chapters/benchmarking/) -- While AI speeds up development of artefacts, this also highlights the importance of measuring and observing our applications.
   That is why I will show you how to measure and observe your web applications in this chapter.

**Challenge — Expose architectural assumptions:**

4. [How does web architecture shape scalability?](/chapters/architecture/) -- Architecture and scalability go hand in hand, and in this chapter I'll consider the implications of this connection.
5. [How does development friction limit web projects?](/chapters/friction/) -- As web applications become more complex, they become more difficult to develop and in this chapter we consider sources of friction and what to do about it.
6. [Which web application assumptions fail under pressure?](/chapters/reality/) -- In this chapter we consider which assumptions fail under real users, data, concurrency, failures, costs, and constraints.

**Compare — Evaluate workflows and scaling responses:**

7. [When do agent fleets improve web development?](/chapters/agent-fleets/) -- How do project instructions, tests, task boundaries, roles, and review loops make agentic development safer and more scalable?
8. [How should web applications respond to scaling pressure?](/chapters/scaling/) -- How do all three implementations respond to the same pressures, and what would a justified target architecture retain or change?
9. [What do three agent-assisted implementations teach us about web scalability?](/chapters/recap/) -- What conclusions do the evidence support, and which application architecture and development workflow would we choose under stated constraints?
