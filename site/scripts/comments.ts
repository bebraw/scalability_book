type FeedbackOption = readonly [string, string];
type FeedbackAuthor = {
  login?: string;
  avatarUrl?: string | null;
  url?: string | null;
};
type FeedbackReply = {
  author?: FeedbackAuthor;
  body: string;
  createdAt: string;
};
type FeedbackComment = {
  id: string;
  sourceId?: string;
  chapter: string;
  paragraphId: string;
  type?: string;
  category?: string;
  body: string;
  author?: FeedbackAuthor;
  anonymous?: boolean;
  createdAt: string;
  hiddenAt?: string;
  hiddenBy?: string;
  resolvedAt?: string;
  resolutionReason?: string;
  featuredAt?: string;
  featuredText?: string;
  publicNote?: boolean;
  replies?: FeedbackReply[];
};
type FeedbackAuth = {
  available?: boolean;
  authenticated: boolean;
  admin: boolean;
  local?: boolean;
  loginUrl?: string | null;
  user?: FeedbackAuthor;
};
type ChapterSource = { content: string; file: string };
type CommentForm = HTMLFormElement & {
  elements: HTMLFormControlsCollection & {
    anonymous: HTMLInputElement;
    body: HTMLTextAreaElement;
    category: HTMLSelectElement;
  };
};

const commentsPanel = document.querySelector<HTMLElement>(
  "[data-comments-panel]",
);

