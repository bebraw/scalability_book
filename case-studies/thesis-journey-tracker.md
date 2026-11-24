# Thesis Journey Tracker – Keeping a supervision dashboard small

After a supervision meeting I want to record what we agreed and see what to pick up next time.
That was a small enough workflow to put into use while I was still learning what the dashboard needed.
I began developing [Thesis Journey Tracker](https://github.com/bebraw/thesis-journey-tracker) with coding agents in March 2026. By July I was using it in production with a team of two.

## Case at a glance

The [30 July 2026 source snapshot](https://github.com/bebraw/thesis-journey-tracker/tree/f10a26716cb4e005d37e8885df8fb808806566ba) records the first four months summarized in :ref[table:thesis-journey-tracker-snapshot]{text="the table below"}.
The [6 November main-branch snapshot](https://github.com/bebraw/thesis-journey-tracker/tree/3255e95a0c18095cd67f1850f5db631dd4ad0806) shows how the release policy and meeting workflow subsequently changed.

| Evidence                      | Observation                                     |
| ----------------------------- | ----------------------------------------------- |
| Development interval reviewed | 22 March–30 July 2026                           |
| Runtime                       | Cloudflare Workers and D1                       |
| Rendering model               | Server-rendered HTML with limited client script |
| Production status at review   | Deployed and working in the author's use        |

::caption[Operating context at the reviewed Thesis Journey Tracker snapshot.]
::label[table:thesis-journey-tracker-snapshot]

## The first pass was deliberately narrow

The repository began with a README.
The next commit, [“First pass by codex-5.3”](https://github.com/bebraw/thesis-journey-tracker/commit/246884b5e84f99f09c63800b76d1ca6942548b29), added a Worker, a database migration, and the package and deployment configuration.
That same day, the project moved to TypeScript, extracted database and view code, and added browser tests.
Three days later it [hardened import for production rollout](https://github.com/bebraw/thesis-journey-tracker/commit/f69e019a36ce5cdc832bba02925ba9b1de548358).

An adviser needed to find a thesis, see its phase, and pick up where the last conversation ended.
Course registration and grading belonged elsewhere.
One Cloudflare Worker served the HTML, D1 held the advising records, and small browser scripts handled interactions.
To change the way a meeting appeared on screen, a contributor could follow the request from the Worker entry point to the feature's route, store, and view. [July README](https://github.com/bebraw/thesis-journey-tracker/blob/f10a26716cb4e005d37e8885df8fb808806566ba/README.md) · [July project structure](https://github.com/bebraw/thesis-journey-tracker/blob/f10a26716cb4e005d37e8885df8fb808806566ba/docs/project-structure.md)

## What happens after a supervision meeting?

The [October usability review](https://github.com/bebraw/thesis-journey-tracker/blob/3255e95a0c18095cd67f1850f5db631dd4ad0806/docs/ux-review.md) identified the regular user's priority as opening a student and recording meeting notes.
By November, saving a note could advance an internal recurring schedule at the agreed local time, including across a clock change.
The project had removed its Google Calendar and iCal integration.
An adviser could still answer “When do we meet again?” while the tracker had fewer credentials and external services to maintain. [Change removing the integration](https://github.com/bebraw/thesis-journey-tracker/commit/3cd58de1a8b59c1af11e290c930846a929ce94a2) · [November workflow](https://github.com/bebraw/thesis-journey-tracker/blob/3255e95a0c18095cd67f1850f5db631dd4ad0806/README.md#what-you-can-do-with-it)

## Who can put a change into production?

The [July CI workflow](https://github.com/bebraw/thesis-journey-tracker/blob/f10a26716cb4e005d37e8885df8fb808806566ba/.github/workflows/ci.yml) audited dependencies, checked generated Worker types, ran unit and D1-backed integration tests, exercised browser workflows, and enforced a Lighthouse performance threshold.
An agent could run the same workflow locally before pushing a change.

The [July deployment guide](https://github.com/bebraw/thesis-journey-tracker/blob/f10a26716cb4e005d37e8885df8fb808806566ba/docs/deployment.md) called for uploading a Worker version, waiting for CI, and explicitly promoting the version that matched the reviewed commit.
On 10 August the project restored automatic promotion for the production branch.
Under the November guide, a successful Cloudflare build from `main` deploys the version to production.
GitHub Actions runs independently and can still be checking the commit when deployment finishes. [August policy change](https://github.com/bebraw/thesis-journey-tracker/commit/0429f0ba77dbbc73af83b90ab6b9bd1e71510605) · [November deployment guide](https://github.com/bebraw/thesis-journey-tracker/blob/3255e95a0c18095cd67f1850f5db631dd4ad0806/docs/deployment.md#continuous-integration)

This changes who holds [production authority](/concepts/#authority).
In July a person could inspect the CI result before promoting a version.
Under the later policy, permission to push to `main` can put a change in front of users.
The release checks the author needs for that decision belong before the push.

## Recovery is a first-class feature

The backup job writes a JSON export to R2 when the data changes.
Consider a quiet term when nothing changes for three months.
If the job skipped every run, the 90-day retention rule could expire the last good backup.
The job refreshes an unchanged snapshot after 30 days.
An operator also checks that the lifecycle rule applies to the prefix where the files are actually written. [Backup and restore guide](https://github.com/bebraw/thesis-journey-tracker/blob/3255e95a0c18095cd67f1850f5db631dd4ad0806/docs/backups.md)

I would check [recovery](/concepts/#recovery) by restoring a synthetic dataset into an empty instance and verifying that a meeting note and its next scheduled occurrence still agree.
That would test the part of the backup I expect to rely on at my next meeting.

## What Thesis Journey Tracker teaches

In Slideotter and Kirjolab, building a feature often helped me discover what the product should become.
With the tracker I already had a decision waiting at the end of each meeting.
Recording the next date answered my question.
Taking responsibility for sending invitations and keeping calendars in sync would add another system to operate, even for a team of two.

My experience supports the design for that small team.
A [scalability](/concepts/#scalability) claim for an institution with many supervisors would need evidence about demand, access to each thesis, and the work of supporting those users.
