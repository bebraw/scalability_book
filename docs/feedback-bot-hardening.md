# Feedback bot hardening

## Who sees a contribution

Any reader with a GitHub feedback session can send a paragraph comment to the book team.
Initially, the author and feedback moderators can see it.
To share an explanation with other readers, a moderator reviews the wording and features a **Reader note** at the passage.
The public note contains the curated text and omits the original author's identity and private replies.
Moderators can hide individual comments and unfeature public notes. [Feedback workflow](feedback-setup.md#5-student-feedback-flow)

For discussion among classmates, students can share a contribution with their group or cohort through **Peer discussion** in a configured course run.
The course checks enrollment, the chosen audience and the student's initial attempt before returning peer content.
Course staff can moderate contributions and close threads.
Creating a GitHub account alone grants no class membership. [Peer inquiry contract](learning-workspace.md#peer-inquiry-contract)

## Limits in the feedback Worker

The Worker checks each non-admin comment or legacy confusion submission against two counters in the same ten-minute window.
The limit is 10 submissions per GitHub login and 30 per client IP.
An exceeded limit returns HTTP 429 with a `Retry-After` header.
The counters expire in KV. [Worker implementation](../worker/index.ts)

These limits reduce bursts in the moderation inbox.
The counters use separate KV reads and writes, so simultaneous submissions can be undercounted.
A campus network can also share a single IP across many legitimate readers.
Moderators can see the stored GitHub identity even when an author chooses anonymous display. [Feedback audiences](feedback-setup.md#5-student-feedback-flow)

## Options if abuse persists

If one account repeatedly fills the inbox, a useful next control would be a moderator action to suspend its feedback writes temporarily.
Key the suspension to the verified numeric GitHub account ID, which stays the same when the login name changes.
Record the reason, moderator and expiry privately, and let a moderator lift the suspension.
Keep its scope to reader feedback so students retain access to readings, private highlights and course work.

For a backlog, moderators could preview one account's recent submissions across chapters and select which to hide together.
Preserve the original records and moderation reasons for review, with a way to undo the batch.
Avoid attributing old records to an account solely through a matching display name, or grouping different students as one author because they share an IP.

If many accounts generate automated submissions, a challenge such as Turnstile on the submission step is another option.
Evaluate its effect on legitimate students as well as the moderator workload.
Account suspension, bulk hiding and submission challenges are proposals.
