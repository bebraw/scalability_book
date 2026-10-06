import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.ts";

const COURSE_EMAIL_FROM = "course-test@scalableweb.dev";

test("the Worker forwards only the configured course inbox to the current environment destination without consuming the message", async () => {
  const forwarded: string[] = [],
    rejected: string[] = [];
  let complete = false;
  let finish!: () => void;
  const held = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const message = {
    to: "course-test@scalableweb.dev",
    get raw(): never {
      throw new Error("Do not consume or copy incoming mail.");
    },
    get headers(): never {
      throw new Error("Do not read private message metadata.");
    },
    setReject(reason: string) {
      rejected.push(reason);
    },
    async forward(destination: string) {
      forwarded.push(destination);
      await held;
      return { messageId: "synthetic" };
    },
  };
  const ASSETS = {
    async fetch(): Promise<Response> {
      throw new Error("Email routing does not use the website API.");
    },
  };
  const pending = worker
    .email(message, {
      ASSETS,
      COURSE_EMAIL_FROM,
      COURSE_EMAIL_FORWARD_TO: " teacher@example.invalid ",
    })
    .then(() => {
      complete = true;
    });
  await Promise.resolve();
  assert.equal(complete, false);
  finish();
  await pending;
  await worker.email(message, {
    ASSETS,
    COURSE_EMAIL_FROM,
    COURSE_EMAIL_FORWARD_TO: "other@example.invalid",
  });
  assert.deepEqual(forwarded, [
    "teacher@example.invalid",
    "other@example.invalid",
  ]);
  assert.deepEqual(rejected, []);
});

test("unknown recipients and absent, malformed or looping destinations fail closed without forwarding", async () => {
  const forwarded: string[] = [],
    rejected: string[] = [];
  const message = {
    to: "course-test@scalableweb.dev",
    setReject(reason: string) {
      rejected.push(reason);
    },
    async forward(destination: string) {
      forwarded.push(destination);
      return { messageId: "synthetic" };
    },
  };
  const ASSETS = {
    async fetch() {
      return new Response();
    },
  };
  await worker.email(message, { ASSETS, COURSE_EMAIL_FROM });
  for (const destination of [
    "",
    "missing-address",
    "teacher@example.invalid\r\nBcc:other@example.invalid",
    "course-test@scalableweb.dev",
    "COURSE-TEST@SCALABLEWEB.DEV",
  ])
    await worker.email(message, {
      ASSETS,
      COURSE_EMAIL_FROM,
      COURSE_EMAIL_FORWARD_TO: destination,
    });
  await worker.email(
    { ...message, to: "other@scalableweb.dev" },
    {
      ASSETS,
      COURSE_EMAIL_FROM,
      COURSE_EMAIL_FORWARD_TO: "teacher@example.invalid",
    },
  );
  assert.deepEqual(forwarded, []);
  assert.equal(rejected.length, 7);
  assert.ok(rejected.every((reason) => !reason.includes("@")));
});

test("provider failures cannot expose the private destination or message metadata in the Worker error", async () => {
  const message = {
    to: "course-test@scalableweb.dev",
    setReject() {
      assert.fail("Provider failure is not a configured rejection.");
    },
    async forward(destination: string): Promise<{ messageId: string }> {
      throw new Error(
        `PRIVATE provider response: ${destination}; PRIVATE subject`,
      );
    },
  };
  await assert.rejects(
    worker.email(message, {
      COURSE_EMAIL_FROM,
      ASSETS: {
        async fetch() {
          return new Response();
        },
      },
      COURSE_EMAIL_FORWARD_TO: "teacher@example.invalid",
    }),
    (error: Error) => {
      assert.equal(error.message, "Course inbox forwarding failed.");
      assert.equal(error.stack?.includes("PRIVATE"), false);
      assert.equal(error.stack?.includes("teacher@example.invalid"), false);
      assert.equal(error.cause, undefined);
      return true;
    },
  );
});

test("a missing or malformed course inbox cannot forward any recipient", async () => {
  const rejected: string[] = [];
  const message = {
    to: "course-test@scalableweb.dev",
    setReject(reason: string) {
      rejected.push(reason);
    },
    async forward(): Promise<{ messageId: string }> {
      assert.fail("Unconfigured inbox must not forward.");
    },
  };
  for (const inbox of [undefined, "", "invalid", "teacher@example.invalid"])
    await worker.email(message, {
      ASSETS: { fetch: async () => new Response() },
      COURSE_EMAIL_FROM: inbox,
      COURSE_EMAIL_FORWARD_TO: "teacher@example.invalid",
    });
  assert.equal(rejected.length, 4);
  assert.ok(rejected.every((reason) => !reason.includes("@")));
});
