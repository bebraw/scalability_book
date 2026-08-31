import assert from "node:assert/strict";
import test from "node:test";
import { parseGitFileDates } from "../scripts/lib/git-history.ts";

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
