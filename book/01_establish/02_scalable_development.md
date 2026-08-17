# How to develop in a scalable way?

As systems evolve, they tend to become more difficult to develop as the existing requirements and code may work against you.
This problem has been amplified with the introduction of so-called agentic coding, where computer agents leveraging large language models (LLMs) essentially do the coding work for us.
While the abstraction level has shifted, arguably this hasn't changed the fundamentals behind software engineering.
We are still in a position where we have to figure out different types of requirements and map them to our applications.

In this chapter, I will bring you up to speed with agentic development while considering its impact on software engineering and web development in particular.
Note that the space is moving fast at the moment, so some of the content may already be outdated by the time you read it so make sure to do your own research on top!

## How are agents changing web development?

For a long time, web applications were written manually using a suitable editor.
Of course visual editors able to generate HTML has existed since the 90s, but for any serious development often code has had to be written unless a specific platform abstracting it out has been used.
Since late-2022 with the introduction of ChatGPT, the way we program has begun to shift, first with so-called copilots that complete sections of code as you write it, and then with agents that can develop what you want based on prompting.
On top of this we have whole systems that can orchestrate how multiple agents develop a system even independently.
Even then, the challenge becomes how to ensure the system is producing right outputs.

In the context of this book, we will first use a local model to implement [the book project](/project/) before trying the same with a foundation model and moving onto a fleet of agents to appreciate the differences and related challenges.
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

Here, "reading" is shorthand for building and testing a useful mental model, not manually inspecting every generated line.
Types, tests, contracts, static analysis, small modules, architectural notes, and AI-assisted search or review can compress the work by directing attention and supplying evidence.
They expand comprehension capacity only when they reduce uncertainty rather than create more assertions to inspect.
A live study of an LLM review assistant at Mozilla and Ubisoft illustrates both sides: generated comments sometimes contributed to later revisions, but reviewers still had to inspect them and accepted only a minority :citep[olewicki2026review].

:citet[brooks1987silver] distinguishes accidental difficulties that tools can reduce from essential difficulties rooted in the software problem, with complexity central among them.
:citet[lehman1980programs] similarly observes that an evolving program tends to become more complex unless deliberate work is performed to maintain or simplify it.
Agentic development can reduce the effort of producing a change, but by increasing the rate of change it makes architecture, validation, and the project harness more consequential.

I will consider this question next based on my own experience gained through the development of my own projects.
The case studies follow three different outcomes: [Slideotter](/case-studies/slideotter/) generated valuable architecture and validation lessons without yet finding a clear production path; [Thesis Journey Tracker](/case-studies/thesis-journey-tracker/) constrained a small supervision workflow and became a working production tool; and [Kirjolab](/case-studies/kirjolab/) reached broad scientific-authoring scope before requiring substantial consolidation.
Slideotter and Kirjolab are so large by their scope I could never have completed them on my own so in that sense agentic development was a game changer for me.
A single developer that can work with the machine can achieve far more than ever in the past.

## How to develop web applications using agents sustainably?

