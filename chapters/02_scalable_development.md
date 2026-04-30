# Scalable Development

Scalable development is about keeping a web application possible to change as the system, team, requirements, dependencies, and tooling evolve. A system that can handle more traffic but cannot be safely modified has only solved one part of scalability.

This chapter focuses on development practices and structures that reduce the cost of change. Composition remains an important theme, but it is treated as one technique among others rather than as the whole topic.

## Themes

* Codebase structure and module boundaries
* Composition of features, services, user interfaces, and infrastructure
* Local development environments and reproducible setup
* Testing strategy and confidence when changing existing behavior
* Continuous integration and review practices
* Dependency management and upgrade pressure
* Documentation as support for future change
* AI-assisted development and the need to review, constrain, and maintain generated code

## Learning goals

After this chapter, students should be able to:

* Explain why development scalability is different from runtime performance scalability.
* Identify codebase and workflow choices that make future changes easier or harder.
* Use composition to manage complexity without hiding important system behavior.
* Evaluate AI-assisted code as maintainable software rather than as a one-time output.
* Connect development practices to the later project phases: construct, reconstruct, and deconstruct.
