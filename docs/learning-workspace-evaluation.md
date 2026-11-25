# Evaluate the learning workspace

The first release supports the whole published book.
Its technical checks establish working tools and privacy boundaries; they do not establish a learning gain or increased course completion.
Use a voluntary small trial with both an individual learner and a project group to find usability and teaching problems.
Claims that the tools cause better learning or completion require an appropriate comparison and study beyond that trial.
The trial adds no assessment criterion, required report or activity quota.

## A short first investigation

Use two short visits within ordinary study time: approximately 20–30 minutes for an investigation and 5–10 minutes for a return visit, if those budgets suit the learner.
Agree a feasible return date, such as one week later; these are planning suggestions, not participation requirements.
The [topic-learning experiment by Contractor and Reyes](https://arxiv.org/html/2607.08849v2) found a positive immediate effect of randomized AI access and a smaller, less certain delayed advantage.
Its tutoring and outsourcing groups were self-selected, so use help modes as questions to investigate rather than a proven ranking.

1. **Prepare a question and two changed cases.** Let the learner choose something they need to understand.
   The [cache decision lab](https://scalableweb.dev/demos/#demo-cache-decision-lab), for example, asks whether a response can be reused as its age changes.
   Use the authored activity to select two further situations, such as an origin change or a private response requiring validation.
   Before seeing learner responses, identify the relevant assumptions and acceptable reasoning from the authored material; the assisting model's answer is not the answer key.
2. **Investigate with chosen support.** Capture an initial prediction without a model, then try one chosen help mode, an actual demo check and a short reflection.
   Record activity/version, source revision, actual help used, and learner/facilitator time through the existing selected-evidence process.
   Keep a learner's own case distinguishable from an agent suggestion.
3. **Check immediate application.** Ask the learner to explain the first changed case before returning to the agent or worked reasoning.
   Look for the relevant condition, predicted behavior and justification, including uncertainty; a correct choice alone is insufficient.
4. **Return before rereading.** Keep the diary note closed while recalling the explanation, then try the second changed case without the agent or transcript.
   Record the actual delay and any intervening practice or help the learner chooses to report.
   Compare recall, application and support needed; a saved attempt does not itself prove that no help was used.

The two changed cases serve different checks; their difficulty and intervening practice can affect the result.
This voluntary pilot finds problems with support and evaluation, without estimating a causal learning effect or comparing self-selected modes as if they were randomized.
Retain skipped follow-ups and uncertainty in the report, and offer ordinary help after each independent attempt.

In a group, save individual explanations before revealing inquiry; compare predictions, retain consequential disagreement and rotate the existing operator/challenger/validator roles.
Try the optional inquiry outline and a summary assembled from deliberately selected contributions.
Include a member who is absent for the check and one who needs more help; do not infer their agreement or understanding from a shared decision.
Ask each consenting learner to explain the related case individually, using their chosen takeaway or interview instead of copying a common group reflection.
Ask whether explaining, challenging and validating helped, whether a different private conclusion was easy to keep, and whether the prompts or summary preparation increased workload.
Select useful material for an existing diary/portfolio entry instead of producing a separate trial report.

### Return visit for a learner who chose benchmarking

Use these prompts during the 5–10 minute return visit after a learner has tried [Chapter 3’s “Which requests counted?” exercise](../book/01_establish/03_benchmarking.md#simulated-benchmark-lab).
Show one prompt at a time.
Let the learner give a verdict and a reason for each before opening their notes or discussing either answer.

**First prompt**

> Each run received 20 requests.
> The goal was a response in under 120 ms.
> In run A, 18 requests finished in 40 ms and two finished in 240 ms.
> In run B, 18 finished in 40 ms and two timed out at 300 ms.
>
> An assistant writes, “A higher share of requests met the 120 ms deadline in run B.”
> Would you publish that sentence?
> Which observation supports your verdict?

**Second prompt**

> Keep run A and the deadline the same.
> In run B, the two requests that previously timed out also finish in 40 ms.
>
> An assistant writes, “A higher share of requests met the 120 ms deadline in run B.”
> Would you publish that sentence?
> Which observation supports your verdict?

**Facilitator debrief.** In the first case, both runs met the deadline for 18 of 20 requests, so the claim of a higher share is false.
In the second, run B met the deadline for 20 of 20 against run A’s 18 of 20, so the same sentence is accurate for these runs.
Run B’s completed-response p95 is 40 ms in both versions.
Ask which two outcomes account for the difference.
Listen for whether the learner includes the timeouts among the 20 offered requests when judging the first case.

## Try Obsidian as the diary editor

The [student guide](course-diary.md) now recommends the [numbered Markdown starter](diary-pilot/00-Start%20here.md).
Use a fresh vault and synthetic writing for the rehearsal.
Compare a newcomer with a student who already keeps notes.
Record where each needed help and how long they spent setting up before reasoning about the course.

### First visit and return

1. Begin on a chapter and find **Diary**.
   Download the starter, unzip it, open its folder as a vault and follow the first lecture link with community plugins disabled.
   Ask the learner what they would measure before accepting the cache claim.
   Can they find where to write?
2. Select a passage in the book, copy the highlight and paste it below the prediction.
   Ask the learner to close the reading and reopen the same section from the note.
   If they expect the passage to stay marked on the website, try the optional Web Clipper Highlighter and ask which behavior they want. [Web Clipper Highlighter](https://obsidian.md/help/web-clipper/highlight)
3. On the return visit, present the [benchmarking prompts](#return-visit-for-a-learner-who-chose-benchmarking) before the learner rereads their answer.
   Can they then find their earlier explanation, add a dated revision and name the condition that changed their judgment?
4. In Lecture 5, ask learners to revisit an expectation from Establish and compare it with an audit or demonstration.
   Does the prompt elicit a concrete observation?
   Can they preserve their earlier wording while revising their conclusion?

### Test the optional commands

Enable the bundled **Course diary** plugin in the disposable desktop vault.
Try **Open lecture diary** after writing under a lecture.
Try **Add book highlight** twice for the same lecture and passage.
Check where it lands, what the source link opens and whether the second attempt adds unwanted text.

Select a question beside an unrelated private remark and choose **Discuss with the course TA**.
Review the draft, open the reading beside the diary and paste the question in the book's assistant.
Does the learner know which words will reach the configured provider when they send?
Can they return to the same note and keep their own conclusion distinct from the reply?
Try Chrome on the companion's computer if its connection is unavailable inside the desktop Web viewer. [TA setup and browser support](learning-companion-setup.md#browser-connection-support)

Select one passage from Lecture 6 for **Prepare portfolio excerpt** and leave the adjacent passage behind.
Check the Challenge draft contains the selection and identifies it as the third lecture of that phase.
Ask the learner to find its destination in **My portfolio** and explain when staff can see the material.
Use a synthetic course for any upload.
Observe repeated copying, unfamiliar commands and information lost on transfer.
Compare the time and clarity with ordinary copy and paste. [Portfolio walkthrough](course-diary.md#prepare-material-for-your-portfolio)

### Existing Notebook users

With two synthetic entries in a disposable companion, use the [recovery route](course-diary.md#bring-over-an-existing-notebook).
Revise one entry in the fixture before connecting.
Download the JSON backup and the Markdown file.
Find both entries and their source links in Obsidian.
Check that the revised entry shows its current text and that its earlier text is present in the JSON history.

## Evidence to collect deliberately

### Finding and using the tools

Observe whether a learner can find the diary and teaching assistant, choose a useful point to connect the assistant and return to a note after discussion.
Ask them to discuss a selected passage or chosen note, identify what will reach the provider, then write and save their own takeaway.
Include writing with community plugins disabled, returning to a conversation from another chapter and declining an unwanted demo change.
Record missed entry points, confusing labels, context mistakes, setup failures and unnecessary reconstruction work.
Successful clicks establish usability for that participant, not understanding of the subject.

### Task-specific assistance

Ask whether help addressed the learner's actual difficulty, whether its amount was useful, and whether they could take the next step with less help.
Distinguish a prerequisite, misconception, unclear instructions and demo-operation problem; record uncertain or incorrect diagnoses rather than assuming a confident reply is useful.
Include a learner who requests a direct explanation and one who records being stuck without a developed initial note.
Students can request more help again; fading is responsive to their work rather than a fixed sequence.

For provider development, `LEARNING_CODEX_LIVE=1 node scripts/evaluate-learning-support.ts` runs eight synthetic scenarios through the dedicated profile: novice, misconception, progress, unclear question, direct explanation, unavailable demo/uncertain production evidence, a quoted prior assistant error and group disagreement with an absent member.
The current synthetic review uses cache cases (activity version 2); the dated October 7 observations below used the earlier queue cases.
The incorrect prior claim is deliberately supplied synthetic context, not a fabricated account of an actual learner's conversation.
It saves actual replies, tool requests, review criteria and policy/provider/companion/material versions under `.local/learning-evaluation/`, without student records, automatic quality scores or live browser execution.
Source revision and an authored-resource hash distinguish dirty development samples; the exact model is reported as unknown when using the provider default.
Review source accuracy, requested help, useful next steps, preservation of agency, respectful challenge, response to correction and honest evidence limits before reporting a provider check as successful.
Use the separate opt-in browser test for actual observations, approved changes and resumed replies; authored HTML alone does not establish execution.
On 2026-10-07, eight actual Codex CLI 0.154.0 replies under policy version 1 met those representative review criteria.
They distinguished buffering from processing capacity, corrected the quoted assistant error, acknowledged absent measurements and preserved group disagreement.
The default model was not identified, no live browser tool was used in these samples, and no learner participated; these observations establish neither reliable tutoring nor a learning gain.

Local-model evaluation uses `LEARNING_LOCAL_LIVE=1 LEARNING_LOCAL_MODEL=google/gemma-4-12b-qat node scripts/evaluate-learning-support.ts` after loading that model in LM Studio.
`LEARNING_LOCAL_URL` and `LEARNING_LOCAL_CONTEXT` optionally specify the loopback compatibility URL and configured context.
It uses the direct discussion-only adapter, records the returned model/notices and retains synthetic wire snapshots under `.local/learning-evaluation/`.
No Codex sign-in or personal notebook is used.

On 2026-10-07, the loaded Gemma Q4_0/12B model completed all eight scenarios with reasoning disabled and context 8,192; the runner version was unknown.
Human review found useful novice explanations, respectful challenges, a next-step question and preservation of disagreement/absent-member agency without invented browser execution.
It also found omitted source URLs, no proposed check in the misconception reply, confusion between the temporal observation window and system boundary in the direct explanation, and an overgeneralized claim that doubling a buffer increases work in progress.
The production-stability reply identified measurement uncertainty but did not directly propose checking backlog growth against arrival/completion rates.
These are recorded model limitations, not a passed instructional-quality evaluation or evidence of learner outcomes.
The ignored actual reply report is `.local/learning-evaluation/task-support-2026-10-07T13-39-38.165Z.json`.
Native tools on the exposed Gemma configuration remain unverified; synthetic API/browser tests establish the software's observation and approval contracts separately.

### Recognizable manner and trust

Ask whether the assistant was patient, curious, precise and constructive in the selected exchange, and whether that made asking for help easier or the explanation clearer.
Check whether respectful disagreement was useful and uncertainty/correction were understandable.
Ask whom learners believe the assistant represents and who assesses the course; it should be recognizable as automated support.
Record excess trust, unsupported praise, distracting tone and pressure to continue chatting alongside helpful responses.
Keep perceived rapport and enjoyment separate from accuracy and independent learning.
Changing tone and teaching strategy together cannot isolate a personality effect; comparisons intended to do so must hold material, task and instructional support consistent.

### Learner-selected evidence

Ask permission for selected examples and brief feedback; participation does not give staff access to private notebooks or full conversations.
Use a participant's chosen excerpts or an interview, with personal identifiers omitted from the development report.
Do not enable routine transcript collection or evaluate success by message, note, thread or character counts.

| Outcome              | Useful evidence                                                                                                                                                | Follow-up                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Independent learning | Initial and revised explanations, evidence supporting a revision or unchanged view, and independent explanation/application in a meaningful changed situation. | Return after a feasible delay and ask for recall before rereading; retain uncertainty and unsupported assistant claims.  |
| Course progress      | Whether the tools helped learners enter difficult material, reuse selected work in an existing submission and pass ordinary checkpoints.                       | Follow Establish, Challenge and Compare; report drop-off, continuing support needs and difficulty as well as completion. |
| Workload             | Learner-estimated setup, investigation, reflection and submission-preparation effort, plus observed friction.                                                  | Compare with the published time budget, note reconstruction work, excessive prompting and added effort.                  |

Record the date, book/activity revision, companion release/source revision, provider/version, recorded teaching policy ID/version, chosen help mode, individual/group setting and which excerpts the learner chose to share.
Record unknown versions honestly; never assign the current policy to an older reply.
Use **Connect** and **About this reply** for available metadata without collecting complete histories.
Ask which diary prompt helped the learner connect a claim to evidence in their own work.
Ask whether they skipped or resumed the changed case, whether its assumptions/self-check were useful, and whether linked notes reduced diary/portfolio preparation effort.
Include failed checks and short free writing in the chosen evidence; a polished reflection is not a substitute for explaining a new case.
There is no hard reflection minimum in this release.

### Human facilitation effort

In the same voluntary trial, record instructor preparation and facilitation time, which difficulty required human intervention, and what the learner could later explain or repair independently.
Distinguish setup help, correction of assistant errors, and guidance on the subject so an assisted completion does not hide the work needed to support it.
[Russinovich and Hanselman's mentoring proposal](https://dl.acm.org/doi/10.1145/3779312) motivates making that human contribution explicit; its staffing ratios and duration are design estimates rather than validated course parameters.
Use the learner-selected evidence above and report facilitation effort alongside learner workload and independent performance.

## Report and revise

Separate technical success, usability observations, instructional behavior, manner/trust feedback, independent learning evidence, workload and actual course progress.
A small trial can identify problems and suggest changes; it cannot prove that the workspace caused a completion improvement.
Preserve disagreements and negative results.
Revise prompts, examples and setup guidance using the trial evidence.
Prioritize authored examples and misconception support from recurring difficulties, retaining source assumptions and meaningful self-check criteria.
Choose feasible delayed recall within existing work; do not add a parallel assessment obligation or engagement quota.
Assessment changes require the existing student-facing contract and requirement-edition workflow.

Continue the evaluation through an actual course run.
The implementation is complete as a software capability; learner outcome evidence remains to be collected.
