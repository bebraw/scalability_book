# Event Tracking Application

## 1. Goal of the Assignment

Your task is to design and implement a **simple event tracking application** for a domain of your choice.

The system should record things that happen in the chosen domain and allow those events to be viewed in a basic way. The focus of this assignment is **software design, clarity, and trade-offs**, not feature completeness.

This specification is intentionally minimal. You are expected to choose a theme, make reasonable assumptions, and document them. The theme could be a conference, classroom, shop, game, sensor network, task workflow, or another setting where meaningful events occur.

---

## 2. Core Requirements (Mandatory)

You MUST implement the following features.

### 2.1 Event Recording

- The system SHALL allow events to be recorded.
- Each event SHALL have:
  - A type or name (e.g. "check-in", "item-purchased", "task-completed", "sensor-reading")
  - A timestamp

- Events MAY include additional data.

### 2.2 Event Storage

- Recorded events SHALL be stored so they can be viewed later.
- The storage mechanism is up to you.

### 2.3 Event Viewing

- Users SHALL be able to see a list of recorded events.
- Events SHOULD be sortable or filterable by at least one criterion (e.g. time or type).

### 2.4 Basic Domain Context

- Events SHOULD relate to the chosen domain context, such as:
  - Users, actors, devices, or other entities
  - Places, groups, sessions, tasks, or resources
  - Categories or states that make the events meaningful

You may model this context in any way you see fit.

---

## 3. Optional Features (Choose 1–3)

You may implement **any number** of the following. These are optional and meant to encourage exploration, not extra workload.

### 3.1 Aggregation and Summaries

- Counts of events by type
- Counts or summaries grouped by a domain-specific field

### 3.2 Roles and Access

- Different user roles (e.g. administrator, operator, viewer)
- Restricted access to certain views or actions

### 3.3 Simple Dashboard

- Visual overview of activity in the chosen domain
- Charts, tables, or summaries

### 3.4 Event Validation

- Prevent clearly invalid events
- Basic schema or required fields

### 3.5 Import / Export

- Export events as a file (e.g. CSV or JSON)
- Simple data import

### 3.6 Sustainability Reflection

- Identify one resource-related aspect of your design
- Examples include storage growth, unnecessary polling, query efficiency, logging volume, client bundle size, or infrastructure assumptions

---

## 4. Non-Goals

You are NOT expected to:

- Handle large-scale traffic
- Implement real-time updates
- Build a production-ready system
- Support complex analytics

Simple and well-explained solutions are preferred over complex ones.

---

## 5. Technical Freedom

You MAY choose:

- Programming language
- Frameworks and libraries
- Architecture (monolith, client–server, etc.)
- Storage solution
- Application theme or domain

You SHOULD be able to explain **why** you made these choices.

---

## 6. Deliverables

Your submission SHALL include:

- The working application
- A short README describing:
  - Your assumptions
  - Your data model
  - Your main design decisions
  - Which optional features you implemented

---

## 7. Evaluation Criteria

Your work will be evaluated based on:

- Correctness of the core requirements
- Simplicity and clarity of the design
- Quality of explanations and documentation
- Appropriate scope for a 3‑week project

There is no single correct solution.

---

## 8. Advice

If you are unsure, choose the simplest possible solution that meets the requirements.

A small, well-finished system is better than a large, incomplete one.