if (commentsPanel) {
  const panelRoot = commentsPanel;
  const feedbackCategories: FeedbackOption[] = [
    ["unclear-concept", "Unclear concept"],
    ["missing-example", "Missing example"],
    ["too-fast", "Too fast"],
    ["typo-language", "Typo or language"],
    ["disagreement", "Disagreement"],
    ["broken-link-code", "Broken link or code"],
    ["stuck", "Stuck here"],
    ["reflection", "Reflection"],
  ];
  const resolutionReasons: FeedbackOption[] = [
    ["fixed", "Fixed"],
    ["answered", "Answered"],
    ["duplicate", "Duplicate"],
    ["not-actionable", "Not actionable"],
    ["planned", "Planned"],
  ];
  const commentsControls = document.querySelector<HTMLElement>(
    "[data-comments-controls]",
  );
  const chapterSlug = commentsPanel.dataset.chapterSlug || "";
  const status = requireElement(
    document.querySelector<HTMLElement>("[data-comments-status]"),
    "comments status",
  );
  const list = requireElement(
    commentsPanel.querySelector<HTMLElement>("[data-comments-list]"),
    "comments list",
  );
  const loginButton = requireElement(
    document.querySelector<HTMLButtonElement>("[data-comments-login]"),
    "login button",
  );
  const logoutButton = requireElement(
    document.querySelector<HTMLButtonElement>("[data-comments-logout]"),
    "logout button",
  );
  const exportButton = document.querySelector<HTMLButtonElement>(
    "[data-comments-export]",
  );
  const viewControl = document.querySelector<HTMLElement>(
    "[data-comments-view-control]",
  );
  const viewSelect = document.querySelector<HTMLSelectElement>(
    "[data-comments-view]",
  );
  const commentButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-comment-button]"),
  );
  const stuckButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-stuck-button]"),
  );
  const reflectionButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-reflection-button]"),
  );
  let auth: FeedbackAuth = { authenticated: false, admin: false };
  let comments: FeedbackComment[] = [];
  let activeFeedbackParagraphId: string | null = null;
  let viewMode = localStorage.getItem("comments-view-mode") || "admin";

  initComments();

  async function initComments() {
    try {
      auth = await fetchJson<FeedbackAuth>("/api/auth/status");
      if (commentsControls) {
        commentsControls.hidden = false;
      }
      document.documentElement.dataset.commentsReady = auth.authenticated
        ? "true"
        : "false";
      document.documentElement.dataset.commentsAdmin = auth.admin
        ? "true"
        : "false";
      updateAuthControls();
      updateViewControl();
      syncPreviewMode();
      await loadComments();
      wireParagraphSelection();
      wireParagraphButtons();
      wireStuckButtons();
      wireReflectionButtons();
    } catch {
      panelRoot.hidden = true;
      if (commentsControls) {
        commentsControls.hidden = true;
      }
    }
  }

  function updateAuthControls() {
    if (auth.authenticated) {
      const name = auth.user?.login || "GitHub";
      setStatus(`Feedback: ${name}`);
      status.title = auth.admin
        ? auth.local
          ? `Signed in as ${name}. Local resolution mode is available.`
          : `Signed in as ${name}. Resolution controls are available.`
        : `Signed in as ${name}. Select a paragraph to comment.`;
      loginButton.hidden = true;
      logoutButton.hidden = false;
      return;
    }

    status.title = "";
    setStatus(
      auth.available === false
        ? "Feedback login is not configured yet."
        : "Feedback",
    );
    loginButton.hidden = auth.available === false || !auth.loginUrl;
    logoutButton.hidden = true;
  }

  function updateViewControl() {
    if (!viewControl || !viewSelect) {
      return;
    }

    viewControl.hidden = !auth.admin;
    if (exportButton) {
      exportButton.hidden = !auth.admin;
    }

    if (!auth.admin) {
      viewMode = "student";
      return;
    }

    if (!["admin", "student", "public"].includes(viewMode)) {
      viewMode = "admin";
    }

    viewSelect.value = viewMode;
  }

  viewSelect?.addEventListener("change", () => {
    viewMode = viewSelect.value;
    localStorage.setItem("comments-view-mode", viewMode);
    syncPreviewMode();
    renderCommentList();
    updateParagraphBadges();
    if (activeFeedbackParagraphId) {
      renderParagraphFeedbackPanel(activeFeedbackParagraphId);
    }
  });

  loginButton.addEventListener("click", () => {
    if (auth.loginUrl) {
      location.href = auth.loginUrl;
    }
  });

  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    location.reload();
  });

  exportButton?.addEventListener("click", () => {
    downloadFeedbackSummary();
  });

  async function loadComments() {
    comments = await fetchJson<FeedbackComment[]>(
      `/api/comments?chapter=${encodeURIComponent(chapterSlug)}`,
    );
    renderCommentList();
    updateParagraphBadges();
    if (activeFeedbackParagraphId) {
      renderParagraphFeedbackPanel(activeFeedbackParagraphId);
    }
  }

  function syncPreviewMode() {
    document.documentElement.dataset.commentsPreview = auth.admin
      ? viewMode
      : "";
  }

  function wireParagraphButtons() {
    for (const button of commentButtons) {
      button.addEventListener("click", () => {
        const paragraphId = button.dataset.commentButton;

        if (!auth.authenticated && !auth.admin) {
          (commentsControls || panelRoot).scrollIntoView({
            block: "start",
          });
          setStatus("Sign in with GitHub before commenting.");
          return;
        }

        if (paragraphId) {
          openForm(paragraphId);
        }
      });
    }
  }

  function wireParagraphSelection() {
    for (const paragraph of document.querySelectorAll(
      "[data-comment-target]",
    )) {
      paragraph.addEventListener("click", (event) => {
        if (
          event.target instanceof Element &&
          event.target.closest("a, button, input, label, select, textarea")
        ) {
          return;
        }

        if (window.getSelection()?.toString()) {
          return;
        }

        selectParagraph(paragraph);
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        clearSelectedParagraph();
      }
    });
  }

  function selectParagraph(paragraph: Element): void {
    clearSelectedParagraph();
    paragraph.classList.add("is-feedback-selected");
  }

  function clearSelectedParagraph() {
    document
      .querySelector("[data-comment-target].is-feedback-selected")
      ?.classList.remove("is-feedback-selected");
  }

  function wireStuckButtons() {
    for (const button of stuckButtons) {
      button.addEventListener("click", async () => {
        const paragraphId = button.dataset.stuckButton;

        if (!auth.authenticated && !auth.admin) {
          (commentsControls || panelRoot).scrollIntoView({
            block: "start",
          });
          setStatus("Sign in with GitHub before marking confusion.");
          return;
        }

        if (!paragraphId) {
          return;
        }

        if (hasOwnActiveStuckMarker(paragraphId)) {
          showParagraphFeedbackPanel(paragraphId);
          setStatus("Already marked as stuck.");
          return;
        }

        button.disabled = true;

        try {
          await fetchJson("/api/stuck", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chapter: chapterSlug, paragraphId }),
          });
          await loadComments();
          showParagraphFeedbackPanel(paragraphId);
          setStatus("Marked as stuck.");
        } catch (error) {
          setStatus(errorMessage(error));
        } finally {
          button.disabled = false;
        }
      });
    }
  }

  function openForm(paragraphId: string): void {
    document.querySelector("[data-comment-form]")?.remove();
    closeParagraphFeedbackPanel();
    const paragraph = document.querySelector<HTMLElement>(
      `[data-comment-target="${cssEscape(paragraphId)}"]`,
    );

    if (!paragraph) {
      return;
    }

    const form = document.createElement("form") as CommentForm;
    form.className = "paragraph-comment-form";
    form.dataset.commentForm = paragraphId;
    form.innerHTML = `
      <label>
        <span>Category</span>
        <select name="category" required>
          ${feedbackCategories.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
        </select>
      </label>
      <textarea name="body" required maxlength="4000" aria-label="Comment text"></textarea>
      <label class="inline-option">
        <input type="checkbox" name="anonymous" />
        <span>Show as anonymous to teacher</span>
      </label>
      <div>
        <button type="submit">Post comment</button>
        <button type="button" data-comment-cancel>Cancel</button>
      </div>
    `;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const textarea = form.elements.body;
      const category = form.elements.category.value;
      const anonymous = form.elements.anonymous.checked;
      const body = textarea.value.trim();

      if (!body) {
        return;
      }

      const submit = requireElement(
        form.querySelector<HTMLButtonElement>("button"),
        "comment submit button",
      );
      submit.disabled = true;

      try {
        await fetchJson("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chapter: chapterSlug,
            paragraphId,
            category,
            anonymous,
            body,
          }),
        });
        form.remove();
        await loadComments();
        showParagraphFeedbackPanel(paragraphId);
        setStatus("Comment posted.");
      } catch (error) {
        setStatus(errorMessage(error));
        submit.disabled = false;
      }
    });

    requireElement(
      form.querySelector<HTMLButtonElement>("[data-comment-cancel]"),
      "comment cancel button",
    ).addEventListener("click", () => {
      form.remove();
    });

    positionCommentForm(form, paragraph);
    paragraph.insertAdjacentElement("afterend", form);
    form.elements.body.focus();
  }

  function positionCommentForm(form: HTMLElement, paragraph: Element): void {
    const rect = paragraph.getBoundingClientRect();
    const top = Math.max(84, Math.min(rect.top, window.innerHeight - 420));

    form.style.setProperty("--comment-form-top", `${top}px`);
  }

  function showParagraphFeedbackPanel(paragraphId: string): void {
    activeFeedbackParagraphId = paragraphId;
    document.querySelector("[data-comment-form]")?.remove();
    renderParagraphFeedbackPanel(paragraphId);
  }

  function renderParagraphFeedbackPanel(paragraphId: string): void {
    closeParagraphFeedbackPanel(false);

    const paragraph = document.querySelector<HTMLElement>(
      `[data-comment-target="${cssEscape(paragraphId)}"]`,
    );

    if (!paragraph) {
      activeFeedbackParagraphId = null;
      return;
    }

    const relatedComments = getVisibleComments().filter(
      (comment) => comment.paragraphId === paragraphId,
    );
    const panel = document.createElement("aside");
    panel.className = "paragraph-feedback-panel";
    panel.dataset.paragraphFeedbackPanel = paragraphId;

    const header = document.createElement("div");
    header.className = "paragraph-feedback-panel-header";
    const title = document.createElement("h3");
    title.textContent = "Related feedback";
    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Close related feedback");
    close.textContent = "Close";
    close.addEventListener("click", () => closeParagraphFeedbackPanel());
    header.append(title, close);
    panel.append(header);

    if (!relatedComments.length) {
      const empty = document.createElement("p");
      empty.textContent = "No visible feedback for this paragraph yet.";
      panel.append(empty);
    }

    for (const comment of relatedComments) {
      panel.append(renderCompactComment(comment));
    }

    positionCommentForm(panel, paragraph);
    paragraph.insertAdjacentElement("afterend", panel);
  }

  function closeParagraphFeedbackPanel(resetActive = true) {
    document.querySelector("[data-paragraph-feedback-panel]")?.remove();
    if (resetActive) {
      activeFeedbackParagraphId = null;
    }
  }

  function renderCompactComment(comment: FeedbackComment): HTMLElement {
    const card = document.createElement("article");
    card.className = "comment-card paragraph-feedback-card";
    card.classList.toggle("is-featured", Boolean(comment.publicNote));
    card.innerHTML = `
      <div class="comment-meta">
        <strong></strong>
        <span></span>
      </div>
      <p></p>
    `;
    requireElement(card.querySelector("strong"), "comment author").textContent =
      displayAuthor(comment);
    requireElement(card.querySelector("span"), "comment date").textContent =
      new Date(comment.createdAt).toLocaleString();
    requireElement(card.querySelector("p"), "comment body").textContent =
      comment.body;
    renderCategory(card, comment.category);
    renderReplies(card, comment);

    return card;
  }

  function renderCommentList() {
    const visibleComments = getVisibleComments();
    list.innerHTML = "";
    panelRoot.hidden = visibleComments.length === 0;

    if (!visibleComments.length) {
      renderAdminSummary();
      return;
    }

    renderAdminSummary();

    const byParagraph = groupByParagraph(visibleComments);

    for (const [paragraphId, threadComments] of byParagraph) {
      const thread = document.createElement("section");
      thread.className = "comment-thread";
      const anchor = document.createElement("a");
      anchor.href = `#${paragraphId}`;
      anchor.textContent = paragraphLabel(paragraphId);
      const title = document.createElement("h3");
      title.append(anchor);
      thread.append(title);

      for (const comment of threadComments) {
        const card = document.createElement("article");
        card.className = "comment-card";
        card.classList.toggle("is-hidden", Boolean(comment.hiddenAt));
        card.classList.toggle("is-featured", Boolean(comment.publicNote));
        card.innerHTML = `
          <div class="comment-meta">
            <strong></strong>
            <span></span>
          </div>
          <p></p>
        `;
        requireElement(
          card.querySelector("strong"),
          "comment author",
        ).textContent = displayAuthor(comment);
        requireElement(card.querySelector("span"), "comment date").textContent =
          new Date(comment.createdAt).toLocaleString();
        requireElement(card.querySelector("p"), "comment body").textContent =
          comment.body;
        renderCategory(card, comment.category);

        if (comment.publicNote) {
          const featured = document.createElement("em");
          featured.textContent = "Featured";
          requireElement(
            card.querySelector<HTMLElement>(".comment-meta"),
            "comment meta",
          ).append(featured);
        }

        renderReplies(card, comment);

        if (auth.admin && viewMode === "admin" && !comment.publicNote) {
          if (comment.hiddenAt) {
            const hidden = document.createElement("em");
            hidden.textContent = `Hidden by ${comment.hiddenBy || "admin"}`;
            requireElement(
              card.querySelector<HTMLElement>(".comment-meta"),
              "comment meta",
            ).append(hidden);
          }

          if (!comment.hiddenAt) {
            const reply = document.createElement("button");
            reply.type = "button";
            reply.textContent = "Reply";
            reply.addEventListener("click", () => replyToComment(comment.id));
            card.append(reply);

            const feature = document.createElement("button");
            feature.type = "button";
            feature.textContent = comment.featuredAt ? "Unfeature" : "Feature";
            feature.addEventListener("click", () =>
              comment.featuredAt
                ? unfeatureComment(comment.id)
                : featureComment(comment),
            );
            card.append(feature);

            if (auth.local && comment.featuredAt) {
              const promote = document.createElement("button");
              promote.type = "button";
              promote.textContent = "Promote";
              promote.addEventListener("click", () =>
                promoteClarification(comment),
              );
              card.append(promote);
            }

            const hide = document.createElement("button");
            hide.type = "button";
            hide.textContent = "Hide";
            hide.addEventListener("click", () => hideComment(comment.id));
            card.append(hide);
          }

          const resolve = document.createElement("button");
          resolve.type = "button";
          resolve.textContent = "Resolve";
          resolve.addEventListener("click", () => resolveComment(comment.id));
          card.append(resolve);
        }

        thread.append(card);
      }

      list.append(thread);
    }
  }

  function wireReflectionButtons() {
    for (const button of reflectionButtons) {
      button.addEventListener("click", async () => {
        if (!auth.authenticated && !auth.admin) {
          (commentsControls || panelRoot).scrollIntoView({
            block: "start",
          });
          setStatus("Sign in with GitHub before adding a reflection.");
          return;
        }

        const prompt = button.dataset.reflectionButton || "";
        const body = window.prompt(prompt);

        if (!body?.trim()) {
          return;
        }

        await fetchJson("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chapter: chapterSlug,
            paragraphId: "p-chapter-reflection",
            category: "reflection",
            body,
          }),
        });
        await loadComments();
        setStatus("Reflection posted.");
      });
    }
  }

  function renderAdminSummary() {
    if (!auth.admin || viewMode !== "admin") {
      return;
    }

    panelRoot.hidden = false;
    const summary = document.createElement("section");
    summary.className = "feedback-summary";
    const unresolved = comments.filter((comment) => !comment.resolvedAt);
    const stuck = unresolved.filter((comment) => comment.type === "stuck");
    const categoryCounts = countBy(
      unresolved,
      (comment) => comment.category || "uncategorized",
    );
    const paragraphCounts = countBy(
      unresolved,
      (comment) => comment.paragraphId,
    );
    const hotParagraphs = [...paragraphCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    summary.innerHTML = `
      <h3>Feedback summary</h3>
      <p>${unresolved.length} unresolved item${unresolved.length === 1 ? "" : "s"} · ${stuck.length} stuck marker${stuck.length === 1 ? "" : "s"}</p>
      <div class="feedback-summary-grid">
        <div>
          <strong>Categories</strong>
          <ul>${[...categoryCounts.entries()].map(([category, count]) => `<li>${escapeHtml(labelFor(feedbackCategories, category) || category)}: ${count}</li>`).join("")}</ul>
        </div>
        <div>
          <strong>Hot paragraphs</strong>
          <ul>${hotParagraphs.map(([paragraphId, count]) => `<li><a href="#${paragraphId}">${escapeHtml(paragraphLabel(paragraphId))}</a>: ${count}</li>`).join("")}</ul>
        </div>
      </div>
    `;
    list.prepend(summary);
  }

  function renderReplies(card: HTMLElement, comment: FeedbackComment): void {
    const replies = Array.isArray(comment.replies) ? comment.replies : [];

    if (!replies.length) {
      return;
    }

    const replyList = document.createElement("div");
    replyList.className = "comment-replies";

    for (const reply of replies) {
      const item = document.createElement("article");
      item.className = "comment-reply";
      item.innerHTML = `
        <div class="comment-meta">
          <strong></strong>
          <span></span>
        </div>
        <p></p>
      `;
      requireElement(item.querySelector("strong"), "reply author").textContent =
        reply.author?.login || "Book author";
      requireElement(item.querySelector("span"), "reply date").textContent =
        new Date(reply.createdAt).toLocaleString();
      requireElement(item.querySelector("p"), "reply body").textContent =
        reply.body;
      replyList.append(item);
    }

    card.append(replyList);
  }

  function renderCategory(
    card: HTMLElement,
    category: string | undefined,
  ): void {
    const label = labelFor(feedbackCategories, category);

    if (!label) {
      return;
    }

    const tag = document.createElement("em");
    tag.textContent = label;
    requireElement(
      card.querySelector<HTMLElement>(".comment-meta"),
      "comment meta",
    ).append(tag);
  }

  function getVisibleComments(): FeedbackComment[] {
    if (auth.admin && viewMode === "admin") {
      return comments.filter(
        (comment) => !comment.resolvedAt || comment.featuredAt,
      );
    }

    if (auth.admin && viewMode === "public") {
      return publicNotesFromComments(comments);
    }

    const userLogin = auth.user?.login;

    if (!userLogin) {
      return publicNotesFromComments(comments);
    }

    const own = comments.filter(
      (comment) =>
        !comment.hiddenAt &&
        comment.author?.login === userLogin &&
        (!comment.resolvedAt || comment.featuredAt),
    );
    const ownIds = new Set(own.map((comment) => comment.id));

    return [
      ...own,
      ...publicNotesFromComments(comments).filter(
        (comment) => !comment.sourceId || !ownIds.has(comment.sourceId),
      ),
    ];
  }

  function publicNotesFromComments(
    items: FeedbackComment[],
  ): FeedbackComment[] {
    return items.filter(hasPublicNote).map(
      (comment): FeedbackComment => ({
        id: `featured-${comment.id}`,
        sourceId: comment.id,
        chapter: comment.chapter,
        paragraphId: comment.paragraphId,
        body: comment.featuredText || comment.body,
        author: { login: "Reader note", avatarUrl: null, url: null },
        createdAt: comment.featuredAt,
        featuredAt: comment.featuredAt,
        publicNote: true,
        replies: [],
      }),
    );
  }

  function hasPublicNote(
    comment: FeedbackComment,
  ): comment is FeedbackComment & { featuredAt: string } {
    return Boolean(comment.featuredAt) && !comment.hiddenAt;
  }

  async function resolveComment(id: string): Promise<void> {
    const reason = window.prompt(
      `Resolution reason: ${resolutionReasons.map(([, label]) => label).join(", ")}`,
      "fixed",
    );

    if (!reason?.trim()) {
      return;
    }

    await fetchJson(`/api/comments/${encodeURIComponent(id)}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    await loadComments();
    setStatus("Comment resolved.");
  }

  async function hideComment(id: string): Promise<void> {
    await fetchJson(`/api/comments/${encodeURIComponent(id)}/hide`, {
      method: "POST",
    });
    await loadComments();
    setStatus("Comment hidden.");
  }

  async function replyToComment(id: string): Promise<void> {
    const body = window.prompt("Reply to this comment");

    if (!body?.trim()) {
      return;
    }

    await fetchJson(`/api/comments/${encodeURIComponent(id)}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    await loadComments();
    setStatus("Reply posted.");
  }

  async function featureComment(comment: FeedbackComment): Promise<void> {
    const featuredText = window.prompt(
      "Public note to show to readers",
      comment.featuredText || comment.body,
    );

    if (!featuredText?.trim()) {
      return;
    }

    await fetchJson(`/api/comments/${encodeURIComponent(comment.id)}/feature`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featuredText }),
    });
    await loadComments();
    setStatus("Comment featured.");
  }

  async function unfeatureComment(id: string): Promise<void> {
    await fetchJson(`/api/comments/${encodeURIComponent(id)}/unfeature`, {
      method: "POST",
    });
    await loadComments();
    setStatus("Comment unfeatured.");
  }

  async function promoteClarification(comment: FeedbackComment): Promise<void> {
    const text = window.prompt(
      "Clarification text to append to the chapter Markdown",
      comment.featuredText || comment.body,
    );

    if (!text?.trim()) {
      return;
    }

    const chapter = await fetchJson<ChapterSource>(
      `/api/chapters/${encodeURIComponent(chapterSlug)}`,
    );
    await fetchJson(`/api/chapters/${encodeURIComponent(chapterSlug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: appendClarification(chapter.content, text),
      }),
    });
    setStatus("Clarification appended to Markdown.");
  }

  function updateParagraphBadges(): void {
    const counts = getVisibleComments().reduce<Map<string, number>>(
      (result, comment) => {
        if (!comment.resolvedAt || comment.featuredAt) {
          result.set(
            comment.paragraphId,
            (result.get(comment.paragraphId) || 0) + 1,
          );
        }

        return result;
      },
      new Map(),
    );

    for (const button of commentButtons) {
      const count = counts.get(button.dataset.commentButton || "") || 0;
      button.classList.toggle("has-comments", count > 0);
      button.dataset.commentCount = count > 0 ? String(count) : "";
      button.setAttribute(
        "aria-label",
        count > 0
          ? `Comment on this paragraph. ${count} unresolved ${count === 1 ? "comment" : "comments"}.`
          : "Comment on this paragraph",
      );
    }

    const stuckCounts = getVisibleComments()
      .filter((comment) => comment.type === "stuck" && !comment.resolvedAt)
      .reduce<Map<string, number>>((result, comment) => {
        result.set(
          comment.paragraphId,
          (result.get(comment.paragraphId) || 0) + 1,
        );

        return result;
      }, new Map());

    for (const button of stuckButtons) {
      const paragraphId = button.dataset.stuckButton || "";
      const count = stuckCounts.get(paragraphId) || 0;
      button.classList.toggle("has-comments", count > 0);
      button.classList.toggle(
        "is-active",
        hasOwnActiveStuckMarker(paragraphId),
      );
      button.dataset.commentCount = count > 0 ? String(count) : "";
    }
  }

  function hasOwnActiveStuckMarker(paragraphId: string): boolean {
    const userLogin = auth.user?.login;

    if (!userLogin) {
      return false;
    }

    return comments.some(
      (comment) =>
        comment.type === "stuck" &&
        !comment.resolvedAt &&
        !comment.hiddenAt &&
        comment.paragraphId === paragraphId &&
        comment.author?.login === userLogin,
    );
  }

  function groupByParagraph(
    items: FeedbackComment[],
  ): Map<string, FeedbackComment[]> {
    const grouped = new Map<string, FeedbackComment[]>();

    for (const item of items) {
      const group = grouped.get(item.paragraphId) || [];
      group.push(item);
      grouped.set(item.paragraphId, group);
    }

    return grouped;
  }

  function labelFor(options: FeedbackOption[], value: string | undefined) {
    return options.find(([option]) => option === value)?.[1] || "";
  }

  function countBy<T>(
    items: T[],
    getKey: (item: T) => string,
  ): Map<string, number> {
    return items.reduce<Map<string, number>>((result, item) => {
      const key = getKey(item);
      result.set(key, (result.get(key) || 0) + 1);
      return result;
    }, new Map());
  }

  function downloadFeedbackSummary() {
    const lines = [
      `# Feedback summary for ${chapterSlug}`,
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
    ];

    for (const comment of comments) {
      lines.push(`## ${paragraphLabel(comment.paragraphId)}`);
      lines.push(`- Type: ${comment.type || "comment"}`);
      lines.push(
        `- Category: ${labelFor(feedbackCategories, comment.category) || comment.category || "Uncategorized"}`,
      );
      lines.push(`- Author: ${comment.author?.login || "Unknown"}`);
      lines.push(`- Created: ${comment.createdAt}`);
      lines.push(
        `- Status: ${
          comment.resolvedAt
            ? `resolved (${comment.resolutionReason || "no reason"})`
            : "unresolved"
        }`,
      );
      lines.push("");
      lines.push(comment.body || "");
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${chapterSlug}-feedback-summary.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function appendClarification(source: string, text: string): string {
    const block = `\n\n> **Clarification:** ${text.trim().replace(/\n+/g, "\n> ")}\n`;
    const marker = "\n---\n";
    const markerIndex = source.lastIndexOf(marker);

    if (markerIndex === -1) {
      return `${source.trimEnd()}${block}\n`;
    }

    return `${source.slice(0, markerIndex).trimEnd()}${block}${source.slice(markerIndex)}`;
  }

  function escapeHtml(value: unknown): string {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data as T;
  }

  function requireElement<T extends HTMLElement>(
    element: T | null,
    name: string,
  ): T {
    if (!element) {
      throw new Error(`Missing ${name}`);
    }

    return element;
  }

  function paragraphLabel(paragraphId: string): string {
    if (paragraphId === "p-chapter-reflection") {
      return "Chapter reflection";
    }

    return `Paragraph ${commentButtons.findIndex((button) => button.dataset.commentButton === paragraphId) + 1}`;
  }

  function displayAuthor(comment: FeedbackComment): string {
    return comment.anonymous
      ? "Anonymous student"
      : comment.author?.login || "GitHub user";
  }

  function cssEscape(value: string): string {
    return "CSS" in window && typeof CSS.escape === "function"
      ? CSS.escape(value)
      : value.replace(/"/g, '\\"');
  }

  function setStatus(message: string): void {
    status.textContent = message;
  }

  function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Request failed";
  }
}
