# What can the three implementations teach us?

By the end of the course, you have established a baseline, challenged its assumptions through a second implementation, and compared both with a fleet-produced third implementation.
The point of this sequence is not only to practice implementation.
It is to see how web applications and their development systems respond when more people, data, traffic, features, dependencies, tools, and assumptions enter the picture.

The central claim could be: scalability is the ability to keep a system useful while the conditions around it change.
That includes technical capacity, but it also includes architecture, feedback loops, team coordination, and the way AI-assisted development is governed.

> **Sustainability angle**
>
> A scalable system should not only survive growth.
> It should use resources deliberately.
> The final reflection should ask whether the project handles more work efficiently or merely pushes more computation, storage, bandwidth, and human attention into the problem.

## Chapter purpose

- Reconnect the main ideas of the book.
- Help students explain what changed between implementations A, B, and C.
- Turn the final project discussion into evidence-based reflection.
- Show that scalability is technical, architectural, organizational, and agentic.

## The project arc

The three projects give the course its shape.
:ref[table:project-arc]{text="The table below"} makes the controlled comparison explicit: required behavior is held as stable as practical while the development system changes.

| Build                                               | Agent setup                   | Held as stable as practical                           | Deliberately varied                                                        | Evidence goal                                                                |
| --------------------------------------------------- | ----------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [Establish](/project/establish/) — implementation A | Locally hosted single agent   | Common functional scope and submission evidence       | Local model, runtime, and the team's first project harness                 | Establish a baseline and expose initial assumptions                          |
| [Challenge](/project/challenge/) — implementation B | Foundation-model single agent | The same required behavior, built afresh              | Served model capability and the revised harness or architecture hypothesis | Identify which outcomes recur and which change under a different agent setup |
| [Compare](/project/compare/) — implementation C     | Agent fleet                   | The same required behavior and evaluation obligations | Delegation, orchestration, authority allocation, and fleet controls        | Explain fleet effects and compare all three results with recorded evidence   |

::caption[The three course implementations and the evidence each comparison contributes.]
::label[table:project-arc]

The first working version is not the final design.
It is one implementation produced by one development system.
The later builds test which outcomes recur under the common requirements, which outcomes change with model capability or orchestration, and which responsibilities remain human.
Because the team also gains experience, these comparisons support local explanations rather than universal rankings.

## Scalable development

Scalable development begins before traffic grows.
A project scales better when its structure, commands, tests, naming, documentation, and interfaces make change easier to understand.
AI-assisted development makes this more visible because agents are sensitive to unclear context.
If the project is hard for an agent to navigate, it is often hard for a new human contributor too.

Reflection prompts:

- Which part of your project became easier to change over time?
- Which part became harder to change, and why?
- What instructions, conventions, or tests would have helped a new contributor?
- Where did AI assistance speed up development, and where did it create review work?
- Which skills or architectural knowledge could the group still demonstrate without AI assistance?

## Scalability as a multi-dimensional idea

Scalability is not a synonym for performance.
A system can scale users, data, teams, change, operations, and cost in different ways.
It can also fail to scale in one dimension while doing well in another.
A design that handles more requests but becomes impossible to modify is only partially scalable.

Reflection prompts:

- Which dimension of scalability mattered most in your project?
- Did your design optimize one dimension by making another worse?
- What would change if the project had ten times more users, data, or contributors?
- What would change if operating cost or energy use became a first-class constraint?

## Web architecture

The web gives us useful constraints: clients and servers, requests and responses, URLs, HTTP methods, caches, APIs, databases, and asynchronous work.
These are not just implementation details.
They shape what can be evolved independently and what becomes coupled.

Reflection prompts:

- Which API decisions made later work easier?
- Which API decisions became awkward after requirements changed?
- Where did client, server, and database responsibilities blur?
- What would you document so another team could safely build against your system?

## Friction and technical debt

Technical debt is not only messy code.
It is anything that makes future work slower, riskier, or less understandable.
Friction appears in setup, unclear ownership, slow tests, hidden assumptions, missing observability, brittle dependencies, and code that resists change.

Reflection prompts:

- What was the largest source of friction in your project?
- Was the friction caused by code, architecture, tooling, collaboration, or unclear goals?
- Which shortcut was reasonable at the time?
- Which shortcut should now be paid down?

## Measurement and observability

Without measurement, scalability discussions become guesses.
Benchmarking, logs, metrics, traces, and useful errors make system behavior visible.
Good measurement does not mean measuring everything.
It means choosing evidence that answers a specific question.

Reflection prompts:

