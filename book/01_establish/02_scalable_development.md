# How to develop in a scalable way?

As systems evolve, they tend to become more difficult to develop as the existing requirements and code may work against you.
This problem has been amplified with the introduction of so-called agentic coding, where computer agents leveraging Large Language Models (LLMs) essentially do the coding work for us.
While the abstraction level has shifted, arguably this hasn't changed the fundamentals behind software engineering.
We are still in a position where we have to figure out different types of requirements and map them to our applications.
It is this gap between requirements and implementation where software engineering becomes difficult since transforming requirements into concrete code can typically be done in many different ways.

In this chapter, I will bring you up to speed with agentic development while considering its impact on software engineering and web development in particular.
Note that the space is moving fast at the moment, so some of the content may already be outdated by the time you read it so make sure to do your own research on top of reading this chapter!
I recommend maintaining your own agentic development template and doing experiments actively since as you do it, you will learn to work better with the machine and becoming aware of its limitations though limitations tend to move over time and tend to be contextual and even model dependent.

## How are agents changing web development?

For a long time, web applications were written manually using a suitable editor.
Of course visual editors able to generate HTML have existed since the 90s, but for any serious development often code had to be written by hand unless a specific platform specific abstraction was available to at least reduce this type of work.
Since late-2022 with the introduction of ChatGPT, the way we program begun to shift, first with so-called copilots that complete sections of code as you write it, and then with agents that can develop what you want based on prompting.
On top of this we have whole systems that can orchestrate how multiple agents develop a system even independently.
Regardless of the approach, the challenge is always how to ensure the system is producing right outputs.

In the context of this book, we will first use a local model to implement [the book project](/project/) before trying the same with a foundation model and moving onto a fleet of agents to appreciate the differences and related challenges as the used approach, or even a model, can make a difference.
The ideas behind effective agentic development are good development practices in general, and you should have a good idea of at least some of those after finishing reading this chapter.

## Vibe coding vs. discipline

Since agentic development allows you to produce vast amounts of code fast through prompting, this brings you to the same old practices encountered by developers for decades at an elevated rate.
The term vibe coding coined by Andrej Karpathy in February 2025 captures well the dark side of this kind of development and for this reason it is occasionally used as a pejorative against development practices that focus on visual results while forgetting what is underneath.
This does not mean vibe coding cannot be useful as a prototyping technique, but that it can be dangerous to forget to design your codebase so that it follows good practices and follow security practices to avoid leaking client data or causing unnecessary cost or reputation loss to the developer.

:citet[foote1997mud] describe a Big Ball of Mud as a system whose organization is dictated more by expediency than design.
Big Ball of Mud connects well with the idea of vibe coding since a system can evolve faster than understanding of its structure.
As code is fast to generate, it is also fast to learn about your actual requirements that shape software architecture.
This is particularly true for spikes and early prototypes.

::: comment

Fowler's rule of three, attributed to Don Roberts, recommends refactoring when a similar implementation appears for the third time :citep[fowler1999refactoring].
The accumulated examples can reveal an abstraction that would have been speculative earlier.

:::

## Shifting-Up – Trading development speed for human control

It turns out, to get most out of agentic development, you will need a certain amount of discipline.
That is the main reason why it is important to understand technical details as in what should good architecture look like and how to develop software sustainably.
:citet[lipsanen2026shiftup] consider this issue and propose structured development as an alternative to unstructured vibe coding.
On top of structured development, the authors propose the Shift-Up approach that trades development speed for human control.
Practices are still emerging, and I have no doubt we will find better and worse ways to work with machines.
The question is what values we want to emphasize.
In short, agentic development has changed web development by shifting the abstraction level.
Instead of writing code, you massage the codebase into your preferred shape.

::: comment

Adoption is also moving faster than measurement.
:citet[giray2025adoption] found broad use and perceived gains in cycle time and quality, but limited objective measurement and uneven investment in training and governance.
This makes disciplined project evidence more important than impressions of speed.

:::

### When generation outruns comprehension

Greater code-production capacity does not make software development scale by itself.
Across three field experiments with 4,867 developers, access to an AI coding assistant increased completed tasks by about 26% in the pooled estimate, although the individual experiments were noisy and varied :citep[cui2026effects].
This is evidence that tools can raise the production rate in some settings, not that every developer or project becomes faster.

