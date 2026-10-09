import test from "node:test";
import assert from "node:assert/strict";
import {
  siteAccount,
  courseSignInDestination,
} from "../shared/site-account.ts";
import { exerciseDiscussion } from "../shared/exercise-discussion.ts";
import { exercises } from "../shared/exercises.ts";

const defaults = {
  github: null,
  course: null,
  githubAvailable: true,
  courseAvailable: true,
  emailAvailable: true,
};
test("email answer ownership is scoped to the verified enrollment and independent of names", () => {
  const email = {
    id: "student:stable",
    login: "Student",
    provider: "email" as const,
    courseId: "run-a",
  };
  const account = siteAccount({ ...defaults, course: email });
  assert.equal(account.answers?.userId, "course:run-a:student:stable");
  assert.equal(
    siteAccount({ ...defaults, course: { ...email, login: "Corrected name" } })
      .answers?.userId,
    account.answers?.userId,
  );
  assert.notEqual(
    siteAccount({ ...defaults, course: { ...email, courseId: "run-b" } })
      .answers?.userId,
    account.answers?.userId,
  );
  assert.equal(
    siteAccount({ ...defaults, course: { id: email.id, login: email.login } })
      .answers,
    null,
  );
  assert.equal(siteAccount(defaults).answers, null);
});
test("existing GitHub and local answers keep their owners when an email session is also active", () => {
  const input = {
    ...defaults,
    github: { id: 12, login: "reader" },
    course: {
      id: "github:12",
      login: "Student",
      provider: "email" as const,
      courseId: "run-a",
    },
  };
  assert.equal(siteAccount(input).answers?.userId, "github:12");
  assert.equal(
    siteAccount({ ...input, github: { id: 12, login: "renamed" } }).answers
      ?.userId,
    "github:12",
  );
  assert.equal(
    siteAccount({
      ...input,
      github: { id: 1, login: "local-editor" },
      local: true,
    }).answers?.userId,
    "local-editor",
  );
  assert.equal(
    siteAccount({ ...defaults, github: { id: Number.NaN, login: "forged" } })
      .answers,
    null,
  );
});
test("course sign-in preserves passage and activity while rejecting external return destinations", () => {
  const target =
    "/chapters/benchmarking/?inquiry=1&inquiryActivity=prediction#boundary";
  const url = new URL(
    courseSignInDestination("run-a", target),
    "https://book.test",
  );
  assert.equal(url.searchParams.get("returnTo"), target);
  assert.equal(url.searchParams.get("course"), "run-a");
  for (const invalid of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/\r\nLocation: evil",
  ])
    assert.equal(
      new URL(
        courseSignInDestination("run-a", invalid),
        "https://book.test",
      ).searchParams.get("returnTo"),
      "/",
    );
});
test("exercise discussion includes the selected attempt and checker evidence without the worked answer", () => {
  const text = exerciseDiscussion("measurement-boundary", {
    expected: "25",
    conclusion: "database",
  });
  assert.match(text, /version 2/);
  assert.match(text, /25/);
  assert.match(text, /Automatic checker feedback/);
  assert.match(text, /Not quite/);
  assert.equal(
    text.includes(exercises["measurement-boundary"]!.discussion),
    false,
  );
});