- What did you measure, and what did the measurement actually prove?
- Did any measure become a target that could improve without the intended outcome improving?
- Which metric would warn you first that the system is overloaded?
- What important behavior is still invisible?
- Did your tests or benchmarks match realistic use?
- Did a nominally successful agent stay within the reasonable intent and boundaries of its task?

## Reality and changing assumptions

Systems meet reality when users behave unexpectedly, data grows, traffic spikes, dependencies fail, teams misunderstand each other, or old assumptions stop holding.
The Challenge part makes this normal mismatch explicit and applies the same pressure scenarios to independent implementations.
A scalable system is designed to adapt when assumptions change.

Reflection prompts:

- Which assumptions differed between implementations A and B, and which shared pressures challenged both?
- What failure mode did you discover only after building the first version?
- How did your design respond to overload, bad input, retries, duplicates, or partial failure?
- What would you redesign first if the project continued?

## Agent fleets, project readiness, and human-agent relationship

Agentic development scales only when work is bounded and reviewable.
More agents do not automatically create more progress.
They can also create duplicated work, conflicting edits, shallow reasoning, and integration burden.
A project becomes safer for agents when intent, constraints, commands, tests, and review expectations are explicit.

The three implementations are also three human-agent configurations.
Implementation A and B change model capability while retaining a broadly single-agent workflow; implementation C changes the orchestration and coordination structure.
Comparing only the finished applications would hide where humans framed intent, delegated authority, supplied context, accepted evidence, intervened, and remained responsible.
Use the HAR decision path from the development and fleet chapters to compare one consequential feature from need through adaptation.
The goal is not to identify the build with the most agent autonomy.
It is to determine which allocation produced accepted outcomes with a review and recovery burden the group could actually sustain.

Reflection prompts:

- What made your project easier or harder for an agent to work on?
- Which task was suitable for an agent fleet, and which task needed one careful contributor?
- How did you divide work into roles, files, outputs, and acceptance criteria?
- For one feature, who or what defined, designed, implemented, verified, released, observed, and adapted it?
- At each consequential decision, could the agent propose, prepare, or execute, and what justified that authority?
- What evidence did you use before trusting agent output?
- Which approval represented informed acceptance, and which risked becoming ceremonial because the reviewer lacked context, time, or a recovery path?
- What did the fleet debugging view reveal about failures, retries, handoffs, review, or human intervention that the finished code did not show?
- Did parallel work reduce accepted completion time, or only move work into integration and review?
- Where did the observed execution path diverge from the planned authority, escalation, or accountability map?

## Scaling techniques and trade-offs

Scaling is a sequence of trade-offs made in response to pressure.
Caching, queues, indexing, replicas, sharding, CDNs, rate limiting, background jobs, feature flags, and isolation all solve some problems while introducing others.
The question is not "which technique is best?" but "which pressure justifies which cost?"

Reflection prompts:

- What pressure did your scaling decision respond to?
- Which scaling technique did you choose, and what did it cost?
- Which technique did you deliberately avoid?
- What new failure mode did your scaling design introduce?

## Final reflection

A strong final reflection should use evidence from the three implementations rather than general claims.
It should connect development setup and architectural decisions to consequences: what each workflow produced, what changed, what was measured, what broke, what improved, and what the group would choose next.

Useful structure:

1. Describe the common brief, fixed acceptance core, and comparison limits.
2. Compare the local-model and foundation-model single-agent workflows.
3. Compare the foundation-model single agent with the agent fleet.
4. Compare the three architectures and their responses to the same scalability pressures.
5. Compare one feature's human-agent decision path across A, B, and C, including authority, evidence, escalation, recovery, and accountable ownership.
6. Present evidence from tests, benchmarks, audits, the fleet debugging view, traces, interventions, and resource or time measurements.
7. Separate observed differences from possible causes, including practice effects and scope differences.
8. Name the trade-offs, remaining risks, and development setup the group would choose next.
9. Explain what the project taught the group about application and development-system scalability.

### Final reflection package builder

The lightweight builder below helps assemble evidence from the course before writing the final reflection.
Select the artifacts you have, then use the generated outline to see which claims are supported and which evidence is still missing.

{{ import "site/includes/final-reflection-demo.html" }}

## Project artifact

Students should submit a final reflection package.
It should include the strongest evidence from the earlier artifacts: assumptions, architecture diagrams, friction audit, measurement result, pressure map, agent workflow evidence, one planned-versus-observed HAR decision map, scaling trade-off table, and a short explanation of what changed in their understanding.

## Questions to carry forward

- What kind of growth is this system actually prepared for?
- What kind of growth would break it first?
- Which parts are easy to change, and which parts resist change?
- What evidence supports your answer?
- What would you simplify before adding more infrastructure?
- What would you make explicit before adding more agents?
- What would you measure before making the next scaling decision?
