type AdminFeedbackAuthor = {
  login?: string;
};

type AdminFeedbackReply = {
  author?: AdminFeedbackAuthor;
  body: string;
  createdAt: string;
};

type AdminFeedbackComment = {
  anonymous?: boolean;
  author?: AdminFeedbackAuthor;
  body: string;
  category?: string;
  chapter: string;
  createdAt: string;
  featuredAt?: string | null;
  hiddenAt?: string | null;
  id: string;
  paragraphId: string;
  replies?: AdminFeedbackReply[];
  resolutionReason?: string | null;
  resolvedAt?: string | null;
  type?: string;
};

type AdminFeedbackAuth = {
  admin: boolean;
  authenticated: boolean;
  available?: boolean;
  loginUrl?: string | null;
  local?: boolean;
  user?: AdminFeedbackAuthor | null;
};

type FeedbackChapter = {
  label: string;
  slug: string;
  title: string;
  url: string;
};

type ResolveFeedback = (
  comment: AdminFeedbackComment,
  reason: string,
) => Promise<void>;

type FeedbackFilters = HTMLFormElement & {
  elements: HTMLFormControlsCollection & {
    category: HTMLSelectElement;
    chapter: HTMLSelectElement;
    query: HTMLInputElement;
    status: HTMLSelectElement;
  };
};

const categoryLabels = new Map([
  ["unclear-concept", "Unclear concept"],
  ["missing-example", "Missing example"],
  ["too-fast", "Too fast"],
  ["typo-language", "Typo or language"],
  ["disagreement", "Disagreement"],
  ["broken-link-code", "Broken link or code"],
  ["stuck", "Stuck here"],
  ["reflection", "Reflection"],
]);
const resolutionLabels = new Map([
  ["fixed", "Fixed"],
  ["answered", "Answered"],
  ["duplicate", "Duplicate"],
  ["not-actionable", "Not actionable"],
  ["planned", "Planned"],
]);
const adminRoot = document.querySelector<HTMLElement>("[data-feedback-admin]");

if (adminRoot) {
  void initializeDashboard(adminRoot);
}

async function initializeDashboard(root: HTMLElement): Promise<void> {
  const access = requireElement(
    root.querySelector<HTMLElement>("[data-feedback-admin-access]"),
    "feedback access state",
  );
  const dashboard = requireElement(
    root.querySelector<HTMLElement>("[data-feedback-admin-dashboard]"),
    "feedback dashboard",
  );
  const identity = requireElement(
    root.querySelector<HTMLElement>("[data-feedback-admin-identity]"),
    "feedback identity",
  );

  try {
    const auth = await fetchJson<AdminFeedbackAuth>("/api/auth/status");
    renderIdentity(identity, auth);

    if (!auth.authenticated || !auth.admin) {
      renderRestrictedAccess(access, auth);
      return;
    }

    const response = await fetchJson<{ comments: AdminFeedbackComment[] }>(
      "/api/admin/comments",
    );
    const comments = Array.isArray(response.comments) ? response.comments : [];
    const chapters = parseChapterData();

    access.hidden = true;
    dashboard.hidden = false;
    setupDashboard(root, comments, chapters);
  } catch (error) {
    identity.textContent = "Feedback unavailable";
    access.replaceChildren(
      createHeading("Could not load feedback"),
      createParagraph(errorMessage(error)),
    );
  }
}

