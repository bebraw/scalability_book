import { createHash } from "node:crypto";
import { recordKey, type Course, type Envelope } from "../shared/course.ts";
import { activeStudent } from "../shared/course-enrollment.ts";
import { conceptPages } from "../shared/concept-pages.ts";
import {
  inquiryAudience,
  inquiryMember,
  inquiryOwnPosts,
  inquiryQuestion,
  publicInquiryMarkdown,
  type InquiryThread,
  type InquiryPost,
  type InquiryAttempt,
  type InquiryOffer,
} from "../shared/course-inquiry.ts";
import {
  parseLearningSource,
  learningAssert,
  learningObject,
  learningText,
  learningList,
  learningId,
  LearningProblem,
  type LearningSource,
} from "../shared/learning-workspace.ts";
import { boundedJson } from "./course-http.ts";
import { Problem } from "./course-validation.ts";
import type { CourseStore } from "./course-store.ts";
import type { CourseUser } from "./courses.ts";

const headers = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
};
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function handleCourseInquiry(
  request: Request,
  context: {
    config: Envelope<Course>;
    store: CourseStore;
    user: CourseUser;
    staff: boolean;
    now: string;
  },
  item?: string,
  action?: string,
): Promise<Response> {
  const { config, store, user, staff, now } = context;
  const course = config.value;
  const courseId = course.id;
  const active = course.students.some(
    (student) => student.id === user.id && activeStudent(student),
  );
  const url = new URL(request.url);
  const reply = (body: unknown, status = 200) =>
    Response.json(body, { status, headers });
  const source = (value: unknown) => {
    const source = parseLearningSource(value);
    const sourceUrl = new URL(source.url);
    learningAssert(
      sourceUrl.origin === url.origin &&
        !sourceUrl.search &&
        (conceptPages.some((page) => page.url === sourceUrl.pathname) ||
          ["/concepts/", "/explore/", "/demos/"].includes(sourceUrl.pathname)),
      "Use a published book source on this website.",
    );
    return source;
  };
  const sourceId = (source: LearningSource, question: unknown) =>
    hash(
      `${new URL(source.url).pathname}#${source.anchor}\n${inquiryQuestion(question)}`,
    );
  const attemptKey = (id: string) =>
    recordKey(courseId, "inquiry-attempt", id, user.id);
  const attempted = async (id: string) =>
    staff || Boolean(await store.get<InquiryAttempt>(attemptKey(id)));
  async function save<T>(
    kind: string,
    subject: string,
    value: T,
    expected: unknown,
    reason: string,
  ) {
    learningAssert(
      expected === null || typeof expected === "string",
      "Supply the saved revision or null.",
    );
    learningAssert(
      JSON.stringify(value).length <= 400_000,
      "This thread is full. Start a follow-up inquiry.",
      413,
    );
    const record: Envelope<T> = {
      key: recordKey(courseId, kind, "", subject),
      courseId,
      kind,
      value,
      actor: user.id,
      updatedAt: now,
      revision: crypto.randomUUID(),
    };
    learningAssert(
      await store.save(record, expected, reason, {
        key: config.key,
        revision: config.revision,
      }),
      "This record or the course allocation changed. Reload before trying again.",
      409,
    );
    return record;
  }
  const project = async (record: Envelope<InquiryThread>) => {
    const thread = record.value;
    const member = inquiryMember(thread, course, user.id, staff);
    if (!member) {
      if (!thread.posts.some((post) => post.author === user.id)) return null;
      return {
        ...record,
        value: inquiryOwnPosts(thread, user.id),
        readOnly: true,
      };
    }
    learningAssert(
      await attempted(thread.sourceId),
      "Save your own initial thinking before viewing this peer discussion.",
      403,
    );
    return { ...record, readOnly: !active && !staff };
  };
  const post = (input: unknown): InquiryPost => {
    const value = learningObject(input);
    learningAssert(
      ["question", "observation", "check", "disagreement", "summary"].includes(
        String(value.kind),
      ),
      "Choose a contribution kind.",
    );
    const links = learningList(value.links ?? [], 10).map((value) => {
      const link = learningObject(value);
      const href = new URL(learningText(link.url, "Evidence URL", 1500, true));
      learningAssert(
        href.protocol === "https:" &&
          !href.username &&
          !href.password &&
          !["localhost", "127.0.0.1"].includes(href.hostname) &&
          !(
            href.origin === url.origin &&
            /^\/(api|course|admin)\//.test(href.pathname)
          ),
        "Use an HTTPS evidence link without private course or local-machine access.",
      );
      return {
        url: href.href,
        caption: learningText(
          link.caption ?? "Evidence",
          "Evidence caption",
          300,
          true,
        ),
      };
    });
    return {
      id: crypto.randomUUID(),
      author: user.id,
      name:
        course.students.find((student) => student.id === user.id)?.name ??
        user.login,
      kind: value.kind as InquiryPost["kind"],
      body: learningText(value.body, "Shared contribution", 6000, true),
      provenance: learningText(
        value.provenance ?? "",
        "Tool or observation provenance",
        1000,
      ),
      links,
      createdAt: now,
      editedAt: null,
      removedAt: null,
      reason: "",
    };
  };
  try {
    if (item === "membership" && !action && request.method === "GET")
      return reply({
        id: courseId,
        name: course.name,
        staff,
        active,
        user: user.id,
        groups: Object.entries(course.phases).flatMap(([phase, setup]) =>
          !setup.formation || setup.formation.publishedAt
            ? setup.groups
                .filter((group) => staff || group.members.includes(user.id))
                .map((group) => ({
                  phase,
                  id: group.id,
                  label: `${phase}: ${group.id}`,
                }))
            : [],
        ),
      });
    if (item === "attempts" && !action && request.method === "POST") {
      learningAssert(
        active || staff,
        "Active enrollment is required to start an inquiry.",
        403,
      );
      const input = await boundedJson(request);
      const captured = source(input.source);
      const id = sourceId(captured, input.question);
      const note = learningId(input.noteId),
        revision = learningId(input.noteRevision);
      const prior = await store.get<InquiryAttempt>(attemptKey(id));
      if (!prior) {
        const record: Envelope<InquiryAttempt> = {
          key: attemptKey(id),
          courseId,
          kind: "inquiry-attempt",
          value: {
            student: user.id,
            sourceId: id,
            recordedAt: now,
            localRevisionFingerprint: hash(`${note}:${revision}`),
          },
          actor: user.id,
          updatedAt: now,
          revision: crypto.randomUUID(),
        };
        learningAssert(
          await store.save(
            record,
            null,
            "Student declared saved private initial thinking",
            { key: config.key, revision: config.revision },
          ),
          "Course allocation changed. Retry after reloading.",
          409,
        );
      }
      return reply({ sourceId: id, revealed: true });
    }
    if (item === "offers") {
      if (request.method === "GET" && !action)
        return reply(
          (await store.list<InquiryOffer>(courseId, "inquiry-offer")).filter(
            (record) => staff || record.value.author === user.id,
          ),
        );
      if (request.method === "POST" && !action) {
        learningAssert(
          active || staff,
          "Active enrollment is required to offer a contribution.",
          403,
        );
        const input = await boundedJson(request);
        learningAssert(
          input.publicConsent === true,
          "Explicitly offer the reviewed text for public editorial review.",
        );
        const thread = await store.get<InquiryThread>(
          recordKey(courseId, "inquiry-thread", "", learningId(input.threadId)),
        );
        learningAssert(
          thread && inquiryMember(thread.value, course, user.id, staff),
          "Thread is unavailable.",
          404,
        );
        const contribution = thread.value.posts.find(
          (post) =>
            post.id === input.postId &&
            post.author === user.id &&
            !post.removedAt,
        );
        learningAssert(
          contribution,
          "Only your own contribution can be offered publicly.",
          403,
        );
        const id = crypto.randomUUID();
        const offer: InquiryOffer = {
          id,
          courseId,
          author: user.id,
          attribution:
            input.namedAttribution === true
              ? contribution.name
              : "Anonymous course reader",
          source: thread.value.source,
          body: learningText(input.body, "Publicly offered text", 6000, true),
          provenance: contribution.provenance,
          offeredAt: now,
          status: "offered",
          curatedText: "",
          reason: "",
          reviewedAt: null,
        };
        return reply(
          await save(
            "inquiry-offer",
            id,
            offer,
            null,
            "Student explicitly offered selected text for public editorial review",
          ),
          201,
        );
      }
      if (action && request.method === "PUT") {
        const record = await store.get<InquiryOffer>(
          recordKey(courseId, "inquiry-offer", "", learningId(action)),
        );
        learningAssert(record, "Offer not found.", 404);
        const input = await boundedJson(request);
        if (input.status === "withdrawn")
          learningAssert(
            record.value.author === user.id || staff,
            "Only the author or staff can withdraw an offer.",
            403,
          );
        else
          learningAssert(
            staff && ["reviewed", "declined"].includes(String(input.status)),
            "Course staff review required.",
            403,
          );
        learningAssert(
          record.value.status !== "withdrawn",
          "The author withdrew this offer.",
          409,
        );
        const value: InquiryOffer = {
          ...record.value,
          status: input.status as InquiryOffer["status"],
          curatedText:
            input.status === "reviewed"
              ? learningText(
                  input.curatedText,
                  "Curated public text",
                  6000,
                  true,
                )
              : "",
          reason: learningText(
            input.reason,
            "Review or withdrawal reason",
            1000,
            true,
          ),
          reviewedAt: now,
        };
        return reply(
          await save(
            "inquiry-offer",
            action,
            value,
            input.expected,
            value.reason,
          ),
        );
      }
    }
    if (!item && request.method === "GET") {
      const captured = source(
        JSON.parse(url.searchParams.get("source") ?? "null"),
      );
      const id = sourceId(
        captured,
        url.searchParams.get("question") ?? "reading",
      );
      learningAssert(
        await attempted(id),
        "Save your own initial thinking before viewing this peer discussion.",
        403,
      );
      const after = learningText(
        url.searchParams.get("after") ?? "",
        "Inquiry page cursor",
        500,
      );
      learningAssert(
        !after || after.startsWith(`${courseId}:inquiry-thread:`),
        "Use this course's inquiry cursor.",
      );
      const threads = await store.list<InquiryThread>(
        courseId,
        "inquiry-thread",
        { sourceId: id, after, limit: 40 },
      );
      return reply({
        sourceId: id,
        threads: (await Promise.all(threads.map(project))).filter(Boolean),
        staff,
        next: threads.length === 40 ? threads[threads.length - 1]!.key : null,
      });
    }
    if (!item && request.method === "POST") {
      learningAssert(
        active || staff,
        "Active enrollment is required to share an inquiry.",
        403,
      );
      const input = await boundedJson(request);
      const captured = source(input.source);
      const question = inquiryQuestion(input.question);
      const id = sourceId(captured, question);
      learningAssert(
        await attempted(id),
        "Save your own initial thinking before sharing with peers.",
        403,
      );
      const threadId = crypto.randomUUID();
      const thread: InquiryThread = {
        id: threadId,
        courseId,
        sourceId: id,
        source: captured,
        question,
        audience: inquiryAudience(input.audience, course, user.id, staff),
        posts: [post(input)],
        createdAt: now,
        closedAt: null,
      };
      return reply(
        await save(
          "inquiry-thread",
          threadId,
          thread,
          null,
          "Student explicitly shared an inquiry with the chosen audience",
        ),
        201,
      );
    }
    if (item && item !== "offers" && item !== "attempts") {
      const record = await store.get<InquiryThread>(
        recordKey(courseId, "inquiry-thread", "", learningId(item)),
      );
      learningAssert(record, "Thread not found.", 404);
      if (request.method === "GET" && !action) {
        const visible = await project(record);
        learningAssert(visible, "Thread not found.", 404);
        return reply(visible);
      }
      const input = await boundedJson(request);
      const thread = structuredClone(record.value);
      if (request.method === "POST" && action === "replies") {
        learningAssert(
          (active || staff) && inquiryMember(thread, course, user.id, staff),
          "You cannot contribute to this historical audience.",
          403,
        );
        learningAssert(
          await attempted(thread.sourceId),
          "Save your own initial thinking before replying.",
          403,
        );
        learningAssert(
          !thread.closedAt && thread.posts.length < 100,
          "This inquiry is closed. Start a follow-up thread.",
          409,
        );
        thread.posts.push(post(input));
      } else if (request.method === "PUT" && !action) {
        const contribution = thread.posts.find(
          (post) => post.id === input.postId,
        );
        if (input.close === true) {
          learningAssert(staff, "Course staff can close a thread.", 403);
          thread.closedAt = now;
        } else {
          learningAssert(
            contribution && (contribution.author === user.id || staff),
            "Only the author or course staff can edit/remove a contribution.",
            403,
          );
          learningAssert(
            input.remove === true ||
              ((active || staff) &&
                inquiryMember(thread, course, user.id, staff) &&
                !thread.closedAt),
            "Only removal is available outside the current audience.",
            403,
          );
          contribution.reason = learningText(
            input.reason,
            "Edit/removal reason",
            1000,
            true,
          );
          if (input.remove === true) {
            contribution.body = "";
            contribution.links = [];
            contribution.provenance = "";
            contribution.removedAt = now;
          } else {
            contribution.body = learningText(
              input.body,
              "Revised contribution",
              6000,
              true,
            );
            contribution.editedAt = now;
          }
        }
      } else return reply({ message: "Unknown inquiry route." }, 404);
      return reply(
        await save(
          "inquiry-thread",
          item,
          thread,
          input.expected,
          learningText(
            input.reason ?? "Reply added",
            "Change reason",
            1000,
            true,
          ),
        ),
      );
    }
    return reply({ message: "Unknown inquiry route." }, 404);
  } catch (error) {
    return reply(
      {
        message:
          error instanceof LearningProblem || error instanceof Problem
            ? error.message
            : "This inquiry request could not be completed.",
      },
      error instanceof LearningProblem || error instanceof Problem
        ? error.status
        : 400,
    );
  }
}
export { publicInquiryMarkdown };
