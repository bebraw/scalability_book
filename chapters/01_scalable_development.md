# Scalable Development

As systems evolve, they tend to become more difficult to develop as the existing requirements and code may work against you. This problem has been amplified with the introduction of so-called agentic coding, where computer agents leveraging large language models (LLMs) essentially do the coding work for us. While the abstraction level has shifted, arguably this hasn't changed the fundamentals behind software engineering. We are still in a position where we have to figure out different types of requirements and map them to our applications.

In this chapter, I will bring you up to speed with agentic development while considering its impact on software engineering and web development in particular. Note that the space is moving fast at the moment, so some of the content may already be outdated by the time you read it so make sure to do your own research on top!

## How are agents changing web development?

For a long time, web applications were written manually using a suitable editor. Of course visual editors able to generate HTML has existed since the 90s, but for any serious development often code has had to be written unless a specific platform abstracting it out has been used. Since late-2022 with the introduction of ChatGPT, the way we program has begun to shift, first with so-called copilots that complete sections of code as you write it, and then with agents that can develop what you want based on prompting. On top of this we have whole systems that can orchestrate how multiple agents develop a system even independently. Even then, the challenge becomes how to ensure the system is producing right outputs.

In the context of this book, I'll focus primarily on agentic development at the level of a single agent since it is possible to take those ideas to scaling agents as you'll hit the same problems, but at a pronounced rate. The ideas behind effective agentic development are good development practices in general, and I'll provide a good list of those for you in this chapter.

Since agentic development allows you to produce vast amounts of code fast, this brings you to the same old practices encountered by developers for decades at an elevated rate. The term vibe coding coined by Andrej Karpathy in February 2025 captures well the dark side of this kind of development and for this reason it is occasionally used as a pejorative against development practices that focus on visual results while forgetting what is underneath. This doesn't mean vibe coding cannot be useful as a prototyping technique, but that it can be dangerous to forget to design your codebase so that it follows good practices and follow security practices to avoid leaking client data or causing unnecessary cost or reputation loss to the developer.

It turns out, to get most out of agentic development, you will need a certain amount of discipline. That is the main reason why it is important to understand technical details as in what should good architecture look like and how to develop software sustainably. In [Shift-Up: A Framework for Software Engineering Guardrails in AI-native Software Development - Initial Findings](https://arxiv.org/html/2604.20436v1), Lipsanen et al. consider this issue and propose structured development as an alternative to unstructured vibe coding. On top of structured development, the authors propose the Shift-Up approach that trades development speed for human control. Practices are still emerging, and I have no doubt we'll find better and worse ways to work machines. The question is what values we want to emphasize.

In short, agentic development has changed web development by shifting the abstraction level. Instead of writing code, you massage the codebase into your preferred shape. The big question is, how to do this effectively. I'll consider this question next based on my own experience gained through the development of my own projects, especially [Slideotter](https://slideotter.com/), a large web application designed around slide authoring.

## How to develop web applications using agents in a sustainable manner?

TODO

## Questions

How do the latest improvements to development techniques affect the way we develop? How can we get set with our development efforts the right way?

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
- Connect development practices to the later project phases: construct, reconstruct, and deconstruct.
