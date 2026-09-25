import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  getGitFileDates,
  parseGitFileDates,
} from "../scripts/lib/git-history.ts";

const run = promisify(execFile);

test("parses the newest and oldest commits as update and creation dates", () => {
  assert.deepEqual(
    parseGitFileDates(`2026-08-28T15:28:46+03:00
2026-08-25T16:57:29+03:00
2026-07-27T13:43:21+03:00
`),
    {
      createdAt: "2026-07-27T13:43:21+03:00",
      updatedAt: "2026-08-28T15:28:46+03:00",
    },
  );
});

test("returns no dates when a file has no Git history", () => {
  assert.equal(parseGitFileDates(""), null);
});

test("fetches complete history before reading dates from a shallow checkout", async (t) => {
  const temp = await mkdtemp(path.join(tmpdir(), "book-git-dates-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const origin = path.join(temp, "origin");
  const checkout = path.join(temp, "checkout");
  const git = (cwd: string, args: string[], date?: string) =>
    run("git", args, {
      cwd,
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: date,
        GIT_COMMITTER_DATE: date,
      },
    });

  await git(temp, ["init", "-q", "-b", "main", origin]);
  await git(origin, ["config", "user.name", "Book Test"]);
  await git(origin, ["config", "user.email", "book-test@example.invalid"]);
  await writeFile(path.join(origin, "chapter.md"), "First chapter\n");
  await git(origin, ["add", "chapter.md"]);
  await git(
    origin,
    ["commit", "-qm", "Create chapter"],
    "2026-01-16T13:04:27+02:00",
  );
  await writeFile(path.join(origin, "other.md"), "Unrelated change\n");
  await git(origin, ["add", "other.md"]);
  await git(
    origin,
    ["commit", "-qm", "Change another file"],
    "2026-09-24T17:47:04+03:00",
  );
  await git(temp, [
    "clone",
    "-q",
    "--depth=1",
    pathToFileURL(origin).href,
    checkout,
  ]);

  assert.equal(
    (
      await git(checkout, ["rev-parse", "--is-shallow-repository"])
    ).stdout.trim(),
    "true",
  );
  assert.deepEqual(await getGitFileDates(checkout, "chapter.md"), {
    createdAt: "2026-01-16T13:04:27+02:00",
    updatedAt: "2026-01-16T13:04:27+02:00",
  });
  assert.equal(
    (
      await git(checkout, ["rev-parse", "--is-shallow-repository"])
    ).stdout.trim(),
    "false",
  );
});
