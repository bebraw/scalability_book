# Book data backups

Run the snapshot on the owner's machine from a full repository checkout with Node 24 or later, Git, tar, and the book's existing authenticated Wrangler login.
Use local encrypted storage.

```sh
npm run backup:book
```

On macOS, snapshots live in `~/Library/Application Support/scalableweb-book/backups/`.
On other Unix systems, they live in `~/.local/state/scalableweb-book/backups/`.
The directory is owner-only, outside Git, and outside the generated site.
Each run publishes a new timestamped directory after the files pass verification.
The manifest includes the active Worker version, storage IDs, D1 recovery bookmark, secret names, aggregate record counts, and SHA-256 checksums.

| Data                              | Snapshot contents                                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Reader feedback                   | Original `comments:` values and `feedback-resolution:` metadata in a Wrangler bulk import file                       |
| Chapter exercise answers          | SQL snapshot from one read of `LEARNING_DB`, with a separate Cloudflare Time Travel recovery bookmark                |
| Book source and private reference | Full Git bundles, plus retained private course preparation evidence, audit packages, probes, and reference databases |
| Local course and learning data    | SQLite backups and available attachment archives from the default development and simulation directories             |
| Owner's companion                 | SQLite backups, settings, and available Codex session files from the two default macOS/repository locations          |

List or document additional companion directories before relying on the snapshot for them.
Cloudflare and local data are captured across the time window in the manifest.
For a coordinated local recovery point, stop writers to the course attachments or companion profile before running the snapshot.
SQLite copies use the database backup API.
The production command checks the active Worker bindings and stops if a new supported storage binding appears.
Before enabling production course submissions, extend the backup to preserve [the course D1 and R2 stores together](course-system.md#production-configuration).

## Verify and restore

Verify after copying a snapshot, and before a restore:

```sh
npm run backup:book -- --verify "/absolute/path/to/snapshot"
```

Verification matches the checksums, restores the exercise SQL into a fresh in-memory SQLite database, checks the archived SQLite files, opens both Git bundles as new repositories, and reads the compressed archives.
It validates feedback records, preserves their resolution metadata, and reports resolutions without a source comment for review.

Restore into separate private targets first.

- Clone a Git bundle into a new directory, then inspect its branches and revision before switching a working checkout.
- Import `production-learning.sql` into an empty recovery D1 database.
  For a recent incident, check the [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) bookmark and restore instructions.
- Import `production-feedback.kv.json` with `wrangler kv bulk put` into a new private namespace.
  Connect an isolated Worker to verify that it reads comment bodies, replies, and resolutions.
- Restore local SQLite files and matching attachment archives together.
  Stop the relevant server before replacing an active data directory. [Companion recovery](learning-companion-setup.md#keep-your-work-portable)

Change production bindings or replace live records only after checking the restored data.
Recreate Worker secret values from the owner's approved credential store or reissue them through Cloudflare and GitHub.
The snapshot records the secret names.
See the [feedback setup](feedback-setup.md) and [course mail setup](course-system.md#course-mail-setup) for their configuration, including reissuing the feedback MCP credential.

## Retention and off-device copy

The off-device destination is the private EU R2 bucket `scalability-book-backups`.
Public development URLs and custom domains are disabled.
Like the [Thesis Journey Tracker backup](https://github.com/bebraw/thesis-journey-tracker/blob/main/docs/backups.md), each verified snapshot has a dated prefix and a manifest written after its artifacts, with a 90-day R2 lifecycle rule on `automated-backups/`.
Individual object keys use `automated-backups/{full|hosted}/<snapshot>/<file>`.
Only prefixes with a valid manifest represent complete snapshots.

To copy an existing verified snapshot to the designated bucket:

```sh
npm run backup:book -- --publish "/absolute/path/to/snapshot"
```

The copy downloads every object and verifies its checksum before publishing the manifest.
A second manifest download verifies the exact recovery index.
The hidden `.last-r2-hosted.json` and `.last-r2-full.json` files in the local backup root record the last successful copies.
Recover from R2 by downloading a completed prefix's manifest and each artifact it lists, preserving the basenames, then running the local verification command.
Use `--jurisdiction eu` for Wrangler R2 commands.

The macOS LaunchAgent `dev.scalableweb.book-backup` runs `npm run backup:book -- --scheduled` at 04:30 local time and checks for a missed interval when loaded.
It takes a hosted snapshot each day and a full snapshot approximately every seven days.
A full run also covers that day's hosted data.
The job uses the owner's existing Wrangler login and runs while the Mac is logged in.
Run `npm run backup:book -- --hosted` to take and publish a fresh production-only snapshot on demand.
The files `backup.stdout.log` and `backup.stderr.log` in the local backup root show its last activity and errors.
Check the receipts after the Mac has been offline or after Wrangler reauthentication.
Local snapshots remain available for review even when R2 expires a copy.

D1 Time Travel provides a recent recovery window in Cloudflare.
The local snapshot provides a separate recovery copy if Cloudflare account access is lost.
