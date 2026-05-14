const commentsPanel = document.querySelector("[data-comments-panel]");

if (commentsPanel) {
  const commentsControls = document.querySelector("[data-comments-controls]");
  const chapterSlug = commentsPanel.dataset.chapterSlug;
  const status = document.querySelector("[data-comments-status]");
  const list = commentsPanel.querySelector("[data-comments-list]");
  const loginButton = document.querySelector("[data-comments-login]");
  const logoutButton = document.querySelector("[data-comments-logout]");
  const commentButtons = Array.from(
    document.querySelectorAll("[data-comment-button]"),
  );
  let auth = { authenticated: false, admin: false };
  let comments = [];

  initComments();

  async function initComments() {
    try {
      auth = await fetchJson("/api/auth/status");
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
      await loadComments();
      wireParagraphButtons();
    } catch {
      commentsPanel.hidden = true;
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

  loginButton.addEventListener("click", () => {
    if (auth.loginUrl) {
      location.href = auth.loginUrl;
    }
  });

  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    location.reload();
  });

  async function loadComments() {
    comments = await fetchJson(
      `/api/comments?chapter=${encodeURIComponent(chapterSlug)}`,
    );
    renderCommentList();
    updateParagraphBadges();
  }

  function wireParagraphButtons() {
    for (const button of commentButtons) {
      button.addEventListener("click", () => {
        const paragraphId = button.dataset.commentButton;

        if (!auth.authenticated && !auth.admin) {
          (commentsControls || commentsPanel).scrollIntoView({
            block: "start",
          });
          setStatus("Sign in with GitHub before commenting.");
          return;
        }

        openForm(paragraphId);
      });
    }
  }

  function openForm(paragraphId) {
    document.querySelector("[data-comment-form]")?.remove();
    const paragraph = document.querySelector(
      `[data-comment-target="${cssEscape(paragraphId)}"]`,
    );

    if (!paragraph) {
      return;
    }

    const form = document.createElement("form");
    form.className = "paragraph-comment-form";
    form.dataset.commentForm = paragraphId;
    form.innerHTML = `
      <textarea name="body" required maxlength="4000" aria-label="Comment text"></textarea>
      <div>
        <button type="submit">Post comment</button>
        <button type="button" data-comment-cancel>Cancel</button>
      </div>
    `;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const textarea = form.elements.body;
      const body = textarea.value.trim();

      if (!body) {
        return;
      }

      form.querySelector("button").disabled = true;

      try {
        await fetchJson("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapter: chapterSlug, paragraphId, body }),
        });
        form.remove();
        await loadComments();
        setStatus("Comment posted.");
      } catch (error) {
        setStatus(error.message);
        form.querySelector("button").disabled = false;
      }
    });

    form
      .querySelector("[data-comment-cancel]")
      .addEventListener("click", () => {
        form.remove();
      });

    paragraph.insertAdjacentElement("afterend", form);
    form.elements.body.focus();
  }

  function renderCommentList() {
    const visibleComments = comments.filter(
      (comment) =>
        (!comment.resolvedAt || comment.featuredAt) &&
        (!comment.hiddenAt || auth.admin),
    );
    list.innerHTML = "";
    commentsPanel.hidden = visibleComments.length === 0;

    if (!visibleComments.length) {
      return;
    }

    const byParagraph = Map.groupBy
      ? Map.groupBy(visibleComments, (comment) => comment.paragraphId)
      : groupByParagraph(visibleComments);

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
        card.querySelector("strong").textContent =
          comment.author?.login || "GitHub user";
        card.querySelector("span").textContent = new Date(
          comment.createdAt,
        ).toLocaleString();
        card.querySelector("p").textContent = comment.body;

        if (comment.publicNote) {
          const featured = document.createElement("em");
          featured.textContent = "Featured";
          card.querySelector(".comment-meta").append(featured);
        }

        renderReplies(card, comment);

        if (auth.admin) {
          if (comment.hiddenAt) {
            const hidden = document.createElement("em");
            hidden.textContent = `Hidden by ${comment.hiddenBy || "admin"}`;
            card.querySelector(".comment-meta").append(hidden);
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

  function renderReplies(card, comment) {
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
      item.querySelector("strong").textContent =
        reply.author?.login || "Book author";
      item.querySelector("span").textContent = new Date(
        reply.createdAt,
      ).toLocaleString();
      item.querySelector("p").textContent = reply.body;
      replyList.append(item);
    }

    card.append(replyList);
  }

  async function resolveComment(id) {
    await fetchJson(`/api/comments/${encodeURIComponent(id)}/resolve`, {
      method: "POST",
    });
    await loadComments();
    setStatus("Comment resolved.");
  }

  async function hideComment(id) {
    await fetchJson(`/api/comments/${encodeURIComponent(id)}/hide`, {
      method: "POST",
    });
    await loadComments();
    setStatus("Comment hidden.");
  }

  async function replyToComment(id) {
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

  async function featureComment(comment) {
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

  async function unfeatureComment(id) {
    await fetchJson(`/api/comments/${encodeURIComponent(id)}/unfeature`, {
      method: "POST",
    });
    await loadComments();
    setStatus("Comment unfeatured.");
  }

  function updateParagraphBadges() {
    const counts = comments
      .filter(
        (comment) =>
          (!comment.resolvedAt || comment.featuredAt) && !comment.hiddenAt,
      )
      .reduce((result, comment) => {
        result.set(
          comment.paragraphId,
          (result.get(comment.paragraphId) || 0) + 1,
        );
        return result;
      }, new Map());

    for (const button of commentButtons) {
      const count = counts.get(button.dataset.commentButton) || 0;
      button.classList.toggle("has-comments", count > 0);
      button.dataset.commentCount = count > 0 ? String(count) : "";
      button.setAttribute(
        "aria-label",
        count > 0
          ? `Comment on this paragraph. ${count} unresolved ${count === 1 ? "comment" : "comments"}.`
          : "Comment on this paragraph",
      );
    }
  }

  function groupByParagraph(items) {
    const grouped = new Map();

    for (const item of items) {
      const group = grouped.get(item.paragraphId) || [];
      group.push(item);
      grouped.set(item.paragraphId, group);
    }

    return grouped;
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  function paragraphLabel(paragraphId) {
    return `Paragraph ${commentButtons.findIndex((button) => button.dataset.commentButton === paragraphId) + 1}`;
  }

  function cssEscape(value) {
    return window.CSS?.escape ? CSS.escape(value) : value.replace(/"/g, '\\"');
  }

  function setStatus(message) {
    status.textContent = message;
  }
}
