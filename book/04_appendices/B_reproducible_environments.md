# Reproducible development environments

Use this appendix when setup failures, hidden host state, inconsistent resource limits, or environmental drift make a project difficult to run or evaluate.
The Friction chapter keeps the essential project rule—declare the supported environment and test it from a fresh checkout—while this appendix develops the distinctions and audit procedure in depth.

## Treat the environment as a versioned input

A dependency lockfile does not describe the whole development environment.
Runtime and package-manager versions, system packages, local services, process startup and readiness, test hooks, browser or command-line tools, and supported operating-system, architecture, and resource assumptions can remain hidden on one workstation.
When another contributor, CI worker, or agent sandbox receives the same repository but cannot run its checks, the failure may reveal an implicit input, an incorrect support boundary, or an external or transient dependency.

For an agent, this state is part of the task rather than neutral background.
In an internal Anthropic experiment that held the Claude model, harness, and Terminal-Bench 2.0 task set constant, reported infrastructure-error rates fell from 5.8% under strict enforcement to 0.5% with uncapped resources across six configurations; above roughly three times the benchmark specification, additional headroom was also associated with solution strategies that could not succeed under tighter limits :citep[segato2026infrastructure].
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
From a fresh checkout on another supported machine or container, with project caches, generated files, and project-owned service state absent, run the documented setup and baseline validation and record the host prerequisites already present.
Capture the setup time and outcome, any undocumented intervention or retry, the failure stage, and relevant host, resource, or network conditions; record required configuration names but never secret values.
After a repair, the authors or CI should replay the path from a fresh state.
The result supports a bounded claim about the declared setup, not that production is identical or that a stochastic agent will produce the same patch.

## Choose the required strength

Not every project needs hermetic execution or bit-for-bit reproducible builds.
Choose the weakest environment contract that still supports the decision: documented setup for ordinary collaboration, a declared and pinned environment for comparable course evidence, isolation for actions that must not depend on host state, or reproducible artifacts when independent builders must verify identical output.
State the remaining external boundaries instead of implying that a tool has removed them.
