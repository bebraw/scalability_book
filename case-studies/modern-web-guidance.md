# Modern Web Guidance – Treating current knowledge as a tested dependency

[Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance/get-started) is a preview project supported by the Google Chrome and Microsoft Edge teams and the web-development community.
It packages current web-platform guidance as skills that coding agents can search and retrieve while working.

The case extends the idea of a project harness beyond one repository.
Instead of expecting a model's training data or a permanent prompt to contain the latest HTML, CSS, accessibility, performance, and compatibility practices, a maintained capability supplies a smaller task-relevant guide.
The project then evaluates whether access to that guide changes checked outcomes.

## Case at a glance

| Design choice          | Current approach                                                                 |
| ---------------------- | -------------------------------------------------------------------------------- |
| Knowledge source       | Curated guides and discipline-level skills maintained by domain contributors     |
| Agent access           | Semantic search followed by retrieval of a selected guide                        |
| Compatibility boundary | A declared Baseline target; Widely Available is the default                      |
| Distribution           | A generated installation repository and an npm-based CLI                         |
| Evaluation contrast    | The same coding tasks run with and without access to the guidance                |
| Browser evidence       | Playwright assertions calibrated against reference and deliberately flawed pages |
| Project status         | Preview, with content and tooling still evolving                                 |

This is a case about the design of a knowledge dependency and its evaluation harness.
It is not independent proof that every recommendation is correct or that installing the skill improves every web project.

## Retrieval keeps the working context bounded

Modern Web Guidance contains guidance for more than one hundred web-development use cases.
Its top-level skill instructs an agent to search the collection for the current task and retrieve a matching guide by identifier.
A developer can also use the same [search and retrieve commands](https://developer.chrome.com/docs/modern-web-guidance/get-started#explore-before-installation) before installation to inspect what would enter the agent's context.

This separation matters for scale.
The full library can evolve independently, while a task consumes only the patterns it appears to need.
Descriptions and token counts make selection more inspectable than silently injecting the whole collection.
Retrieval can still fail: the query may select the wrong guide, relevant guidance may be absent, and a concise result may omit a constraint the application needs.
The selected guide therefore remains an input to review rather than an authority over the product.

## Browser support becomes a project constraint

The project connects its recommendations to [Baseline](https://web.dev/baseline), a shared definition of when web-platform features become interoperable across major browser engines.
A repository can state a Baseline year or another support policy in its agent instructions.
Without a local target, Modern Web Guidance defaults to Baseline Widely Available and expects fallbacks for features outside that boundary.

This turns browser compatibility from an accidental property of generated code into an explicit design input.
It does not replace testing on the browsers, devices, and assistive technologies used by the product's actual audience.
A Baseline label describes feature interoperability; it does not establish usability, accessibility, performance, or fit with a particular framework.

## The guidance has an evaluation loop

The [source repository](https://github.com/GoogleChrome/modern-web-guidance-src) separates human-authored guidance from the machinery that distributes and evaluates it.
For an evaluation-ready use case, a subject-matter expert writes the guide, a reference implementation, and natural-language expectations.
The development pipeline generates a deliberately incorrect page and a Playwright grader, then calibrates the grader so the reference passes and the negative page fails.

The harness can then run the same task from the same base application in two conditions: an agent works without the guidance and with access to it.
Both outputs are graded with the task's browser assertions.
This guided-versus-unguided contrast tests whether the capability adds value beyond what the selected agent and model already know, rather than counting whether the agent opened a guide.

The method has useful limits:

- A generated grader can encode the wrong behavior even after calibration.
- One positive and one negative page do not cover every incorrect implementation.
- Natural-language expectations reflect the maintainers' chosen interpretation of the task.
- The current harness uses small base applications and controlled tasks rather than existing production systems.
- Results are local to the tested task, agent, model, prompt scaffold, guide revision, and assertions.

Calibration can reject an obviously broken check.
It cannot turn the check into independent ground truth, so failures and surprising uplifts still require inspection.

## Distribution creates an update tradeoff

The project uses two repositories: contributors work in the [source repository](https://github.com/GoogleChrome/modern-web-guidance-src), while a generated [installation repository](https://github.com/GoogleChrome/modern-web-guidance) contains compiled skills and agent-specific packaging.
The recommended CLI installation supports automatic updates.
That provides a clear maintenance path for knowledge that should change with the platform.

Automatic currency and reproducibility pull in different directions.
An evaluation or consequential change should record the resolved skill version or revision and the project's browser-support target.
An organization may instead pin updates until review, especially because a skill can influence tool calls made with the agent's existing authority.
Official provenance, popularity, and a passing evaluation reduce some uncertainty; none grants the capability permission to override local architecture, security, privacy, or user requirements.

## A practical adoption pattern

A team adopting a living capability can keep the boundary explicit:

1. State the local problem and compatibility target before retrieval.
2. Inspect the selected guide and its provenance rather than trusting a match score alone.
3. Record the resolved capability revision or update policy with the change.
4. Adapt the recommendation to the project's architecture and users.
5. Validate behavior in the real application and representative browsers.
6. Re-run a fixed task cohort when the guide, model, agent, or harness changes materially.
7. Keep a removal or rollback path if the capability stops fitting the project.

This makes the external skill a reviewable development dependency rather than invisible model knowledge.

## Field note — Curate external knowledge without transferring authority

I have not used Modern Web Guidance directly enough to claim that it improved a particular implementation.
I adopted it into [Vibe Template](https://github.com/bebraw/vibe-template) because I consider current web-platform guidance useful context for an agent to have when a relevant decision appears.

The [recorded integration decision](https://github.com/bebraw/vibe-template/blob/main/docs/adrs/implemented/ADR-052-adopt-scoped-modern-web-guidance.md) deliberately narrows the upstream capability.
Retrieval uses a reviewed, pinned version with telemetry disabled, and the skill activates only when browser-facing work requires a platform choice, compatibility interpretation, or fallback.
Project architecture, specifications, user instructions, and validation remain authoritative over anything retrieved.

This is less about installing another tool than defining a knowledge boundary.
An agent should be able to discover that a relevant browser feature, compatibility concern, or native platform pattern exists without loading an entire changing guide into every task or treating external guidance as a project requirement.

For now, this is a reasoned design choice rather than evidence of improved project outcomes.
The capability still needs to justify itself through the decisions and implementations it influences.

## What Modern Web Guidance teaches

Modern Web Guidance demonstrates a scalable way to package fast-changing expertise: maintain it once, retrieve a bounded part when relevant, express compatibility as a local constraint, and test whether the imported knowledge improves checked behavior.

It also shows why the surrounding harness matters as much as the prose.
Search, versioning, calibration, paired runs, browser checks, and update policy determine whether the guidance can be evaluated and maintained.
The durable lesson is to connect imported knowledge to local evidence without confusing either the guide or its grader with proof of product quality.