Comprehension was already a substantial part of development before generative AI.
In a field study covering 78 professional developers, seven projects, and 3,148 working hours, :citet[xia2018comprehension] classified about 58% of observed time as program comprehension, compared with about 24% navigation and 5% editing.
Their measure included activity across IDEs, browsers, and documents, and the projects came from two companies using Java and C#.
The percentages are therefore not a universal reading-to-writing ratio, but they show why producing more text does not remove the work of understanding a system.
Code and change understanding is also a central part of review, where it supports knowledge transfer and alternative solutions as well as defect detection :citep[bacchelli2013review].

AI can therefore increase the arrival rate of candidate changes more readily than a team can increase its comprehension capacity.
A generated diff is inventory, not completed work.
The relevant throughput is **accepted change**: work that someone can explain, validate against the intended behavior and architecture, integrate, and remain willing to own.
When candidate arrival exceeds that capacity, the backlog appears as large diffs, delayed review, shallow acceptance, rework, or technical debt.
Because of this problem, alternate ways for reviewing code have become available.
For example, [codiff](https://github.com/nkzw-tech/codiff) implements a walkthrough mode besides a regular diff that allows developers walk through proposed changes in a guided manner so that context behind changes is visible.

Here, "reading" is shorthand for building and testing a useful mental model, not manually inspecting every generated line.
Types, tests, contracts, static analysis, small modules, architectural notes, and AI-assisted search or review can compress the work by directing attention and supplying evidence.
They expand comprehension capacity only when they reduce uncertainty rather than create more assertions to inspect.
A live study of an LLM review assistant at Mozilla and Ubisoft illustrates both sides: generated comments sometimes contributed to later revisions, but reviewers still had to inspect them and accepted only a minority :citep[olewicki2026review].

Effort is not correctness evidence: a quick change can be sound, a laborious change can be wrong, and neither hours nor transcript length shows that software meets its requirements.
The Benchmarking chapter separates provenance, endorsement, accountability, and evidence when evaluating an accepted result.

:citet[brooks1987silver] distinguishes accidental difficulties that tools can reduce from essential difficulties rooted in the software problem, with complexity central among them.
:citet[lehman1980programs] similarly observes that an evolving program tends to become more complex unless deliberate work is performed to maintain or simplify it.
Agentic development can reduce the effort of producing a change, but by increasing the rate of change it makes architecture, validation, and the project harness more consequential.

The [case studies](/case-studies/) show how these pressures play out in projects with different scopes and outcomes.
They include three projects from my own work and two external cases focused on independent validation and maintained agent guidance.
Slideotter and Kirjolab reached a scope I could not have implemented alone, but their histories also show how generation speed can outrun product and architectural understanding.

## From visible speed to sustainable development

Prompting can produce visible results quickly, especially when a task is easy to specify.
The difficult part is sustaining change after the first result: supplying enough context, constraining what may vary, and requiring relevant evidence before accepting the output.
Guardrails and quality gates help, but they consume time and can be optimized mechanically if a score becomes the goal.
The Benchmarking chapter develops that measurement problem.

Agentic development therefore includes the supporting development system as well as the application.
Project instructions, architecture notes, tests, static analysis, reproducible commands, and reviewable examples can make future changes cheaper and safer.
Their value depends on whether they reduce uncertainty around the work that matters, not on how many checks or documents the repository contains.

> **Sustainability angle**
>
> Sustainable agentic development has two meanings here.
> It means keeping the project maintainable for humans, but it also means avoiding wasteful tool use.
> Focused prompts, smaller context, reusable instructions, and strong validation loops reduce repeated generation and unnecessary compute.

## Human-agent relationship is a control design

The phrase _Human Agent Relationship_ (HAR) can suggest an interpersonal question: should the agent be treated as a tool, assistant, colleague, or team member?
Those metaphors may shape expectations, but they do not define how work is controlled.
In this book, HAR is a practical name for the allocation of **intent, authority, execution, evidence, intervention, and accountability** across a human-agent development system.

An agent does not need one global autonomy level.
For a particular decision, it may **propose** an option, **prepare** an action for approval, or **execute** within explicit limits.
Broader authority is easier to justify when the work is bounded, observable, independently checkable, reversible, and low in blast radius.
Ambiguous intent, weak evidence, irreversible commitments, and material external effects should narrow that authority.

Invoking a tool does not transfer accountability to it.
The accepting person or group still needs enough understanding, evidence, and control to stand behind the result and correct it.
The Agent Fleets chapter develops the research background, decision path, and authority-mapping exercise.

The loop below is the local form of this relationship.
The human and agent may occupy different positions in each phase, but the workflow still needs a visible owner, admissible actions, acceptance evidence, and a route for correction.

## Constrain, generate, validate, revise

Roughly put, when you develop with agents you follow a loop where you constrain, generate, validate, and revise before starting again.
The overall efficiency of your development efforts is defined by the efficiency of this loop and I believe mastering this loop is also the key to enabling effective agentic development at scale.
Even in a personal context, it is worth considering the loop and how you are contributing towards its operation so let's consider each part in isolation.

Constraints at the start of a task are hypotheses, not necessarily complete knowledge.
:citet[brooks1987silver] argues that rapid prototyping supports the iterative specification of requirements because important questions become visible only when people interact with a concrete system.
:citet[naur1985theory] similarly describes programming as theory building rather than program-text production.
Implementation can therefore be a way to learn what the specification should say, not only a way to execute it.

> **Delegate work without surrendering judgment**
>
> Cognitive offloading—using external action or aids to reduce a task's cognitive demand—is one reason tools can help people scale their work :citep[risko2016offloading].
> :citet[shaw2026cognitive] use _cognitive surrender_ for a narrower proposed failure: adopting AI output with little scrutiny so its judgment replaces rather than supports the person's own.
> Their experiments used short reasoning tasks, so treat the term as a workflow diagnostic rather than settled cognitive architecture or evidence of professional programming skill loss.
> Generation can be delegated, but constraints, validation, and revision should not all collapse into the same model's unsupported judgment.
> Before accepting a consequential change, the team should be able to explain the intended behavior, name a plausible failure, connect acceptance to independent evidence, and correct or reject the result.

**Constraining**

By constraining process I mean defining the constraints of your systems, or even an individual prompt.
Constraints are useful in sense that they allow less and effectively remove options.
A good example of a constraint is for example defining what kind of development stack to use when starting a project.
In addition, constraints can be stored at your project itself and commonly agentic projects include a lot of documentation that describes the meta-level of your project so it is easy for an agent to understand the context where it operates.
As you look at projects developed by agents, you'll notice standard files, such as `AGENTS.md`, that are exactly about constraining how an agent can work within a project.

**Generation**

The second part of the loop, generation, is where the agent is doing its work based on your prompt.
Although it sounds trivial, it is an important part since it is easy to get this one wrong or end up with higher expenses than you would like.
Model choice should follow the work and local evidence.
A more capable model may avoid retries on uncertain or coupled tasks, while a smaller model may reliably satisfy strong checks on bounded work.
Treat labels such as "planning" and "implementation" as routing hypotheses rather than rules.
A model name is not a capability result: runtime configuration, context, tools, hardware fit, routing, and fallback can all change the outcome and its cost or data boundary.
The Benchmarking chapter shows how to identify and compare the configuration that actually served the work.

Context selection is another generation decision.
Focused retrieval and compact tool output can reduce irrelevant material, but any lossy view can also hide the fact needed to complete or review the task.
Keep important raw evidence retrievable and test context-reduction policies instead of treating fewer tokens as an outcome by itself.

**Validation**

Validation is perhaps the most important part of the loop since it defines the overall performance of your loop in sense that with good validation you can get decent results even from poor models as validation helps to keep them on track.
Interestingly enough you can have your agents develop a big chunk, or even all, of validation logic for you.
The idea is to give your agents tools to let them validate their work.
The most obvious thing to do is to set up strict validation rules for your projects, but the idea scales beyond development.

Validation is stronger when it compares a candidate with an independent reference or inspects the artifact a user actually consumes.
The [Webernetes case study](/case-studies/webernetes/) develops the first pattern through tests shared with a real k3s cluster; the [Slideotter case study](/case-studies/slideotter/) develops the second through geometry, browser, and rendered-output checks.

> **A generated test is still generated output**
>
> In a contrasting workshop report, :citet[talwar2026llms] describes an agent-generated application whose screenshot tests did not exercise the application, whose claimed passkey authentication accepted a username without authentication, and whose data disappeared after restart.
> A useful conclusion is that specifications and generated tests do not constrain a system merely because they exist.
> A screenshot check should launch the real application, authentication should be tested against observable security behavior, and persistence should survive a restart.
> Tests produced by the same agent remain candidate artifacts until their relationship to the required behavior has been established.

A reversible mutation can strengthen this relationship by checking that a test distinguishes the accepted implementation from one named fault.
That contrast does not prove the mutant is realistic or the broader requirement is satisfied, but it is stronger than coverage alone.
The [concern-directed mutation lab](https://github.com/bebraw/scalability_book/tree/main/labs/concern-directed-mutation) lets you apply the pattern to authorization, retry, or archived-state behavior.

**Revision**

Revision, the final part of the loop, is the part where you reflect and adjust based on your understanding.
This is the part where you apply your enhanced learning to have a better starting point for the next loop.
Essentially this is the part where learnings become codified for example as updated requirements, tests, architectural decisions, or project instructions.
It is important to document your learnings as otherwise the implementation might drift apart from its specification and supporting material.

## Agents learn patterns from your codebase

The codebase itself is also part of the context an agent learns from during a task.
:citet[robinson2026maintain] describes allowing several duplicated authorization checks because an agent could maintain them later.
Instead, those accepted shortcuts became examples for the agent to copy into the next change.
A shortcut therefore has two costs: humans may have to repair it later, and agents may treat it as evidence of the project's preferred style.
Validation should ask not only whether the current change works, but also whether it leaves behind a pattern worth repeating.

### Constraint feedback loop

The demonstration below starts with an underspecified request to add CSV export to an event list.
Generate a candidate, validate it against the constraints that were stated, revise the project memory from failed checks, and then begin the next round.
Try completing the loop once with the default constraints and once after selecting every constraint before generation.

{{ import "site/includes/constrain-generate-validate-demo.html" }}

The generated candidate is deterministic teaching data rather than model output.
The useful part is the shape of the loop: validation produces evidence, revision makes the learning explicit, and the revised memory changes the next generation boundary instead of becoming a vague instruction to "try again."

## The job is to convert non-determinism into determinism

Simply put, the new job of a developer is to turn non-deterministic input into deterministic behavior.
That does not make the model itself deterministic; it surrounds interpretation with explicit boundaries that keep the application predictable.
This observation is at the core of how LLMs work since they rely on statistical inference meaning if you prompt them twice, likely the result will be in some way different.
For this reason, it is a good idea to figure out how to reduce the chance that this interpretation process goes wrong.
A part of this has to do with our technical choices and in his talk, David Khourshid ([Beyond the Prompt: "Goodbye slop; welcome determinism"](https://www.youtube.com/watch?v=uMvTAF280so)) argues using explicit models, state machines, and deterministic core logic around generative components.
This gives validation a clearer target: let the model handle work that benefits from interpretation, but express business rules, state transitions, permissions, and invariants in forms that tests and tools can check repeatedly.
When you codify your domain knowledge as models, they are easy to verify and more difficult for models to break.

Khourshid describes one way to combine these ideas as letting an LLM navigate a deterministic state machine: given a goal and the current state, the model chooses from the events the machine currently permits.
The demonstration below applies that pattern to an agent delivering a code change.
At each state, choose among only the events that the machine currently enables.
The statechart expresses hierarchy, parallel verification, recovery, and completion while keeping the model away from events that are not currently legal.

{{ import "site/includes/statechart-boundary-demo.html" }}

Notice what the statechart provides beyond a linear checklist.
One cancellation rule applies throughout the compound active state, tests and human review can progress independently, and either kind of failure can return the workflow to implementation.
The model may choose a route, but the statechart defines the available routes.

Deterministic boundaries also depend on how the application represents valid data and commits state.
The Architecture chapter develops that connection through constructive data modeling, runtime parsing, authorization, and atomic persistence.

## The project harness

When using agents, the application code is only one part of the project.
The other part is the harness around the code: the files, commands, rules, and examples that help humans and agents understand what is expected.
A good harness reduces the amount of hidden context a contributor needs before they can make a useful change.

The harness must also make failures at system boundaries visible.
An analysis of more than 3,800 reported bugs across three coding tools found that API, integration, or configuration errors accounted for 36.9% of root causes, while tool invocation and command execution were the most affected workflow stages :citep[zhang2026pitfalls].
The sample is limited to public issue reports, but the result is a useful warning: model reasoning is only one possible failure source.
Strict tool contracts, useful errors, reproducible commands, and observable execution belong to the project harness too.

It is this harness that keeps your project maintainable, and you will end up evolving throughout your project while sharing good practices with other projects.
One purpose of this book is to make you aware of those practices since I had to spend a lot of time myself to discover many of them and not all are obvious.
As you work on your project, it is a good idea to push anything repetitive to your harness.

For example, my [vibe-template](https://github.com/bebraw/vibe-template) project separates the starter application from the harness around it.
The Cloudflare Worker and TypeScript setup are specific implementation choices, but the reusable lesson is more general: the repository contains agent instructions, architecture rules, feature specs, decision records, setup notes, and validation commands.
Those artifacts make it easier to start quickly without letting the codebase become a pile of undocumented accidents.
This project comes with a ready-made process for me to pull my practices to other projects so it may be worth studying as an example.

The [common project specification](/project/#6-minimum-project-harness) owns the exact required artifacts.
The practical baseline is simpler than the list: can another student or agent clone the project, understand its intended shape, run it and its checks, and make a small change without guessing?
An environment definition is part of that contract rather than neutral background; the Friction chapter develops how to test it from a fresh checkout.
That chapter also explains why validation cost should follow change risk instead of running every check after every edit.

### Reuse practices without cloning the whole harness

Once a useful practice has emerged, copying the complete starter repository into an existing project is usually too coarse.
Adoption and maintenance are different problems.
A capability such as mutation testing can be packaged with its fit criteria, files, dependencies, integration instructions, and checks so another project can adopt only that capability.
Later improvements need a smaller migration note or patch that preserves the target project's conventions instead of restoring the source template around it.

The reusable unit is therefore not necessarily the template snapshot.
It can be a bounded practice with provenance, an adoption path, and an update path.
This keeps the harness evolvable without making every downstream project carry every experiment performed by its source template.

[Modern Web Guidance](/case-studies/modern-web-guidance/) shows how a maintained external capability can package fast-changing domain knowledge with targeted retrieval, compatibility constraints, an update path, and task-level evaluation.
The broader lesson is to reuse a bounded practice with provenance rather than freezing a changing reference inside a permanent prompt or relying on the model's training data to remain current.

Imported capabilities also introduce a trust boundary because their instructions or bundled code may influence tools operating with the agent's authority.
The Agent Fleets chapter develops the security and ownership implications, while the [skill-adoption lab](https://github.com/bebraw/scalability_book/tree/main/labs/skill-adoption) provides a bounded review exercise.

## Maintained work needs an owner

It is useful to distinguish disposable code from what Cory Doctorow calls [accretive work](https://pluralistic.net/2026/07/02/canonization/#operate-iterate-improve).
A one-off program can be valuable even when nobody will maintain it.
Once code becomes shared, other people inherit the cost of understanding, reviewing, operating, and correcting it.
The standard should therefore follow the consequences and expected lifetime of the work rather than whether a human or model typed it.

Publishing an issue or patch transfers some of that cost to an external maintainer.
The Agent Fleets chapter treats publication as an externally consequential action that needs a human owner.
Within the course projects, the same principle is simpler: generate as quickly as useful, but accept only work the group can explain, validate, and remain willing to maintain.

## Summary

Agentic development has changed the way web applications are built.
In short, you can move far faster now but this ability also comes with built-in risks.
Therefore, it is essential that you pick up strong engineering practices and develop your intuition of working with agents since that is a skill of its own.
At best, being able to work with the machine well can work as a force multiplier allowing you to implement ideas otherwise out of your reach.
This also means having a different attitude towards development as the shift is moving you towards a managerial position and development lead now that you have a pair or even a team of tireless agents working for you.