As mentioned, giving into the vibes and prompting your application can be seductive in sense that it allows you to achieve visible results fast.
For a simple project that is easy to specify, sometimes even a single prompt can be enough to produce something usable even with the current tools.
For example, the layout of the [SDLCAI](https://www.sdlcai.org/) was produced as one-shot using a carefully crafted prompt that provided the model enough context and constraints, but it took a surprising amount of time to implement a form to capture prospects safely as my agent was not well familiar with the problem.

Both context and constraints are at the core of using these tools.
Commonly constraints are also called guardrails, and for a good reason as they protect the agent from going off the rails.
In addition, I prefer to use quality gates that the agent has to run at predefined occasions, for example when completing work or when work is pushed to a remote repository.
While tight guardrails and quality gates can improve quality in general, they also come with a cost in terms of time spent, so there may be engineering compromises to be made.
When you are developing a web application the agentic way, you are not working only on the application but also the surrounding layer to support its efficient development and in practice it is that supporting layer that often defines how successful your development efforts are in terms of both quality and budget.

Ironically a considerable part of working with agents is about figuring out how to work with agents especially when you are starting out.
For this reason, I encourage you to perform experiments and maintain some kind of project template you improve over time.
Mine is called [vibe-template](https://github.com/bebraw/vibe-template), and it might have some patterns you could find useful for yours though I have no doubt you may have different opinions on some things.
I have found it interesting that with agentic development, techniques such as mutation testing (see [Stryker](https://stryker-mutator.io/)) and static analysis (see [Fallow](https://github.com/fallow-rs/fallow)) have become increasingly usable.
I use static analysis to decrease the cognitive complexity of my codebases while mutation testing is useful in improving the code coverage of my tests while improving their quality and avoiding unnecessary tests.
Manually these tools would require a huge amount of effort but when an agent is doing the work, the situation is vastly different, and I consider these kinds of tools good examples of guardrails.

These scores also expose the risk described by Goodhart's law: a measure used as a control target can lose its relationship with the outcome it was meant to represent :citep[goodhart1975monetary].
An agent can raise coverage, mutation, or static-health scores mechanically without making the system safer or easier to change.
Treat the score as diagnostic evidence, inspect how it changed, and pair it with behavioral and human review rather than making the number itself the goal.

> **Sustainability angle**
>
> Sustainable agentic development has two meanings here.
> It means keeping the project maintainable for humans, but it also means avoiding wasteful tool use.
> Focused prompts, smaller context, reusable instructions, and strong validation loops reduce repeated generation and unnecessary compute.

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
> Their preregistered experiments found that participants often followed deliberately faulty AI answers, but the term comes from a preprint using short reasoning tasks :citep[shaw2026cognitive]{locator="pp. 21–24, 47–48"}.
> The experiments measured adoption, accuracy, and confidence; they did not directly show that deliberation stopped, establish long-term skill loss, or test professional programming.
>
> Use the phrase here as a workflow diagnostic, not as settled cognitive architecture.
> Generation can be delegated, but constraints, validation, and revision should not all collapse into the same model's unsupported judgment.
> Before accepting a consequential change, the team should be able to explain the intended behavior, name a plausible failure, connect acceptance to independent evidence, and correct or reject the result.
> Deliberate friction can help: cognitive forcing functions reduced overreliance on incorrect AI advice, although participants found effective interventions less convenient :citep[bucinca2021trust].

**Constraining**

By constraining process I mean defining the constraints of your systems, or even an individual prompt.
Constraints are useful in sense that they allow less and effectively remove options.
A good example of a constraint is for example defining what kind of development stack to use when starting a project.
In addition, constraints can be stored at your project itself and commonly agentic projects include a lot of documentation that describes the meta-level of your project so it is easy for an agent to understand the context where it operates.
As you look at projects developed by agents, you'll notice standard files, such as `AGENTS.md`, that are exactly about constraining how an agent can work within a project.

**Generation**

The second part of the loop, generation, is where the agent is doing its work based on your prompt.
Although it sounds trivial, it is an important part since it is easy to get this one wrong or end up with higher expenses than you would like.
You should consider which model you use and why since so-called reasoning models are better for more complex tasks while smaller models can be useful for simple implementation level tasks.
For this reason, people often use different models for planning and implementation.

You should also consider what kind of context your provide to your model, how you provide it, and in which kind of context your agent is operating.
As you work with models, you will hit concepts of context window and token consumption and both are worth optimizing since the models have limited capabilities and can suffer "memory loss" while working which in turn wastes resources and makes you wait longer.
For this reason, people have developed tools, such as [rtk](https://github.com/rtk-ai/rtk), that allow you to optimize token consumption.
Many other solutions exist as well and they are worth researching.

**Validation**

Validation is perhaps the most important part of the loop since it defines the overall performance of your loop in sense that with good validation you can get decent results even from poor models as validation helps to keep them on track.
Interestingly enough you can have your agents develop a big chunk, or even all, of validation logic for you.
The idea is to give your agents tools to let them validate their work.
The most obvious thing to do is to set up strict validation rules for your projects, but the idea scales beyond development.

**Revision**

Revision, the final part of the loop, is the part where you reflect and adjust based on your understanding.
This is the part where you apply your enhanced learning to have a better starting point for the next loop.
Essentially this is the part where learnings become codified for example as updated requirements, tests, architectural decisions, or project instructions.
It is important to document your learnings as otherwise the implementation might drift apart from its specification and supporting material.

## Case study – Webernetes, Kubernetes in the browser

[Webernetes](https://ngrok.com/blog/i-ported-kubernetes-to-the-browser), a partial TypeScript port of Kubernetes that runs in the browser, is a useful example to study as most of its code was generated with language models, but generation was not treated as evidence of correctness.
The author reviewed the generated code and built integration tests that exercised the same operations against Webernetes and a real k3s cluster.
When the browser implementation behaved differently, the mismatch became a concrete failure the developer and agent could investigate.
This is stronger than asking a model whether its own output looks correct: the harness compares behavior against an independent reference implementation.

> **A generated test is still generated output**
>
> In a contrasting workshop report, :citet[talwar2026llms] describes an agent-generated application whose screenshot tests did not exercise the application, whose claimed passkey authentication accepted a username without authentication, and whose data disappeared after restart.
> Talwar interprets the experience as evidence that LLMs cannot program.
> A narrower conclusion is more useful: specifications and generated tests do not constrain a system merely because they exist.
>
> The model provides capabilities that a development harness can invoke, but the harness must connect claims to independent evidence.
> A screenshot check should launch the real application, authentication should be tested against observable security behavior, and persistence should survive a restart.
> Tests produced by the same agent remain candidate artifacts until their relationship to the required behavior has been established.

## Slideotter – The power of validation

For slideotter, one of the smartest decisions I did was to define layout rules for my LLMs early on to enable generation of sensible visual layouts that don't overlap or look otherwise weird.
A big part of working with agents is getting better at figuring out how to set up effective validation rules since this can define whether your project stays on rails or not.
If you don't take care, you can end up with a lot of working code that has not been structured well and in turn will be slow and expensive for agents to maintain and develop further.
Technical debt can accrue faster with these tools than you can possibly imagine.

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

Regardless of your generation approach, it is these kinds of technical choices that will maintain the quality of your implementation and I recommend trying out different kinds of modeling techniques you might be able to find to see if they make a qualitative difference in implementation compared to pure vibe coding.
This becomes interesting particularly in the agent fleet case as you will have multiple different types of agents evaluating your code from different directions.

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

For this course, a minimal harness for your project should include:

- `README.md` explaining the domain, users, event types, setup command, and local development workflow.
- `AGENTS.md` or an equivalent agent instruction file describing how AI tools should work in the repository, including what they must not change without approval.
- `ARCHITECTURE.md` or an architecture note recording cross-cutting rules, major components, storage choices, and assumptions that should survive individual feature changes.
- `specs/{feature}/spec.md` for the main event workflow, including expected behavior, API or UI contracts, regression guardrails, and verification steps.
- `docs/adrs/` or a simpler decision log for choices that will matter later, such as the initial stack, database, deployment target, authentication model, or event storage approach.
- A small set of stable commands for running, testing, formatting, type checking, or otherwise validating the project.
  For an HTTP-based application, this may include plain-text [Hurl](https://hurl.dev/) scenarios that exercise important API requests independently of the implementation language.
- Example environment files, such as `.env.example`, when configuration or secrets are needed locally.
- A short AI-use log noting what AI assistance was used, what was reviewed manually, and what had to be corrected.

You can have an agent to generate a lot of that and refine as needed.
Note that local CI, mutation testing, browser automation, performance budgets, pre-push hooks, and reusable capability kits are valuable, but they are optional upgrades for groups that have a reason to add them.
The baseline is simpler: can another student or agent clone the project, understand the intended shape, run the checks, and make a small change without guessing?

### Start by subtracting from the template

A starter template is a distribution artifact, not the finished architecture of a product.
It may contain examples, optional workflows, migration history, and integrations that are useful to some projects but irrelevant to the one being started.
Keeping all of that material indefinitely increases navigation cost and gives agents more unrelated patterns to consider.
Deleting it immediately can be just as harmful if the removal breaks the only working runtime path or discards the provenance needed to receive later improvements.

A safer initialization pass begins by defining one **closed product loop**: the smallest end-to-end workflow that creates value and produces evidence worth learning from.
List adjacent capabilities explicitly as deferred rather than allowing them to arrive by implication.
Then classify inherited material into four groups:

- **Keep** because it protects the current loop or its development harness.
- **Replace later** because it is still the only working seam.
- **Remove** because it is distribution-only material with no current owner.
- **Decide** because removal would settle a product or architecture question that is still open.

Review the exact removal set before editing the repository, especially when automation or an agent performs the pruning.
If the project will continue to receive improvements from the template, record the template source and starting revision before deleting local migration history.
This makes subtraction a reviewable design step rather than an improvised cleanup.

### Let validation cost follow change risk

The best validation loop is not the one that runs every available check after every edit.
It is the one that returns the cheapest relevant evidence early and adds slower evidence when the change creates additional uncertainty.
A project can organize checks into a small ladder:

1. Run a focused test or static check while changing one behavior.
2. Run affected-file checks before sharing the change.
3. Run a stable baseline gate before treating ordinary work as ready.
4. Add browser, clean-install, workflow-replay, performance, or mutation checks when the changed boundary makes their evidence relevant.

Unknown impact should move the change toward broader validation rather than silently skipping expensive checks.
Known documentation-only or non-runtime changes can use a smaller path.
This model keeps feedback fast without treating validation as optional, and it makes the reason for each expensive check visible.

### Reuse practices without cloning the whole harness

Once a useful practice has emerged, copying the complete starter repository into an existing project is usually too coarse.
Adoption and maintenance are different problems.
A capability such as mutation testing can be packaged with its fit criteria, files, dependencies, integration instructions, and checks so another project can adopt only that capability.
Later improvements need a smaller migration note or patch that preserves the target project's conventions instead of restoring the source template around it.

The reusable unit is therefore not necessarily the template snapshot.
It can be a bounded practice with provenance, an adoption path, and an update path.
This keeps the harness evolvable without making every downstream project carry every experiment performed by its source template.

> **Case study – importing a living capability**
>
> [Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance/get-started) packages current web-platform knowledge as installable instruction bundles, called skills, for coding agents.
> Instead of assuming that a model already knows the latest HTML, CSS, accessibility, performance, and browser-compatibility practices, an agent searches the collection and retrieves only the guide relevant to its task.
> A project can also state a [Baseline](https://web.dev/baseline) browser-support target in its agent instructions, turning compatibility from an accidental property of generated code into an explicit project constraint.
>
> This extends the idea of a project harness beyond files maintained inside one repository.
> The guidance has provenance and an update path, while targeted retrieval avoids placing the whole reference library in every agent context.
> For reproducible work, record which version or update policy governed a change.
> Its recommendations still remain inputs rather than proof: the project is an [early preview](https://github.com/GoogleChrome/modern-web-guidance-src), its maintainers' priorities may not match the application's users, and generated behavior still needs to be checked in representative browsers and assistive technologies.
>
> The durable pattern is broader than this particular tool.
> Keep fast-changing domain knowledge in a maintained capability, retrieve the smallest relevant part, declare the local constraints that govern its use, and connect its recommendations to independent validation.
> This is safer than copying a changing reference into a permanent prompt or trusting the model's training data to remain current.

## How to avoid slop?

While agents can allow you to develop entire web applications fast, they also require responsible usage as otherwise you might end up with what some people call derogatively as slop, something that was artificially generated and looks such.
When used responsibly and with good taste, I argue that AI tools can help you to elevate your own skills by a magnitude.
Therefore, your task is to become a strong engineer that understands both the domain and engineering since it is this combination that enables productivity with AI.

Immediate output is not the only outcome worth protecting.
Across three randomized experiments involving arithmetic and reading-comprehension tasks, brief AI assistance improved work while it was available but reduced later unaided performance and persistence; the decline was concentrated among participants who used AI for direct solutions, while hint-oriented users did not differ significantly from the control group :citep[liu2026assistance].
These short tasks do not establish the long-term effect on professional programming, but they justify a practical course rule: use agents for hints, critique, and verification when the underlying skill must remain yours.

It is useful to distinguish disposable code from what Cory Doctorow calls [accretive work](https://pluralistic.net/2026/07/02/canonization/#operate-iterate-improve).
A one-off program can be valuable even when nobody will maintain it and there slop may be acceptable.
Once code becomes shared with other people, higher qualitative expectations likely come with it especially if and when the code will be maintained in the future by others.

Since agentic development can be so fast, it is easy to gain speed blindness and end up in a situation where you have to refactor your code a lot to get it under control again.
This is exactly what good development practices can help you to avoid as you can both go fast and with good quality if you know what you are doing.
By completing the three book projects, you will likely develop an intuition of what works and what does not when working with different types of agents.

## Summary

Agentic development has changed the way web applications are built.
In short, you can move far faster now but this ability also comes with built-in risks.
Therefore, it is essential that you pick up strong engineering practices and develop your intuition of working with agents since that is a skill of its own.
At best, being able to work with the machine well can work as a force multiplier allowing you to implement ideas otherwise out of your reach.
This also means having a different attitude towards development as the shift is moving you towards a managerial position and development lead now that you have a pair or even a team of tireless agents working for you.
