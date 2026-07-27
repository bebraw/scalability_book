# How can development remain scalable?

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

In the context of this book, I'll focus primarily on agentic development at the level of a single agent since it is possible to take those ideas to scaling agents as you'll hit the same problems, but at a pronounced rate.
The ideas behind effective agentic development are good development practices in general, and I'll provide a good list of those for you in this chapter.

Since agentic development allows you to produce vast amounts of code fast through prompting, this brings you to the same old practices encountered by developers for decades at an elevated rate.
The term vibe coding coined by Andrej Karpathy in February 2025 captures well the dark side of this kind of development and for this reason it is occasionally used as a pejorative against development practices that focus on visual results while forgetting what is underneath.
This doesn't mean vibe coding cannot be useful as a prototyping technique, but that it can be dangerous to forget to design your codebase so that it follows good practices and follow security practices to avoid leaking client data or causing unnecessary cost or reputation loss to the developer.

It turns out, to get most out of agentic development, you will need a certain amount of discipline.
That is the main reason why it is important to understand technical details as in what should good architecture look like and how to develop software sustainably.
In [Shift-Up: A Framework for Software Engineering Guardrails in AI-native Software Development - Initial Findings](https://arxiv.org/html/2604.20436v1), Lipsanen et al. consider this issue and propose structured development as an alternative to unstructured vibe coding.
On top of structured development, the authors propose the Shift-Up approach that trades development speed for human control.
Practices are still emerging, and I have no doubt we'll find better and worse ways to work machines.
The question is what values we want to emphasize.

In short, agentic development has changed web development by shifting the abstraction level.
Instead of writing code, you massage the codebase into your preferred shape.
The big question is, how to do this effectively.
I'll consider this question next based on my own experience gained through the development of my own projects, especially [Slideotter](https://slideotter.com/), a large web application designed around slide authoring.

## How to develop web applications using agents sustainably?

As mentioned, giving into the vibes and prompting your application can be seductive in sense that it allows you to achieve visible results fast.
For a simple project that is easy to specify, sometimes even a single prompt can be enough to produce something usable even with the current tools.
For example, the layout of the [SDLCAI](https://www.sdlcai.org/) was produced as one-shot using a carefully crafted prompt that provided the model enough context and constraints.
Both context and constraints are at the core of using these tools.
Commonly constraints are also called guardrails, and for a good reason.
A big part of agentic engineering and working with AI systems in general is exactly about figuring out boundaries for the systems and constraining how it can work.

> **Sustainability angle**
>
> Sustainable agentic development has two meanings here.
> It means keeping the project maintainable for humans, but it also means avoiding wasteful tool use.
> Focused prompts, smaller context, reusable instructions, and strong validation loops reduce repeated generation and unnecessary compute.

Roughly put, when you develop with agents you follow a loop where you first constrain, then generate, and finally validate the results before starting again.
The overall efficiency of your development efforts is defined by the efficiency of this loop and I believe mastering this loop is also the key to enabling effective agentic development at scale.
Even in a personal context, it is worth considering the loop and how you are contributing towards its operation so let's consider each part in isolation.

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

The final part of the loop, validation, is perhaps the most important one since it's the part that defines the overall performance of your loop in sense that with good validation you can get decent results even from poor models as validation helps to keep them on track.
Interestingly enough you can have your agents develop a big chunk, or even all, of validation logic for you.
The idea is to give your agents tools to let them validate their work.
The most obvious thing to do is to set up strict validation rules for your projects, but the idea scales beyond development.

A useful example is the development of [Webernetes, a partial TypeScript port of Kubernetes that runs in the browser](https://ngrok.com/blog/i-ported-kubernetes-to-the-browser).
Most of its code was generated with language models, but generation was not treated as evidence of correctness.
The author reviewed the generated code and built integration tests that exercised the same operations against Webernetes and a real k3s cluster.
When the browser implementation behaved differently, the mismatch became a concrete failure the developer and agent could investigate.
This is stronger than asking a model whether its own output looks correct: the harness compares behavior against an independent reference implementation.

For slideotter, one of the smartest decisions I did was to define layout rules for my LLMs early on to enable generation of sensible visual layouts that don't overlap or look otherwise weird.
A big part of working with agents is getting better at figuring out how to set up effective validation rules since this can define whether your project stays on rails or not.
If you don't take care, you can end up with a lot of working code that has not been structured well and in turn will be slow and expensive for agents to maintain and develop further.
Technical debt can accrue faster with these tools than you can possibly imagine.

The codebase itself is also part of the context an agent learns from during a task.
In [Write code like a human will maintain it](https://unstack.io/write-code-like-a-human-will-maintain-it), the author describes allowing several duplicated authorization checks because an agent could maintain them later.
Instead, those accepted shortcuts became examples for the agent to copy into the next change.
A shortcut therefore has two costs: humans may have to repair it later, and agents may treat it as evidence of the project's preferred style.
Validation should ask not only whether the current change works, but also whether it leaves behind a pattern worth repeating.

Not every part of an agentic system should be generative.
David Khourshid's talk [Beyond the Prompt: "Goodbye slop; welcome determinism"](https://www.youtube.com/watch?v=uMvTAF280so) argues for explicit models, state machines, and deterministic core logic around generative components.
This gives validation a clearer target: let the model handle work that benefits from interpretation, but express business rules, state transitions, permissions, and invariants in forms that tests and tools can check repeatedly.

> **Writing note**
>
> Reframe this loop around the new comparison.
> Implementation A applies it with a locally hosted single agent, implementation B repeats the same required behavior with a foundation-model single agent, and implementation C applies it through a fleet.
> Emphasize what can be held constant across runs: the brief, acceptance checks, evidence template, and reporting units.
> The fleet adds delegation and integration to the loop rather than representing a third kind of model.

## The project harness

When using agents, the application code is only one part of the project.
The other part is the harness around the code: the files, commands, rules, and examples that help humans and agents understand what is expected.
A good harness reduces the amount of hidden context a contributor needs before they can make a useful change.

It is this harness that keeps your project maintainable, and you will end up evolving throughout your project while sharing good practices with other projects.
One purpose of this book is to make you aware of those practices since I had to spend a lot of time myself to discover many of them and not all are obvious.
As you work on your project, it is a good idea to push anything repetitive to your harness.

For example, my [`vibe-template`](https://github.com/bebraw/vibe-template) project separates the starter application from the harness around it.
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
- Example environment files, such as `.env.example`, when configuration or secrets are needed locally.
- A short AI-use log noting what AI assistance was used, what was reviewed manually, and what had to be corrected.

You can have an agent to generate a lot of that and refine as needed.
Note that local CI, mutation testing, browser automation, performance budgets, pre-push hooks, and reusable capability kits are valuable, but they are optional upgrades for groups that have a reason to add them.
The baseline is simpler: can another student or agent clone the project, understand the intended shape, run the checks, and make a small change without guessing?

## From slop to top

While agents can allow you to develop entire web applications fast, they also require responsible usage as otherwise you might end up with what some people call derogatively as slop, something that was artificially generated and looks such.
When used responsibly and with good taste, I argue that AI tools can help you to elevate your own skills by a magnitude.
Therefore, your task is to become a strong engineer that understands both the domain and engineering since it is this combination that enables productivity with AI.

It is useful to distinguish disposable code from what Cory Doctorow calls [accretive work](https://pluralistic.net/2026/07/02/canonization/#operate-iterate-improve).
A one-off program can be valuable even when nobody will maintain it.
Code that becomes part of a shared application has a different obligation: it should leave the team and future agents able to operate, understand, and improve it.
Implementation A belongs to this second category because an unfamiliar group will audit it and its evidence will be compared with two later implementations.
Getting the first version to run is therefore a milestone, not the finish line.

Most importantly you have to be able to judge what the tools emit and where to take your project.
A big chunk of this comes with experience, but to avoid some of the pain and speed up your personal development, it is a good idea to pick up at least some basic ideas so you don't have to go through the trouble and find the lessons on your own.
That is the main reason why we write a big project in three stages in this book, and I'll describe the first part of the project next.

While the course project has been designed to be completed in groups, you can also complete the project alone and cut the scope for example.
Although you can learn a lot by reading, it is hard to beat learning by doing as then you can experience the problems related to this type of development concretely.
Therefore, I encourage developing small prototypes beyond this book as now prototyping is cheap, and you'll learn a lot in the process.

## Book project - Work Activity Tracker

During this book, you will implement the same bounded web application three times.
The [common project specification](/project/) defines workspaces, work items, a small lifecycle, activity events, filtering, summaries, validation, and persistence.
These observable requirements stay substantially stable so the three results can be compared.

The specification deliberately leaves many decisions open.
Your group chooses how the domain feels, which terminology appears in the interface, the technical stack, rendering approach, storage, architecture, deployment path, and one implementation question worth investigating.
Different groups should arrive at recognizably different applications without changing the common behavior.

The point is not to predict the perfect design.
It is to form an explicit implementation hypothesis, build it, collect evidence, and revise your understanding before the next fresh implementation.

## Implementation discovery lab

Use this lab to turn the [shared specification](/project/) into a direction your group wants to explore.
It does not approve or reject an idea.
Instead, it records four decision anchors and generates a short brief you can discuss, revise, and place in the project repository.

{{ import "site/includes/project-fit-checker.html" }}

---

The implementation should remain deliberately modest.
Interpretive freedom is not a request for more features.
A small monolith, a server-rendered application, a rich client with an API, an event-oriented design, or an unusual language can all be appropriate when the group can explain the choice and provide a reliable path for another group to run it.

The same primary stack will normally be used for all three implementations.
This makes the changing AI development setup easier to study.
The implementation can still change substantially because requirements, models, tools, prompts, architecture decisions, and accumulated understanding do not determine one inevitable result.

Implementation A is also where agentic development becomes concrete.
Document what the local model was asked to do, what constraints and validation it received, what it misunderstood, and what the group corrected manually.
The implementation direction is a starting hypothesis; the evidence package shows what actually happened.

Questions worth discussing before implementation:

- What should a workspace and work item mean in the interface?
- Which user moment should feel especially clear or effortless?
- What does the chosen stack let the group learn or constrain?
- Which architectural boundary should remain visible?
- What evidence could challenge the group's initial assumption?
- How will a student unfamiliar with the stack set up and inspect the project?
- Which optional idea will wait until the common core works?

## Themes

- Codebase structure and module boundaries
- Composition of features, services, user interfaces, and infrastructure
- Local development environments and reproducible setup
- Testing strategy and confidence when changing existing behavior
- Continuous integration and review practices
- Dependency management and upgrade pressure
- Documentation as support for future change
- AI-assisted development and the need to review, constrain, and maintain generated code

## Learning goals

After this chapter, students should be able to:

- Explain why development scalability is different from runtime performance scalability.
- Identify codebase and workflow choices that make future changes easier or harder.
- Use composition to manage complexity without hiding important system behavior.
- Evaluate AI-assisted code as maintainable software rather than as a one-time output.
- Connect development practices to implementations A, B, and C and the development setup used for each.

## Project artifact

Students should create a first version of the project harness.
It should include a README, setup command, one agent instruction file, one architecture note, one feature spec for the core event workflow, one decision record for the initial stack or storage choice, one fast validation command, and a short AI-use log.
The harness can be lightweight, but it should be concrete enough that another group can run and inspect the project and that the final comparison can explain its development workflow.

## Notes for further development

- Add a short distinction between transferable knowledge and transferable code.
  Good specifications, tests, examples, and validation practices should improve across phases without allowing the later implementation to become a fork of the first.
- Make the evidence log part of the constrain-generate-validate loop.
  Students should record task framing, relevant model/tool configuration, validation outcome, human correction, and approximate cost or latency without submitting an unreadable raw transcript.
- Explain that local models are affected by hardware, serving configuration, context limits, and quantization.
  Ask for contextual reporting rather than simplistic local-versus-cloud rankings.
- Keep the harness discussion, but distinguish a common course harness from implementation-specific project memory.
  Decide in the shared specification which harness files are supplied, which students author, and which may be carried into later builds.
- Keep the implementation discovery lab aligned with the shared specification as the project evolves.
  It should support reasoning and conversation rather than score whether a group has found the “right” idea.
