---
marp: true
paginate: true
title: "Lecture 1: What scalability means"
---

# What is scalability to you?

## Lecture 1 · Establish

Send one word or short phrase to the Lecture Studio word cloud.

Pick a word from the screen.
What experience does it bring to mind?

<!-- [Sources] lecture_plan.md#1-course-introduction-and-a-common-view-of-scalability -->

---

# How the book defines scalability

**Scalability** is a system’s ability to keep meeting a stated goal as a named pressure grows or changes.

What changes?
What needs to keep working?

<!-- [Sources] book/01_establish/01_what_is_scalability.md -->

---

# Application scalability

Someone finishes a work item.
Its state changes and exactly one completion appears in the activity feed.

Can the running tracker keep that promise as more people use it?

<!-- [Sources] book/01_establish/01_what_is_scalability.md#begin-with-the-goal-that-must-continue-to-hold -->

---

# Development scalability

A teammate changes how the tracker records a completion.

As more people work on it, can the team still review, test and ship that change safely?

<!-- [Sources] book/00_introduction.md; book/01_establish/02_scalable_development.md -->

---

# Demand pressure

One person finishes a work item.
Now twenty people finish different items at once.

How long does the last person wait for confirmation?

<!-- [Sources] book/01_establish/01_what_is_scalability.md#demand-changes-the-distribution-of-web-behavior -->

---

# Data pressure

Keep the same four readers.
Grow the history from 1,000 events to 10,000.

How long does it take to return the latest 20 events in order?

<!-- [Sources] book/01_establish/01_what_is_scalability.md#data-changes-paths-as-well-as-volume -->

---

# Contributor pressure

Three agents open patches.
One person reviews them.

Which queue would you watch to learn whether the team can accept changes any faster?

<!-- [Sources] book/01_establish/01_what_is_scalability.md#contributors-increase-coordination-pressure -->

---

# Change pressure

A new tracker client adds a category to events.
Some teams still use last month’s client.

Which read and write would you try before rolling out the change?

<!-- [Sources] book/01_establish/01_what_is_scalability.md#change-makes-old-commitments-visible -->

---

# Can the tracker keep up?

Raise incoming work from **100 to 150 events per second**.
Where will work pile up?

Add capacity for **40 more events per second** at that stage.
Will the queue stop growing?

[Run the pipeline demo](https://scalableweb.dev/learn/pilot/responses/#slide-capacity)

<!-- [Sources] study/pilot/responses.md; lecture_plan.md -->

---

# Implementation A

After class, build your team’s first tracker with the approved large model and one coding agent at a time.

What will you check as demand or data grows?
What will you check as contributors or requirements change?

Bring those two claims to your first team session.
Submit A before Lecture 4. [Establish brief](https://scalableweb.dev/project/establish/)

<!-- [Sources] book/01_establish/01_what_is_scalability.md#project-artifact; specifications/01_establish.md -->

---

# Questions

On the Lecture Studio audience page, choose **Ask a question**.

What would you like us to go through together?

<!-- [Sources] lecture_plan.md -->
