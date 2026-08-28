# Compare — Evaluate workflows and scaling responses

Implementations A and B expose what changed across two single-agent development systems, but they do not yet show what orchestration adds or costs.
Compare produces implementation C through a declared agent fleet, applies common scaling pressures to all three applications, and turns their evidence into a justified target architecture and development workflow.

## From orchestration to an evidence-based decision

The three chapters form one progression:

1. [When do agent fleets improve web development?](/chapters/agent-fleets/) grows one agent into a bounded fleet, makes authority and integration explicit, and treats failure correction as part of implementation C.
2. [How should web applications respond to scaling pressure?](/chapters/scaling/) identifies approaching limits, applies formal models, and compares possible responses without treating a technique catalog as a design.
3. [What do three agent-assisted implementations teach us about web scalability?](/chapters/recap/) connects the application, development, and agentic loops and turns the three evidence packages into a final decision.

By the end of Compare, students should have implementation C and its fleet trace, a three-way application and workflow comparison, and a target design whose claims distinguish observation, inference, and proposal.

## Implementation C — Work Activity Tracker

The [Compare project specification](/project/compare/) defines the third fresh implementation and its bounded fleet workflow.
The common behavior, permitted acceptance material, pressures, and reporting categories remain stable while delegation, orchestration, authority allocation, integration, and fleet controls vary deliberately.
When practical, use the same foundation model as implementation B so orchestration is the primary changed variable; otherwise record the configuration difference and narrow the comparison claim.

Implementation C also turns its development process into application data.
A transformed fleet trace is loaded into the Work Activity Tracker so its history, filters, and relationships can expose attempts, failures, handoffs, validation, correction, and human intervention.
The result is a bounded workflow debugger, not a claim that the application has become a universal agent platform.

## Compare applications and development systems

Scalability has two connected objects of analysis here: the web application and the development system that changes it.
Application scalability remains the subject of the book; the three AI-assisted setups are the experimental lens.
Compare what the tools made easier, what they made riskier, and what project structures made accepted work legible enough to review and maintain.

The course does not establish a universal ranking of models or workflows.
The implementations can differ in architecture, the team learns between builds, and the served configurations may change.
The shared specification and evidence make those effects discussable; they do not make every causal explanation identifiable.
