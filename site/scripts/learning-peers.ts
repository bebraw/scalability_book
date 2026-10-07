import type {
  LearningSource,
  NotebookEntry,
} from "../../shared/learning-workspace.ts";
import {
  inquiryQuestions,
  publicInquiryMarkdown,
  type InquiryQuestion,
  type InquiryThread,
  type InquiryOffer,
} from "../../shared/course-inquiry.ts";
import type { Envelope } from "../../shared/course.ts";
import {
  inquiryOutline,
  inquiryReasoningPrompts,
  inquiryRolePrompts,
  selectedInquiryText,
} from "../../shared/learning-inquiry.ts";
import { mountLearningPractice, type GuideSave } from "./learning-practice.ts";

type VisibleThread = Envelope<InquiryThread> & { readOnly?: boolean };
type Membership = {
  user: string;
  active: boolean;
  staff: boolean;
  groups: { phase: string; id: string; label: string }[];
};
interface Options {
  source: LearningSource;
  entries: NotebookEntry[];
  initial: (source: LearningSource) => void;
  reflect: (source: LearningSource, body: string, relatedIds: string[]) => void;
  status: (text: string) => void;
  save: GuideSave;
  help: (source: LearningSource, text: string) => void;
  notes: () => void;
}
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
  const result = document.createElement(tag);
  result.textContent = text;
  return result;
};
let counter = 0;
function field(text: string, control: HTMLElement) {
  const label = node("label"),
    caption = node("span", text);
  caption.id = `inquiry-field-${++counter}`;
  control.setAttribute("aria-labelledby", caption.id);
  label.append(caption, control);
  return label;
}
export function mountLearningPeers(container: HTMLElement, options: Options) {
  const source = options.source;
  const privateEntries = [...options.entries];
  const related = (source: LearningSource) =>
    privateEntries
      .filter(
        (entry) =>
          entry.source.url === source.url &&
          entry.source.anchor === source.anchor,
      )
      .slice(-20)
      .map((entry) => entry.id);
  const state = {
    course: new URL(location.href).searchParams.get("course") ?? "",
    question: (inquiryQuestions.includes(
      new URL(location.href).searchParams.get(
        "inquiryActivity",
      ) as InquiryQuestion,
    )
      ? new URL(location.href).searchParams.get("inquiryActivity")
      : "reading") as InquiryQuestion,
    membership: null as Membership | null,
    threads: [] as VisibleThread[],
    next: null as string | null,
  };
  let selectionRevision = 0;
  const act = async (fn: () => Promise<void> | void) => {
    try {
      await fn();
    } catch (error) {
      options.status(
        error instanceof Error ? error.message : "The peer request failed.",
      );
    }
  };
  const button = (text: string, fn: () => Promise<void> | void) => {
    const result = node("button", text);
    result.type = "button";
    result.addEventListener("click", () => void act(fn));
    return result;
  };
  const api = async <T>(
    route = "",
    method = "GET",
    value?: unknown,
  ): Promise<T> => {
    const response = await fetch(
      `/api/courses/${encodeURIComponent(state.course)}/inquiry${route}`,
      {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers:
          value === undefined ? {} : { "Content-Type": "application/json" },
        ...(value === undefined ? {} : { body: JSON.stringify(value) }),
      },
    );
    const body = (await response.json()) as T & { message?: string };
    if (!response.ok)
      throw new Error(
        body.message ?? "Sign in to your course to use peer inquiry.",
      );
    return body;
  };
  container.append(
    node(
      "p",
      "Peer inquiry follows your own thinking. Save an explanation, prediction or where you are stuck, then compare and reflect. Your initial text stays in your private notebook.",
    ),
  );
  container.append(
    node(
      "p",
      "You can return to Chapter guide for a private related case at any time. Peer replies are optional; solo work does not require a group response.",
    ),
  );
  const sourceLink = node("a", source.title);
  const href = new URL(source.url);
  href.hash = source.anchor;
  sourceLink.href = href.href;
  container.append(sourceLink);
  const courseSelect = node("select");
  courseSelect.append(node("option", "Choose your course"));
  const question = node("select");
  for (const id of inquiryQuestions) {
    const option = node(
      "option",
      {
        reading: "Passage discussion",
        prediction: "Prediction and observation",
        evidence: "Evidence check",
        session: "Shared engineering session",
      }[id],
    );
    option.value = id;
    question.append(option);
  }
  const gate = node("div"),
    discussions = node("div"),
    compose = node("div"),
    offers = node("div");
  question.value = state.question;
  container.append(
    field("Course for this inquiry", courseSelect),
    field("Inquiry activity", question),
    gate,
    discussions,
    compose,
    offers,
  );
  const reset = () => {
    selectionRevision++;
    state.threads = [];
    discussions.replaceChildren();
    compose.replaceChildren();
    offers.replaceChildren();
    void act(loadGate);
  };
  courseSelect.addEventListener("change", () => {
    state.course = courseSelect.value;
    reset();
  });
  question.addEventListener("change", () => {
    state.question = question.value as InquiryQuestion;
    reset();
  });
  void act(async () => {
    const response = await fetch("/api/courses", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) {
      gate.append(
        node(
          "p",
          "Sign in using your course account. The notebook does not link your feedback identity to a course account.",
        ),
      );
      const link = node("a", "Course sign-in");
      link.href = "/course/";
      gate.append(link);
      return;
    }
    const data = (await response.json()) as {
      courses: { id: string; name: string }[];
    };
    for (const course of data.courses) {
      const option = node("option", course.name);
      option.value = course.id;
      courseSelect.append(option);
    }
    if (
      state.course &&
      data.courses.some((course) => course.id === state.course)
    ) {
      courseSelect.value = state.course;
      await loadGate();
    } else
      gate.append(
        node(
          "p",
          "Choose a course run. Optional inquiry does not add an assessment or reporting requirement.",
        ),
      );
  });
  async function loadGate() {
    const revision = selectionRevision;
    gate.replaceChildren();
    if (!state.course || courseSelect.selectedIndex === 0) return;
    const membership = await api<Membership>("/membership");
    if (revision !== selectionRevision) return;
    state.membership = membership;
    const own = options.entries.filter(
      (entry) =>
        entry.kind === "attempt" &&
        entry.body.trim() &&
        entry.source.url === source.url &&
        entry.source.anchor === source.anchor,
    );
    gate.append(
      button("Write my initial thinking", () => options.initial(source)),
    );
    if (state.membership.staff) {
      gate.append(button("Open inquiry as course staff", reveal));
      return;
    }
    if (!own.length) {
      gate.append(
        node(
          "p",
          "Save initial thinking for this source first. A concrete question or uncertainty is enough; there is no required correct answer.",
        ),
      );
      return;
    }
    const initial = node("select");
    for (const entry of own) {
      const option = node(
        "option",
        `${entry.title} (${entry.body.length} characters)`,
      );
      option.value = entry.id;
      initial.append(option);
    }
    gate.append(
      field("My saved initial work", initial),
      button("Reveal peer inquiry", async () => {
        const entry = own.find((entry) => entry.id === initial.value)!;
        await api("/attempts", "POST", {
          source,
          question: state.question,
          noteId: entry.id,
          noteRevision: entry.revision,
        });
        await reveal();
      }),
    );
  }
  async function reveal(after = "") {
    const revision = selectionRevision;
    const identity = { ...source, excerpt: "" };
    const result = await api<{ threads: VisibleThread[]; next: string | null }>(
      `?source=${encodeURIComponent(JSON.stringify(identity))}&question=${state.question}${after ? `&after=${encodeURIComponent(after)}` : ""}`,
    );
    if (revision !== selectionRevision) return;
    state.threads = after
      ? [
          ...state.threads,
          ...result.threads.filter(
            (record) =>
              !state.threads.some(
                (prior) => prior.value.id === record.value.id,
              ),
          ),
        ]
      : result.threads;
    state.next = result.next;
    renderThreads();
    renderCompose();
    await renderOffers();
    options.status(
      "Peer inquiry revealed. Compare it with your saved initial thinking.",
    );
  }
  function threadLink(thread: InquiryThread) {
    const url = new URL(thread.source.url);
    url.hash = thread.source.anchor;
    url.searchParams.set("course", state.course);
    url.searchParams.set("inquiry", thread.id);
    url.searchParams.set("inquiryActivity", thread.question);
    return url.href;
  }
  function renderThreads() {
    discussions.replaceChildren(node("h3", "Shared investigations"));
    if (!state.threads.length)
      discussions.append(
        node(
          "p",
          "No shared inquiry is available here yet. You can start one with your chosen audience.",
        ),
      );
    for (const record of state.threads) {
      const thread = record.value;
      const card = node("article");
      const selected = new Set<string>();
      const chosen = () =>
        thread.posts.filter((post) => selected.has(post.id) && !post.removedAt);
      const selectionActions: HTMLButtonElement[] = [];
      card.className = "learning-note";
      card.append(
        node(
          "h3",
          thread.audience.kind === "group"
            ? `${thread.audience.phase} / ${thread.audience.group}`
            : "Course cohort",
        ),
      );
      if (
        thread.source.revision !== source.revision ||
        thread.source.excerpt !== source.excerpt
      )
        card.append(
          node(
            "p",
            "This thread retains an earlier source snapshot. Check the captured passage before comparing claims.",
          ),
        );
      const captured = node("details");
      captured.append(
        node("summary", "Captured source"),
        node("blockquote", thread.source.excerpt),
      );
      card.append(captured);
      for (const post of thread.posts) {
        const contribution = node("article");
        contribution.className = "learning-note";
        contribution.append(
          node("h3", `${post.name} · ${post.kind}`),
          node(
            "p",
            post.removedAt ? `Contribution removed: ${post.reason}` : post.body,
          ),
        );
        if (post.provenance)
          contribution.append(node("small", post.provenance));
        if (!post.removedAt) {
          const include = node("input");
          include.type = "checkbox";
          include.addEventListener("change", () => {
            if (include.checked) selected.add(post.id);
            else selected.delete(post.id);
            for (const action of selectionActions)
              action.disabled = !selected.size;
          });
          contribution.append(
            field(`Select ${post.name} · ${post.kind} for my draft`, include),
          );
        }
        if (post.editedAt)
          contribution.append(
            node(
              "small",
              `Revised ${new Date(post.editedAt).toLocaleString()}: ${post.reason}`,
            ),
          );
        for (const evidence of post.links) {
          const link = node("a", evidence.caption);
          link.href = evidence.url;
          link.rel = "noreferrer";
          contribution.append(link);
        }
        if (post.author === state.membership!.user || state.membership!.staff) {
          contribution.append(
            button("Remove contribution", async () => {
              if (
                !window.confirm(
                  "Remove this shared text? Staff retain its revision history.",
                )
              )
                return;
              const reason = window.prompt("Removal reason");
              if (!reason) return;
              await api(`/${thread.id}`, "PUT", {
                postId: post.id,
                remove: true,
                expected: record.revision,
                reason,
              });
              await reveal();
            }),
          );
          if (!record.readOnly && !thread.closedAt && !post.removedAt)
            contribution.append(
              button("Revise contribution", async () => {
                const body = window.prompt(
                  "Review your revised shared contribution",
                  post.body,
                );
                if (!body) return;
                const reason = window.prompt("What changed?");
                if (!reason) return;
                await api(`/${thread.id}`, "PUT", {
                  postId: post.id,
                  body,
                  expected: record.revision,
                  reason,
                });
                await reveal();
              }),
            );
        }
        if (
          post.author === state.membership!.user &&
          !post.removedAt &&
          !record.readOnly
        )
          contribution.append(
            button("Offer my text for public review", async () => {
              const body = window.prompt(
                "Review the text you deliberately offer for public editorial review. This does not publish the thread or its replies.",
                post.body,
              );
              if (!body) return;
              if (
                !window.confirm(
                  "Offer this reviewed text to editors for possible public book publication, attributed anonymously?",
                )
              )
                return;
              await api("/offers", "POST", {
                threadId: thread.id,
                postId: post.id,
                body,
                publicConsent: true,
                namedAttribution: false,
              });
              options.status(
                "Your selected text was offered for editorial review. The thread remains in its original audience.",
              );
              await renderOffers();
            }),
          );
        card.append(contribution);
      }
      const link = node("a", "Return to this inquiry");
      link.href = threadLink(thread);
      card.append(
        link,
        button("Reflect privately on this inquiry", () =>
          options.reflect(
            thread.source,
            `Discussion reference: ${threadLink(thread)}\nThis link does not copy replies or grant access after membership changes.\n\n${selected.size ? `Selected contributions for my review (not group consensus):\n${selectedInquiryText(chosen(), 12000)}\n\n` : ""}My initial view:\n\nWhat I can now justify myself:\n\nWhat remains uncertain or needs more help:\n\nMy next independent check:\n`,
            related(thread.source),
          ),
        ),
      );
      card.append(
        node(
          "p",
          "Select only contributions you want copied into a reviewed draft. Leaving them unselected keeps the private reflection handoff to a discussion link and optional starters. Nothing is sent to an agent automatically.",
        ),
      );
      const practice = node("details");
      practice.append(node("summary", "Try a related case privately"));
      mountLearningPractice(practice, {
        source: {
          ...thread.source,
          excerpt: `Discussion reference: ${threadLink(thread)}\n\n${thread.source.excerpt}`,
        },
        related: () => related(thread.source),
        save: async (...args) => {
          const entry = await options.save(...args);
          privateEntries.push(entry);
          return entry;
        },
        help: options.help,
        notes: options.notes,
        draftScope: thread.id,
      });
      card.append(practice);
      if (!record.readOnly && !thread.closedAt) {
        const reply = node("textarea");
        reply.rows = 3;
        reply.maxLength = 6000;
        const kind = kindSelect();
        const provenance = node("input");
        provenance.maxLength = 1000;
        const prepare = button(
          "Prepare summary from selected contributions",
          () => {
            const text = selectedInquiryText(chosen(), 4700);
            if (
              reply.value.trim() &&
              !window.confirm(
                "Replace this unfinished reply with a selected-contribution summary draft? Cancel keeps your reply.",
              )
            )
              return;
            reply.value = `Selected contributions for review (not group consensus):\n${text}\n\n${inquiryOutline()}`;
            kind.value = "summary";
            options.status(
              "Summary prepared for your review. Preserve disagreement and evidence limits, name who supports each decision, and record any agent assistance before sharing.",
            );
          },
        );
        prepare.disabled = true;
        selectionActions.push(prepare);
        card.append(
          field("My reply", reply),
          field("Reply kind", kind),
          field("Reply tool or observation provenance", provenance),
          reasoningSupport(reply),
          prepare,
          button("Share reply with this audience", async () => {
            await api(`/${thread.id}/replies`, "POST", {
              expected: record.revision,
              kind: kind.value,
              body: reply.value,
              provenance: provenance.value,
              links: [],
            });
            await reveal();
          }),
        );
      } else
        card.append(
          node(
            "p",
            record.readOnly
              ? "Read-only historical access contains your own contributions only."
              : "This inquiry is closed.",
          ),
        );
      if (state.membership!.staff && !thread.closedAt)
        card.append(
          button("Close inquiry", async () => {
            await api(`/${thread.id}`, "PUT", {
              close: true,
              expected: record.revision,
              reason: "Closed by course staff",
            });
            await reveal();
          }),
        );
      discussions.append(card);
    }
    if (state.next)
      discussions.append(button("More inquiry", () => reveal(state.next!)));
    discussions.append(button("Reload inquiry", reveal));
  }
  function kindSelect() {
    const select = node("select");
    for (const value of [
      "question",
      "observation",
      "check",
      "disagreement",
      "summary",
    ]) {
      const option = node("option", value);
      option.value = value;
      select.append(option);
    }
    return select;
  }
  function reasoningSupport(body: HTMLTextAreaElement) {
    const details = node("details");
    details.append(
      node("summary", "Optional reasoning and session prompts"),
      node(
        "p",
        "Use any prompt, write freely or leave a disagreement unresolved. No required fields, contribution count or meeting schedule.",
      ),
    );
    for (const prompt of inquiryReasoningPrompts)
      details.append(node("h4", prompt.title), node("p", prompt.prompt));
    for (const prompt of inquiryRolePrompts) details.append(node("p", prompt));
    details.append(
      button("Use inquiry outline", () => {
        const next = `${body.value.trim()}${body.value.trim() ? "\n\n" : ""}${inquiryOutline()}`;
        if (next.length > 6000)
          throw new Error(
            "Keep your writing and use the prompts alongside it; this contribution is too long to add the outline.",
          );
        body.value = next;
        body.focus();
      }),
    );
    return details;
  }
  function renderCompose() {
    compose.replaceChildren();
    const membership = state.membership!;
    if (!membership.active && !membership.staff) return;
    compose.append(node("h3", "Start a shared investigation"));
    const audience = node("select");
    for (const group of membership.groups) {
      const option = node("option", `Group — ${group.label}`);
      option.value = `${group.phase}:${group.id}`;
      audience.append(option);
    }
    const cohort = node(
      "option",
      "Course cohort — all active participants in this run",
    );
    cohort.value = "cohort";
    audience.append(cohort);
    const body = node("textarea");
    body.rows = 5;
    body.maxLength = 6000;
    const kind = kindSelect();
    const provenance = node("input");
    provenance.maxLength = 1000;
    const evidence = node("input");
    evidence.type = "url";
    compose.append(
      field("Who will read this contribution?", audience),
      field("Contribution kind", kind),
      field("Review the text I want to share", body),
      field("Tool or observation provenance", provenance),
      field("Optional HTTPS evidence link", evidence),
      reasoningSupport(body),
      node(
        "p",
        "Review the audience and text before sharing. For summaries, keep contributors, consequential disagreement, evidence limits and any agent/tool provenance explicit. An agent suggestion is not a group decision.",
      ),
      button("Share reviewed text with the chosen audience", async () => {
        const [phase, group] = audience.value.split(":");
        await api("", "POST", {
          source,
          question: state.question,
          audience:
            audience.value === "cohort"
              ? { kind: "cohort" }
              : { kind: "group", phase, group },
          kind: kind.value,
          body: body.value,
          provenance: provenance.value,
          links: evidence.value
            ? [{ url: evidence.value, caption: "Investigation evidence" }]
            : [],
        });
        await reveal();
      }),
    );
  }
  async function renderOffers() {
    const revision = selectionRevision;
    offers.replaceChildren(node("h3", "Public review offers"));
    const records = await api<Envelope<InquiryOffer>[]>("/offers");
    if (revision !== selectionRevision) return;
    for (const record of records) {
      const offer = record.value;
      const card = node("article");
      card.className = "learning-note";
      card.append(node("p", `${offer.status}: ${offer.body}`));
      if (offer.status !== "withdrawn")
        card.append(
          button("Withdraw public offer", async () => {
            await api(`/offers/${offer.id}`, "PUT", {
              expected: record.revision,
              status: "withdrawn",
              reason: "Author withdrew public consent",
            });
            await renderOffers();
          }),
        );
      if (state.membership!.staff && offer.status !== "withdrawn") {
        const text = node("textarea");
        text.rows = 4;
        text.value = offer.curatedText || offer.body;
        card.append(
          field("Curated text for editorial review", text),
          button("Mark reviewed for the book editor", async () => {
            await api(`/offers/${offer.id}`, "PUT", {
              expected: record.revision,
              status: "reviewed",
              curatedText: text.value,
              reason:
                "Course staff reviewed the explicitly offered text; publication requires book-editor review",
            });
            await renderOffers();
          }),
          button("Decline public offer", async () => {
            await api(`/offers/${offer.id}`, "PUT", {
              expected: record.revision,
              status: "declined",
              reason: "Not selected for public curation",
            });
            await renderOffers();
          }),
        );
      }
      if (state.membership!.staff && offer.status === "reviewed")
        card.append(
          button("Download for book-editor review", () => {
            const blob = new Blob([publicInquiryMarkdown(offer)], {
              type: "text/markdown",
            });
            const url = URL.createObjectURL(blob);
            const link = node("a");
            link.href = url;
            link.download = "reader-note-proposal.md";
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }),
        );
      offers.append(card);
    }
    offers.append(
      node(
        "p",
        "An offer is a selected copy of the author's reviewed text. Course staff review it; a book editor publishes through the existing Markdown review workflow. Withdrawing an offer does not remove a copy already published; contact the editor for a correction.",
      ),
    );
  }
}