function setupDashboard(
  root: HTMLElement,
  comments: AdminFeedbackComment[],
  chapters: FeedbackChapter[],
): void {
  const filters = requireElement(
    root.querySelector<FeedbackFilters>("[data-feedback-filters]"),
    "feedback filters",
  );
  const list = requireElement(
    root.querySelector<HTMLElement>("[data-feedback-list]"),
    "feedback list",
  );
  const summary = requireElement(
    root.querySelector<HTMLElement>("[data-feedback-result-summary]"),
    "feedback result summary",
  );
  const actionStatus = requireElement(
    root.querySelector<HTMLElement>("[data-feedback-action-status]"),
    "feedback action status",
  );
  const chapterBySlug = new Map(
    chapters.map((chapter) => [chapter.slug, chapter]),
  );
  const sortedComments = [...comments].sort(
    (left, right) => dateValue(right.createdAt) - dateValue(left.createdAt),
  );

  populateCategoryFilter(filters.elements.category, sortedComments);
  populateChapterFilter(
    filters.elements.chapter,
    sortedComments,
    chapterBySlug,
  );

  const render = () => {
    const visible = filterComments(sortedComments, filters, chapterBySlug);
    const status = filters.elements.status.value;
    const statusTotal = sortedComments.filter(
      (comment) => status === "all" || matchesStatus(comment, status),
    ).length;

    updateMetrics(root, sortedComments);
    summary.textContent = resultSummary(visible.length, statusTotal, status);
    renderComments(list, visible, chapterBySlug, resolveFeedback);
  };

  async function resolveFeedback(
    comment: AdminFeedbackComment,
    reason: string,
  ): Promise<void> {
    const resolved = await fetchJson<AdminFeedbackComment>(
      `/api/comments/${encodeURIComponent(comment.id)}/resolve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      },
    );

    Object.assign(comment, resolved);
    actionStatus.textContent = `${chapterTitle(comment.chapter, chapterBySlug)} feedback resolved as ${resolutionLabels.get(reason) || "Resolved"} and moved to the archive.`;
    render();
  }

  filters.addEventListener("input", render);
  filters.addEventListener("reset", () => window.setTimeout(render, 0));
  render();
}

function updateMetrics(
  root: HTMLElement,
  comments: AdminFeedbackComment[],
): void {
  const open = comments.filter(
    (comment) => !comment.resolvedAt && !comment.hiddenAt,
  ).length;
  const resolved = comments.filter((comment) => comment.resolvedAt).length;
  const chapters = new Set(comments.map((comment) => comment.chapter)).size;
  const values = {
    open,
    total: comments.length,
    resolved,
    chapters,
  };

  for (const [name, value] of Object.entries(values)) {
    requireElement(
      root.querySelector<HTMLElement>(`[data-feedback-metric="${name}"]`),
      `${name} feedback metric`,
    ).textContent = String(value);
  }
}

function populateCategoryFilter(
  select: HTMLSelectElement,
  comments: AdminFeedbackComment[],
): void {
  const categories = [
    ...new Set(comments.map((comment) => comment.category).filter(Boolean)),
  ].sort((left, right) =>
    labelForCategory(left).localeCompare(labelForCategory(right)),
  );

  for (const category of categories) {
    if (category) {
      select.append(createOption(category, labelForCategory(category)));
    }
  }
}

function populateChapterFilter(
  select: HTMLSelectElement,
  comments: AdminFeedbackComment[],
  chapterBySlug: Map<string, FeedbackChapter>,
): void {
  const slugs = [...new Set(comments.map((comment) => comment.chapter))].sort(
    (left, right) =>
      chapterTitle(left, chapterBySlug).localeCompare(
        chapterTitle(right, chapterBySlug),
      ),
  );

  for (const slug of slugs) {
    select.append(createOption(slug, chapterTitle(slug, chapterBySlug)));
  }
}

function filterComments(
  comments: AdminFeedbackComment[],
  filters: FeedbackFilters,
  chapterBySlug: Map<string, FeedbackChapter>,
): AdminFeedbackComment[] {
  const query = filters.elements.query.value.trim().toLocaleLowerCase();
  const status = filters.elements.status.value;
  const category = filters.elements.category.value;
  const chapter = filters.elements.chapter.value;

  return comments.filter((comment) => {
    if (status !== "all" && !matchesStatus(comment, status)) {
      return false;
    }

    if (category !== "all" && comment.category !== category) {
      return false;
    }

    if (chapter !== "all" && comment.chapter !== chapter) {
      return false;
    }

    if (!query) {
      return true;
    }

    const replies = Array.isArray(comment.replies) ? comment.replies : [];
    const searchable = [
      comment.body,
      displayAuthor(comment),
      labelForCategory(comment.category),
      chapterTitle(comment.chapter, chapterBySlug),
      ...replies.map((reply) => reply.body),
    ]
      .join(" ")
      .toLocaleLowerCase();

    return searchable.includes(query);
  });
}

function matchesStatus(comment: AdminFeedbackComment, status: string): boolean {
  if (status === "open") {
    return !comment.resolvedAt && !comment.hiddenAt;
  }

  if (status === "resolved") {
    return Boolean(comment.resolvedAt);
  }

  if (status === "hidden") {
    return Boolean(comment.hiddenAt);
  }

  if (status === "featured") {
    return Boolean(comment.featuredAt);
  }

  return true;
}

function renderComments(
  list: HTMLElement,
  comments: AdminFeedbackComment[],
  chapterBySlug: Map<string, FeedbackChapter>,
  onResolve: ResolveFeedback,
): void {
  list.replaceChildren();

  if (!comments.length) {
    const empty = document.createElement("div");
    empty.className = "feedback-admin-empty";
    empty.append(
      createHeading("No feedback matches this view"),
      createParagraph("Clear a filter or try a broader search."),
    );
    list.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const comment of comments) {
    fragment.append(renderComment(comment, chapterBySlug, onResolve));
  }
  list.append(fragment);
}

function renderComment(
  comment: AdminFeedbackComment,
  chapterBySlug: Map<string, FeedbackChapter>,
  onResolve: ResolveFeedback,
): HTMLElement {
  const card = document.createElement("article");
  card.className = "feedback-admin-card";
  card.dataset.feedbackId = comment.id;
  card.classList.toggle("is-resolved", Boolean(comment.resolvedAt));
  card.classList.toggle("is-hidden", Boolean(comment.hiddenAt));

  const chapter = chapterBySlug.get(comment.chapter);
  const header = document.createElement("header");
  const location = document.createElement("div");
  location.className = "feedback-card-location";
  const chapterLink = document.createElement("a");
  chapterLink.href = passageUrl(comment, chapter);
  chapterLink.textContent = chapterTitle(comment.chapter, chapterBySlug);
  const context = document.createElement("span");
  context.textContent = paragraphLabel(comment);
  location.append(chapterLink, context);

  const time = document.createElement("time");
  time.dateTime = comment.createdAt;
  time.textContent = formatDate(comment.createdAt);
  header.append(location, time);

  const body = document.createElement("p");
  body.className = "feedback-card-body";
  body.textContent = comment.body;

  const details = document.createElement("div");
  details.className = "feedback-card-details";
  details.append(
    renderChip(labelForCategory(comment.category), "category"),
    renderChip(commentStatus(comment), "status"),
  );

  if (comment.featuredAt) {
    details.append(renderChip("Featured", "featured"));
  }

  const author = document.createElement("span");
  author.className = "feedback-card-author";
  author.textContent = `From ${displayAuthor(comment)}`;
  details.append(author);

  const open = document.createElement("a");
  open.className = "feedback-card-open";
  open.href = passageUrl(comment, chapter);
  open.textContent = "Open passage";
  open.setAttribute(
    "aria-label",
    `Open feedback context in ${chapterTitle(comment.chapter, chapterBySlug)}`,
  );
  details.append(open);

  if (!comment.resolvedAt && !comment.hiddenAt) {
    const resolve = document.createElement("button");
    const formId = `resolve-feedback-${comment.id.replace(/[^a-z0-9_-]/gi, "-")}`;
    resolve.className = "feedback-card-resolve";
    resolve.type = "button";
    resolve.textContent = "Resolve";
    resolve.setAttribute("aria-controls", formId);
    resolve.setAttribute("aria-expanded", "false");
    resolve.addEventListener("click", () => {
      const existing = card.querySelector<HTMLFormElement>(
        ".feedback-card-resolution",
      );

      if (existing) {
        existing.remove();
        resolve.setAttribute("aria-expanded", "false");
        resolve.focus();
        return;
      }

      resolve.setAttribute("aria-expanded", "true");
      card.append(
        renderResolutionForm(formId, comment, onResolve, () => {
          resolve.setAttribute("aria-expanded", "false");
          resolve.focus();
        }),
      );
    });
    details.append(resolve);
  }

  card.append(header, body, details);

  const replies = Array.isArray(comment.replies) ? comment.replies : [];
  if (replies.length) {
    card.append(renderReplies(replies));
  }

  return card;
}

function renderResolutionForm(
  id: string,
  comment: AdminFeedbackComment,
  onResolve: ResolveFeedback,
  onCancel: () => void,
): HTMLFormElement {
  const form = document.createElement("form");
  form.className = "feedback-card-resolution";
  form.id = id;

  const label = document.createElement("label");
  const labelText = document.createElement("span");
  labelText.textContent = "Resolution outcome";
  const select = document.createElement("select");
  select.name = "reason";
  select.required = true;
  select.append(createOption("", "Choose an outcome"));
  for (const [value, text] of resolutionLabels) {
    select.append(createOption(value, text));
  }
  label.append(labelText, select);

  const actions = document.createElement("div");
  actions.className = "feedback-resolution-actions";
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Resolve and archive";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => {
    form.remove();
    onCancel();
  });
  actions.append(submit, cancel);

  const status = document.createElement("p");
  status.className = "feedback-resolution-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!resolutionLabels.has(select.value)) {
      status.textContent = "Choose an outcome before resolving this issue.";
      select.focus();
      return;
    }

    select.disabled = true;
    submit.disabled = true;
    cancel.disabled = true;
    submit.textContent = "Archiving…";

    try {
      await onResolve(comment, select.value);
    } catch (error) {
      status.textContent = errorMessage(error);
      select.disabled = false;
      submit.disabled = false;
      cancel.disabled = false;
      submit.textContent = "Resolve and archive";
    }
  });

  form.append(label, actions, status);
  window.setTimeout(() => select.focus(), 0);
  return form;
}

function renderReplies(replies: AdminFeedbackReply[]): HTMLElement {
  const section = document.createElement("section");
  section.className = "feedback-card-replies";
  const heading = document.createElement("h3");
  heading.textContent = `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`;
  section.append(heading);

  for (const reply of replies) {
    const item = document.createElement("article");
    const meta = document.createElement("p");
    meta.textContent = `${reply.author?.login || "Book author"} · ${formatDate(reply.createdAt)}`;
    const body = document.createElement("p");
    body.textContent = reply.body;
    item.append(meta, body);
    section.append(item);
  }

  return section;
}

function renderChip(label: string, kind: string): HTMLElement {
  const chip = document.createElement("span");
  chip.className = "feedback-card-chip";
  chip.dataset.kind = kind;
  chip.textContent = label;
  return chip;
}

function renderIdentity(element: HTMLElement, auth: AdminFeedbackAuth): void {
  if (auth.authenticated && auth.admin) {
    const name = auth.user?.login || "Admin";
    element.replaceChildren();
    const marker = document.createElement("span");
    marker.setAttribute("aria-hidden", "true");
    const text = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = name;
    const small = document.createElement("small");
    small.textContent = auth.local ? "Local review mode" : "Book administrator";
    text.append(strong, small);
    element.append(marker, text);
    return;
  }

  element.textContent = auth.authenticated ? "Restricted" : "Sign-in required";
}

function renderRestrictedAccess(
  element: HTMLElement,
  auth: AdminFeedbackAuth,
): void {
  element.replaceChildren();
  element.append(
    createHeading(
      auth.authenticated
        ? "Administrator access required"
        : "Sign in to review",
    ),
    createParagraph(
      auth.authenticated
        ? "This dashboard contains private reader feedback and is available only to the book administrator."
        : "The feedback dashboard contains private reader responses. Sign in with the administrator account to continue.",
    ),
  );

  if (!auth.authenticated && auth.available !== false && auth.loginUrl) {
    const link = document.createElement("a");
    link.className = "feedback-admin-sign-in";
    link.href = auth.loginUrl;
    link.textContent = "Sign in with GitHub";
    element.append(link);
  }
}

function parseChapterData(): FeedbackChapter[] {
  const source = document.querySelector<HTMLScriptElement>(
    "#feedback-chapter-data",
  );

  if (!source?.textContent) {
    return [];
  }

  try {
    const value: unknown = JSON.parse(source.textContent);
    return Array.isArray(value) ? (value as FeedbackChapter[]) : [];
  } catch {
    return [];
  }
}

function passageUrl(
  comment: AdminFeedbackComment,
  chapter: FeedbackChapter | undefined,
): string {
  const base = chapter?.url || `/chapters/${comment.chapter}/`;
  return `${base}#${encodeURIComponent(comment.paragraphId)}`;
}

function chapterTitle(
  slug: string,
  chapterBySlug: Map<string, FeedbackChapter>,
): string {
  return chapterBySlug.get(slug)?.title || titleFromSlug(slug);
}

function titleFromSlug(slug: string): string {
  const title = slug.replace(/-/g, " ");
  return title.charAt(0).toLocaleUpperCase() + title.slice(1);
}

function paragraphLabel(comment: AdminFeedbackComment): string {
  if (comment.paragraphId === "p-chapter-reflection") {
    return "Chapter reflection";
  }

  if (comment.type === "stuck") {
    return "Confusion marker";
  }

  return "Paragraph feedback";
}

function displayAuthor(comment: AdminFeedbackComment): string {
  return comment.anonymous
    ? "Anonymous student"
    : comment.author?.login || "GitHub user";
}

function labelForCategory(category: string | undefined): string {
  return (category && categoryLabels.get(category)) || "Feedback";
}

function commentStatus(comment: AdminFeedbackComment): string {
  if (comment.hiddenAt) {
    return "Hidden";
  }

  if (comment.resolvedAt) {
    return (
      (comment.resolutionReason &&
        resolutionLabels.get(comment.resolutionReason)) ||
      "Resolved"
    );
  }

  return "Open";
}

function resultSummary(visible: number, total: number, status: string): string {
  const label = statusLabel(status, total);

  if (visible === total) {
    return `${total} ${label}`;
  }

  return `${visible} of ${total} ${label}`;
}

function statusLabel(status: string, count: number): string {
  const singular = count === 1;

  if (status === "open") {
    return singular ? "open issue" : "open issues";
  }

  if (status === "resolved") {
    return singular ? "archived issue" : "archived issues";
  }

  if (status === "hidden") {
    return singular ? "hidden response" : "hidden responses";
  }

  if (status === "featured") {
    return singular ? "featured response" : "featured responses";
  }

  return singular ? "response" : "responses";
}

function createOption(value: string, label: string): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function createHeading(text: string): HTMLHeadingElement {
  const heading = document.createElement("h2");
  heading.textContent = text;
  return heading;
}

function createParagraph(text: string): HTMLParagraphElement {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  return paragraph;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function dateValue(value: string): number {
  const date = Date.parse(value);
  return Number.isNaN(date) ? 0 : date;
}

async function fetchJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  const response = await fetch(url, {
    ...options,
    headers,
  });
  const body = (await response.json().catch(() => ({}))) as T & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(body.message || `Request failed (${response.status})`);
  }

  return body;
}

function requireElement<T extends Element>(element: T | null, name: string): T {
  if (!element) {
    throw new Error(`Missing ${name}`);
  }

  return element;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed";
}
