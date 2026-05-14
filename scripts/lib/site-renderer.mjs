import { renderHtmlisp } from "./htmlisp.mjs";
import { escapeAttribute, escapeHtml, slugify } from "./text.mjs";

export function createSiteRenderer({
  chapters,
  config,
  indexChapters,
  indexPartPages,
  partMetadata,
  templates,
}) {
  return {
    renderBookPage,
    renderHome,
    renderLayout,
  };

  function renderHome() {
    const firstChapter = chapters[0];

    return renderHtmlisp(templates.siteIndex, {
      bookContents: renderHomeContents(),
      coverAlt: "Cover of Elements of Scalable Web Applications",
      coverImageUrl: "/assets/book-cover.svg",
      title: config.title,
      description: config.description,
      course: config.course,
      firstChapterUrl: firstChapter.url,
    });
  }

  function renderBookPage({ page, rendered, previous, next }) {
    return renderHtmlisp(templates.bookPage, {
      bookSidebar: renderBookSidebar(page),
      chapterFile: page.file,
      chapterLabel: page.label,
      chapterSlug: page.slug,
      content: rendered.content,
      localToc: renderLocalToc(rendered.tableOfContents),
      nextLink: renderPaginationLink(next, "Next", "next"),
      previousLink: renderPaginationLink(previous, "Previous", "prev"),
    });
  }

  function renderLayout({
    title,
    description,
    currentUrl,
    stylesheets = [],
    scripts = [],
    children,
  }) {
    const canonicalUrl = `https://${config.domain}${currentUrl}`;

    return renderHtmlisp(templates.baseLayout, {
      authorName: config.author.name,
      authorUrl: config.author.url,
      canonicalUrl,
      children,
      description,
      scriptTags: scripts
        .map((src) => `<script src="${escapeAttribute(src)}" defer></script>`)
        .join("\n"),
      siteTitle: config.title,
      stylesheetTags: stylesheets
        .map(
          (href) => `<link rel="stylesheet" href="${escapeAttribute(href)}" />`,
        )
        .join("\n"),
      themes: config.themes,
      title,
    });
  }

  function renderBookSidebar(currentChapter) {
    return renderHtmlisp(templates.bookContentsSidebar, {
      bookContents: renderSidebarContents(currentChapter),
    });
  }

  function renderHomeContents() {
    return renderChapterParts({
      chapters: indexChapters,
      currentChapter: null,
      mode: "home",
    });
  }

  function renderSidebarContents(currentChapter) {
    return renderChapterParts({
      chapters: indexChapters,
      currentChapter,
      mode: "sidebar",
    });
  }

  function renderChapterParts({ chapters, currentChapter, mode }) {
    const chapterByFile = new Map(
      chapters.map((chapter) => [chapter.file, chapter]),
    );
    const partPageByFile = new Map(
      indexPartPages.map((partPage) => [partPage.file, partPage]),
    );
    const assignedFiles = new Set();
    const parts = partMetadata.parts.map((part) => {
      const partPage = part.file ? partPageByFile.get(part.file) : null;
      const partChapters = part.chapters
        .map((file) => chapterByFile.get(file))
        .filter(Boolean);

      for (const chapter of partChapters) {
        assignedFiles.add(chapter.file);
      }

      return {
        ...part,
        partPage,
        chapters: partChapters,
      };
    });
    const unassignedChapters = chapters.filter(
      (chapter) => !assignedFiles.has(chapter.file),
    );

    if (unassignedChapters.length > 0) {
      parts.unshift({
        number: "",
        title: "Front matter",
        description: "",
        chapters: unassignedChapters,
      });
    }

    return parts
      .filter((part) => part.chapters.length > 0)
      .map((part) =>
        mode === "home"
          ? renderHomePart(part)
          : renderSidebarPart(part, currentChapter),
      )
      .join("\n");
  }

  function renderHomePart(part) {
    const heading = part.number
      ? `Part ${part.number}: ${part.title}`
      : part.title;
    const headingContent = part.partPage
      ? `<a href="${escapeAttribute(part.partPage.url)}">${escapeHtml(heading)}</a>`
      : escapeHtml(heading);

    return `<section class="book-part" aria-labelledby="${slugify(heading)}-heading">
  <div class="book-part-header">
    <h3 id="${slugify(heading)}-heading">${headingContent}</h3>
  </div>
  <ol class="chapter-grid">
    ${part.chapters.map(renderHomeChapter).join("\n    ")}
  </ol>
</section>`;
  }

  function renderHomeChapter(chapter) {
    const label =
      chapter.label ||
      (chapter.number === "0" ? "Introduction" : `Chapter ${chapter.number}`);
    const status = chapter.status
      ? `<em>${escapeHtml(chapter.status)}</em>`
      : "";
    const inner = `<span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(chapter.title)}</strong>
      ${status}`;

    if (!chapter.published) {
      return `<li class="${escapeAttribute(chapter.className)}"><span class="chapter-card" aria-disabled="true">
      ${inner}
    </span></li>`;
    }

    return `<li class="${escapeAttribute(chapter.className)}"><a href="${escapeAttribute(chapter.url)}">
      ${inner}
    </a></li>`;
  }

  function renderSidebarPart(part, currentChapter) {
    const heading = part.number
      ? `Part ${part.number}: ${part.title}`
      : part.title;
    const headingContent = part.partPage
      ? `<a href="${escapeAttribute(part.partPage.url)}"${
          part.partPage.slug === currentChapter.slug
            ? ' aria-current="page"'
            : ""
        }>${escapeHtml(heading)}</a>`
      : escapeHtml(heading);

    return `<section class="book-sidebar-part">
  <h2>${headingContent}</h2>
  <ol>
    ${part.chapters.map((chapter) => renderSidebarChapter(chapter, currentChapter)).join("\n    ")}
  </ol>
</section>`;
  }

  function renderSidebarChapter(chapter, currentChapter) {
    const ariaCurrent =
      chapter.slug === currentChapter.slug ? ' aria-current="page"' : "";
    const number =
      chapter.kind === "part"
        ? chapter.label
        : chapter.number === "0"
          ? "Intro"
          : chapter.number;
    const inner =
      chapter.kind === "part"
        ? `<span class="book-sidebar-part-link">${escapeHtml(`${number}: ${chapter.title}`)}</span>`
        : `<span>${escapeHtml(number)}</span><span>${escapeHtml(chapter.title)}</span>`;

    if (!chapter.published) {
      return `<li><span class="book-sidebar-disabled" aria-disabled="true">${inner}</span></li>`;
    }

    return `<li><a href="${escapeAttribute(chapter.url)}"${ariaCurrent}>${inner}</a></li>`;
  }

  function renderLocalToc(tableOfContents) {
    const headings = tableOfContents.filter(
      (item) => item.level > 1 && item.level < 4,
    );

    return renderHtmlisp(templates.localTableOfContents, {
      headings: headings.map((item) => ({
        ...item,
        className: `toc-level-${item.level}`,
        href: `#${item.slug}`,
      })),
    });
  }

  function renderPaginationLink(chapter, label, rel) {
    if (!chapter) {
      return "<span></span>";
    }

    return renderHtmlisp(templates.paginationLink, {
      label,
      rel,
      title: chapter.title,
      url: chapter.url,
    });
  }
}
