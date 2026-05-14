# Deconstruct Project

## Understanding an Event Tracking System

---

## 1. Goal of the Assignment

Your task is to **understand, analyze, and explain** an existing event tracking system.

Unlike previous projects, you are **not expected to build or redesign** the system. The focus is on learning how to read software systems, identify their characteristics, and reason about the decisions behind them.

This project emphasizes **analysis, interpretation, and explanation**.

---

## 2. Starting Point

You will work with an existing system. This may be:

- Your own implementation from a previous project
- Another team’s implementation
- A provided reference implementation or description

Working with another team's system is encouraged when possible. One reason the earlier projects allow different application themes is that unfamiliar domains make deconstruction more useful. You have to infer the system's purpose, concepts, constraints, and trade-offs from the implementation and documentation rather than relying on your own memory of why choices were made.

You should assume the system:

- Solves a real problem
- Was built under constraints
- Contains intentional and unintentional trade-offs

---

## 3. Core Tasks (Mandatory)

You MUST analyze the system from multiple perspectives.

### 3.1 Problem and Context

- What problem does the system aim to solve?
- Who are the intended users?
- What assumptions does the system make about its environment?

---

### 3.2 Functional Behavior

- What kinds of events does the system track?
- How are events created, stored, and viewed?
- What functionality is central, and what is secondary?
- If the system is a workflow or agentic platform, how are workflow definitions, run events, tool calls, retries, failures, and traces represented?

---

### 3.3 Structure and Architecture

- Identify the main components of the system
- Describe how these components interact
- Explain where data is stored and how it flows

Diagrams are strongly encouraged.

---

## 4. Design Decisions and Constraints

You MUST identify and explain:

- Key design decisions
- Constraints that influenced those decisions (time, scope, skills, tools)
- Assumptions that are baked into the system

Focus on _why_ choices were made, not whether you agree with them.

---

## 5. Quality Attributes

You MUST discuss how the system relates to the following qualities:

- Scalability
- Reliability
- Maintainability
- Simplicity
- Resource efficiency

Not all qualities need to be strong; trade-offs are expected.

---

## 6. Risks and Limitations

You SHOULD identify:

- Potential failure modes
- Bottlenecks or fragile parts of the system
- Situations where the system might behave poorly

This is an analysis exercise, not a criticism exercise.

---

## 7. Final Reflection

You SHALL include a short reflection on:

- What surprised you about the system
- What you would do differently if starting from scratch
- What evidence from the three project phases changed your understanding of scalability

Do not turn this into a redesign.

---

## 8. Deliverables

Your submission SHALL include:

- A written analysis (4–6 pages or equivalent)
- At least one architecture or data-flow diagram
- Clear explanations in your own words
- A short final reflection connecting evidence from Construct, Reconstruct, and Deconstruct

No code changes are required.

---

## 9. Evaluation Criteria

Your work will be evaluated based on:

- Depth of understanding
- Accuracy of interpretation
- Ability to explain trade-offs
- Clarity and structure of communication

Originality is less important than insight.

---

## 10. Advice

Good deconstruction answers questions like:

- Why does this exist?
- What constraints shaped it?
- What problems does it solve well?
- What problems does it avoid solving?

The goal is to learn how real systems are understood, not how ideal systems are imagined.
