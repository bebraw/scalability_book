# Reproducible development environments

Use this appendix when setup failures, hidden host state, inconsistent resource limits, or environmental drift make a project difficult to run or evaluate.
The [Friction chapter](/chapters/friction/) keeps the essential project rule—declare the supported environment and test it from a fresh checkout—while this appendix develops the distinctions and audit procedure in depth.

## Treat the environment as a versioned input

A dependency lockfile does not describe the whole development environment.
Runtime and package-manager versions, system packages, local services, process startup and readiness, test hooks, browser or command-line tools, and supported operating-system, architecture, and resource assumptions can remain hidden on one workstation.
When another contributor, CI worker, or agent sandbox receives the same repository but cannot run its checks, the failure may reveal an implicit input, an incorrect support boundary, or an external or transient dependency.

For an agent, this state is part of the task rather than neutral background.
In an internal Anthropic experiment that held the Claude model, agent harness, and Terminal-Bench 2.0 task set constant, reported infrastructure-error rates fell from 5.8% under strict enforcement to 0.5% with uncapped resources across six configurations; above roughly three times the benchmark specification, additional headroom was also associated with solution strategies that could not succeed under tighter limits :citep[segato2026infrastructure].
The vendor-authored study concerns benchmark infrastructure rather than developer onboarding, but it supports recording CPU and memory allocations, hard limits, and enforcement policy; time limits are a separate run condition worth recording.

Keep four related claims separate:

- **Setup automation** provides a bootstrap path, but that path may still be unpinned, stateful, or dependent on the network.
- A **declared environment** records and, where possible, pins the toolchain, dependencies, service definitions, configuration schema, seed-data revision, and supported platform and resource scope needed to reconstruct setup and run the baseline checks.
- **Hermetic execution** isolates an action from undeclared host state and external services and restricts it to declared inputs and controlled tools; running inside a container does not establish this by itself.
- A **[reproducible build](https://reproducible-builds.org/docs/definition/)** means that, given the same source, build environment, and build instructions, independent builders produce bit-for-bit identical copies of the specified artifacts.

[devenv](https://devenv.sh/) is one Nix-based example: it can declare packages, languages, tasks, services, processes, tests, hooks, profiles, and containers, while its lock file records external inputs.
It is an implementation example rather than evidence that one tool or Nix fits every project.
In a large-scale study of 709,816 package instances from historical Nixpkgs snapshots, more than 99% could be rebuilt successfully, while bitwise reproducibility ranged from 69% to 91% :citep[malka2025functional].
That result concerns package builds, not interactive development workflows or cross-platform equivalence, and shows that declared inputs alone do not guarantee bitwise-identical outputs.
Native setup scripts, development containers, and other environment managers can support the same project contract.

Declare which secrets are required and how they are supplied, but inject their values at runtime rather than pinning or committing them in the environment definition.
Name host kernels, hardware, networks, mutable service data, and external APIs that remain non-reproducible boundaries; prefer local or demonstration substitutes for the baseline and never require production credentials.
Mutable downloads still need a lock, checksum, digest, or explicit freshness policy.
Strict pins need an update and security-review policy; reproducibility should not turn an old dependency into an invisible permanent dependency.

Use the existing cross-team audit as the test.
Run it as follows:

1. Start from a fresh checkout on another supported machine or container.
   Remove project caches, generated files, and project-owned service state from the starting conditions.
2. Record the host prerequisites already present, then run the documented setup and baseline validation.
3. Capture the setup time and outcome, any undocumented intervention or retry, the failure stage, and relevant host, resource, or network conditions.
   Record required configuration names, but never secret values.
4. After a repair, have the authors or CI replay the path from a fresh state.

The result supports a bounded claim about the declared setup, not that production is identical or that a stochastic agent will produce the same patch.

## Choose the required strength

Not every project needs hermetic execution or bit-for-bit reproducible builds.
Choose the weakest environment contract that still supports the decision: documented setup for ordinary collaboration, a declared and pinned environment for comparable course evidence, isolation for actions that must not depend on host state, or reproducible artifacts when independent builders must verify identical output.
State the remaining external boundaries instead of implying that a tool has removed them.

### Field note — Make validation local and proportional

I value a development environment that is easy to bootstrap and safe to bootstrap again.
Setup should be idempotent: rerunning it should converge on the supported project state or report a clear incompatibility instead of accumulating hidden changes.
Without that property, stale dependencies and one-off repairs can eventually leave a project insecure or unable to run.

An agent should be able to perform most validation locally.
In my agent-assisted projects, remote CI has generally been too slow to serve as the primary feedback loop because an agent can produce several changes during one CI cycle.
This does not make CI unnecessary.
For larger projects, it remains valuable as an independent acceptance gate.
Its role depends on the project's scope and the cost of its checks.

I have tried to encode this approach in [Vibe Template](https://github.com/bebraw/vibe-template), whose [affected-guardrail decision](https://github.com/bebraw/vibe-template/blob/main/docs/adrs/implemented/ADR-026-run-affected-guardrails-when-possible.md) documents the focused path and its fallbacks to broader validation.
The validation loop has several strengths:

1. **Run focused checks during ordinary iteration.** Select tests, diagnostics, and mutation targets from the affected files where the dependency information is reliable.
2. **Run a broader gate before accepting substantial work.** Use the project's baseline validation when a change crosses boundaries or the affected-file analysis may be incomplete.
3. **Reserve expensive checks for justified cases.** A full mutation run can be too costly for every iteration, so use it for high-risk changes, explicit audits, or scheduled validation.
4. **Retain CI where independence matters.** Larger projects still benefit from a clean remote environment before merge or deployment.
5. **Use containers when isolation earns its cost.** A container-based local run is safer when setup requires difficult system dependencies or could otherwise disturb the developer's machine.
   Simpler projects may not need that boundary.

Affected validation introduces its own obligation: the selector must recognize configuration changes, deleted files, shared dependencies, and other cases that should widen the check.
A fast loop is only useful when it fails conservatively instead of silently excluding relevant work.

The goal is not to run fewer checks for its own sake.
It is to give agents the fastest trustworthy feedback available while preserving broader and more independent validation for decisions that justify the additional cycle time.
