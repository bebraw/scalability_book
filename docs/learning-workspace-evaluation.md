# Evaluate the learning workspace

The first release supports the whole published book.
Its technical checks establish working tools and privacy boundaries; they do not establish a learning gain or increased course completion.
Use a voluntary small trial with both an individual learner and a project group before making those claims.
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
Select useful material for an existing diary/portfolio entry instead of producing a separate trial report.

## Evidence to collect deliberately

### Task-specific assistance

Ask whether help addressed the learner's actual difficulty, whether its amount was useful, and whether they could take the next step with less help.
Distinguish a prerequisite, misconception, unclear instructions and demo-operation problem; record uncertain or incorrect diagnoses rather than assuming a confident reply is useful.
Include a learner who requests a direct explanation and one who records being stuck without a developed initial note.
Students can request more help again; fading is responsive to their work rather than a fixed sequence.

For provider development, `LEARNING_CODEX_LIVE=1 node scripts/evaluate-learning-support.ts` runs five synthetic novice, misconception, progress, unclear-task and direct-explanation scenarios through the dedicated profile.
It saves actual replies and review criteria under `.local/learning-evaluation/`, without student records, automatic quality scores or live browser execution.
Review source accuracy, the requested help mode, appropriate next-step responsibility and honest evidence limits before reporting a provider check as successful.
On 2026-10-07 the five Codex CLI 0.154.0 replies met those representative criteria; this does not establish reliable tutoring across learners or a learning gain.

### Learner-selected evidence

Ask permission for selected examples and brief feedback; participation does not give staff access to private notebooks or full conversations.
Use a participant's chosen excerpts or an interview, with personal identifiers omitted from the development report.
Do not enable routine transcript collection or evaluate success by message, note, thread or character counts.

| Outcome                                                                       | Useful evidence                                                                                                                                               | Follow-up                                                                                                              |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Learning                                                                      | Initial and revised explanations, the observation supporting a revision or unchanged view, and an independent explanation/application in a changed situation. | Return after a delay; ask for recall before rereading.                                                                 |
| Record remaining uncertainty and where the agent supplied unsupported claims. |
| Course progress                                                               | Whether the workspace helped the learner enter difficult material, prepare an existing submission and pass ordinary course checkpoints.                       | Follow actual progress through Establish, Challenge and Compare; report drop-off and difficulty as well as completion. |
| Workload                                                                      | Learner-estimated setup, investigation, reflection and submission-preparation effort, plus observed points of friction.                                       | Compare with the published course time budget and whether reusing notes reduced reconstruction work.                   |

Record the date, book revision, companion/Codex version, chosen activity/help mode, individual/group setting and which excerpts the learner chose to share.
Ask whether the reflection examples made expectations clearer and whether the 400-character suggestion encouraged useful material or unnecessary writing.
Ask whether they skipped or resumed the changed case, whether its assumptions/self-check were useful, and whether linked notes reduced diary/portfolio preparation effort.
Include failed checks and short free writing in the chosen evidence; a polished reflection is not a substitute for explaining a new case.
There is no hard reflection minimum in this release.

## Report and revise

Separate technical success, usability observations, independent learning evidence and actual course progress.
A small trial can identify problems and suggest changes; it cannot prove that the workspace caused a completion improvement.
Preserve disagreements and negative results.
Calibrate prompts, examples, the optional length cue and setup friction from the evidence before adding obligations.
Assessment changes require the existing student-facing contract and requirement-edition workflow.

Continue the evaluation through an actual course run.
The implementation is complete as a software capability; learner outcome evidence remains to be collected.
