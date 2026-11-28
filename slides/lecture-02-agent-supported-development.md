---
marp: true
paginate: true
title: "Lecture 2: Agent-supported development"
---

# What have you let a coding agent do?

## Lecture 2 · Establish

Choose the closest match in Lecture Studio.

Haven’t tried one · Explained code · Proposed a patch · Edited and ran checks

What would you want to check yourself?

<!-- [Sources] lecture_plan.md#2-coding-agents-and-first-experiences -->

---

# How did we ship changes before coding agents?

A colleague asks for a CSV export from the tracker.

**Agree on an example → Write the exporter → Run tests in CI → Review and release**

The colleague opens the CSV. “Build, measure, learn” fills three columns.
What happens next?

<!-- [Sources] book/01_establish/02_scalable_development.md#what-changes-when-agents-implement-code; book/01_establish/02_scalable_development.md#constraint-feedback-through-an-actual-export -->

---

# Who does what when an agent writes the patch?

| Work      | Developer-led                       | Agent-assisted                            |
| --------- | ----------------------------------- | ----------------------------------------- |
| Specify   | Agree on a sample row with the user | Give the agent the row and allowed fields |
| Implement | Write the exporter and tests        | Agent edits, runs checks and revises      |
| Accept    | A teammate inspects the download    | A teammate inspects the download          |

Who decides whether to add an event ID?

<!-- [Sources] book/01_establish/02_scalable_development.md#what-changes-when-agents-implement-code -->

---

# What did the CSV test catch?

{{ import "site/includes/coding-loop-figure.html" }}

<!-- [Sources] book/01_establish/02_scalable_development.md#constrain-generate-validate-revise; site/includes/coding-loop-figure.html -->

---

# Where will the patches wait?

| Patches per hour       | Developer drafts | Agent drafts |
| ---------------------- | ---------------: | -----------: |
| Ready for review       |                2 |            6 |
| One reviewer can check |                3 |            3 |

In this example, every patch passes.
Starting empty, how many await review after one hour of agent drafting?

<!-- [Sources] book/01_establish/02_scalable_development.md#when-generation-outruns-comprehension; lecture_plan.md -->

---

# Who reviewed the change at epilot?

Product, design and support staff requested patches in Slack.
They tried the previews.
Engineers reviewed the code.

| Agent pull requests initiated by non-engineers |  Merged |
| ---------------------------------------------: | ------: |
|                                        **807** | **543** |

What two timestamps would tell you how long a patch waited for review? [Viljami Kuosmanen at SDLCAI · epilot, Feb–Sep 2026](https://www.sdlcai.org/media/talks/non-engineers-vibe-code-production/404574e7-178f-48ea-bca5-02245c74ab6a.pdf#page=22)

<!-- [Sources] book/01_establish/02_scalable_development.md#what-changes-when-agents-implement-code; SDLCAI 2026, Kuosmanen, slides 21–22, 41 and 45 -->

---

# Can a retry record the event twice?

An agent says a restarted worker still remembers request `C7`.
Predict the stored event count.

| First call | Retry on the same worker | Restart, then retry |
| ---------- | ------------------------ | ------------------- |
| ?          | ?                        | ?                   |

[Inspect the recorder and test the claim](https://scalableweb.dev/explore/challenge-an-explanation/)

<!-- [Sources] explorations/challenge-an-explanation.md; book/01_establish/02_scalable_development.md#test-an-explanation-against-behavior -->

---

# Would you release this patch?

The checks pass.
The reviewer asks for a change.

After the agent revises the patch, which evidence from the first version can you still use to release it?

[Try the book’s release demo](https://scalableweb.dev/learn/pilot/agent-development/#slide-gates)

<!-- [Sources] study/pilot/agent-development.md; book/01_establish/02_scalable_development.md#bound-probabilistic-generation-with-deterministic-controls -->

---

# What will your team check in Implementation A?

Pick a tracker transition.
Each teammate predicts what will be stored.

**Operator** guides the agent · **Challenger** tries to break its claim · **Validator** checks the stored result

Which step would you delegate now?
What convinced you?

[Shared engineering session and solo equivalent](https://scalableweb.dev/project/#shared-engineering-sessions)

<!-- [Sources] specifications/00_common_project.md#shared-engineering-sessions; lecture_plan.md -->
