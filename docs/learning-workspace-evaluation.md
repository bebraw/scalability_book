# Evaluate the learning workspace

The first release supports the whole published book.
Its technical checks establish working tools and privacy boundaries; they do not establish a learning gain or increased course completion.
Use a voluntary small trial with both an individual learner and a project group to find usability and teaching problems.
Claims that the tools cause better learning or completion require an appropriate comparison and study beyond that trial.
The trial adds no assessment criterion, required report or activity quota.

## A short first investigation

Let each learner choose a question they actually need to understand.
For an example, use the [queue balance lab](https://scalableweb.dev/demos/#demo-queue-balance-lab): predict the queue implied by arrival rate and mean time, inspect the result, then question whether the averages cover a common stable interval.
Include a changed situation, such as a growing queue or a tail percentile replacing the mean.
The guide now offers a queue-recovery case (300 waiting events, 80/s arrivals, 100/s capacity, then 120/s arrivals), canonical changed-situation exercises and a reading/project application elsewhere in the book.
Record the activity ID/version and source revision from the learner's chosen entry, and distinguish their own case from a reviewed agent suggestion.
Ask learners to explain the change independently before returning to the agent or worked reasoning.
Ask them to return after a delay of their choosing and use Notes → Revisit, recalling before opening the earlier explanation.
Compare what they can justify now, continuing uncertainty, and where they ask for support again; a saved independent attempt does not prove that no help was used.

Try capture without a model first, then one chosen agent help mode, an actual demo check and a short reflection.
In a group, save individual explanations before revealing inquiry; compare predictions, retain consequential disagreement and rotate the existing operator/challenger/validator roles.
Try the optional inquiry outline and a summary assembled from deliberately selected contributions.
Include a member who is absent for the check and one who needs more help; do not infer their agreement or understanding from a shared decision.
Ask each consenting learner to explain the related case individually, using their chosen takeaway or interview instead of copying a common group reflection.
Ask whether explaining, challenging and validating helped, whether a different private conclusion was easy to keep, and whether the prompts or summary preparation increased workload.
Select useful material for an existing diary/portfolio entry instead of producing a separate trial report.

## Evidence to collect deliberately

### Finding and using the tools

Observe whether a learner can find Notebook and Teaching assistant, distinguish their purposes, connect once and continue chapter work without losing a draft.
Ask them to discuss a selected passage or chosen note, identify what will reach the provider, then write and save their own takeaway.
Include notebook-only use, returning to a conversation from another chapter and declining an unwanted demo change.
Record missed entry points, confusing labels, context mistakes, setup failures and unnecessary reconstruction work.
Successful clicks establish usability for that participant, not understanding of the subject.

### Task-specific assistance

Ask whether help addressed the learner's actual difficulty, whether its amount was useful, and whether they could take the next step with less help.
Distinguish a prerequisite, misconception, unclear instructions and demo-operation problem; record uncertain or incorrect diagnoses rather than assuming a confident reply is useful.
Include a learner who requests a direct explanation and one who records being stuck without a developed initial note.
Students can request more help again; fading is responsive to their work rather than a fixed sequence.

For provider development, `LEARNING_CODEX_LIVE=1 node scripts/evaluate-learning-support.ts` runs eight synthetic scenarios through the dedicated profile: novice, misconception, progress, unclear question, direct explanation, unavailable demo/uncertain production evidence, a quoted prior assistant error and group disagreement with an absent member.
The incorrect prior claim is deliberately supplied synthetic context, not a fabricated account of an actual learner's conversation.
It saves actual replies, tool requests, review criteria and policy/provider/companion/material versions under `.local/learning-evaluation/`, without student records, automatic quality scores or live browser execution.
Source revision and an authored-resource hash distinguish dirty development samples; the exact model is reported as unknown when using the provider default.
Review source accuracy, requested help, useful next steps, preservation of agency, respectful challenge, response to correction and honest evidence limits before reporting a provider check as successful.
Use the separate opt-in browser test for actual observations, approved changes and resumed replies; authored HTML alone does not establish execution.
On 2026-10-07, eight actual Codex CLI 0.154.0 replies under policy version 1 met those representative review criteria.
They distinguished buffering from processing capacity, corrected the quoted assistant error, acknowledged absent measurements and preserved group disagreement.
The default model was not identified, no live browser tool was used in these samples, and no learner participated; these observations establish neither reliable tutoring nor a learning gain.

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
Ask whether the reflection examples made expectations clearer and whether the 400-character suggestion encouraged useful material or unnecessary writing.
Ask whether they skipped or resumed the changed case, whether its assumptions/self-check were useful, and whether linked notes reduced diary/portfolio preparation effort.
Include failed checks and short free writing in the chosen evidence; a polished reflection is not a substitute for explaining a new case.
There is no hard reflection minimum in this release.

## Report and revise

Separate technical success, usability observations, instructional behavior, manner/trust feedback, independent learning evidence, workload and actual course progress.
A small trial can identify problems and suggest changes; it cannot prove that the workspace caused a completion improvement.
Preserve disagreements and negative results.
Calibrate prompts, examples, the optional length cue and setup friction from the evidence before adding obligations.
Prioritize authored examples and misconception support from recurring difficulties, retaining source assumptions and meaningful self-check criteria.
Choose feasible delayed recall within existing work; do not add a parallel assessment obligation or engagement quota.
Assessment changes require the existing student-facing contract and requirement-edition workflow.

Continue the evaluation through an actual course run.
The implementation is complete as a software capability; learner outcome evidence remains to be collected.
