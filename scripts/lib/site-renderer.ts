import { renderHtmlisp } from "./htmlisp.ts";
import { escapeAttribute, escapeHtml, slugify } from "./text.ts";
import type { RenderedMarkdown, TableOfContentsItem } from "./markdown.ts";

type SiteConfig = {
  author: { name: string; url: string };
  course: unknown;
  description: string;
  domain: string;
  themes: unknown;
  title: string;
};
export type BookPage = {
  ariaDisabled?: string | null;
  className?: string;
  collection: string;
  createdAt?: string;
  file: string;
  index?: number;
  kind: string;
  label: string;
  number: string;
  part?: PartMetadata | null;
  published?: boolean;
  slug: string;
  source: string;
  status?: string;
  title: string;
  updatedAt?: string;
  url: string | null;
};
export type PartMetadata = {
  number: string;
  title: string;
  description: string;
  file: string;
  chapters: string[];
  partPage?: BookPage | null;
};
type PartMetadataCollection = {
  byChapter: Map<string, PartMetadata>;
  parts: PartMetadata[];
};
type Templates = {
  baseLayout: string;
  bookNavigation: string;
  bookPage: string;
  paginationLink: string;
  siteIndex: string;
};
type RenderPart = Omit<PartMetadata, "chapters" | "partPage"> & {
  chapters: BookPage[];
  partPage?: BookPage | null;
};
type CreateSiteRendererOptions = {
  chapters: BookPage[];
  config: SiteConfig;
  indexChapters: BookPage[];
  indexPartPages: BookPage[];
  partMetadata: PartMetadataCollection;
  templates: Templates;
};
type RenderBookPageOptions = {
  page: BookPage;
  rendered: RenderedMarkdown;
  previous?: BookPage;
  next?: BookPage;
};
type RenderLayoutOptions = {
  title: string;
  description: string;
  currentUrl: string | null;
  stylesheets?: string[];
  scripts?: string[];
  children: string;
};

export function createSiteRenderer({
  chapters,
  config,
  indexChapters,
  indexPartPages,
  partMetadata,
  templates,
}: CreateSiteRendererOptions) {
  return {
    renderBookPage,
    renderHome,
    renderLayout,
  };

  function renderHome(): string {
    const firstChapter = chapters[0];
    if (!firstChapter?.url) {
      throw new Error("At least one chapter is required");
    }

    return renderHtmlisp(templates.siteIndex, {
      bookContents: renderHomeContents(),
      coverAlt: `Cover of ${config.title}`,
      coverImageUrl: "/assets/book-cover.svg",
      title: config.title,
      description: config.description,
      course: config.course,
      firstChapterUrl: firstChapter.url,
    });
  }

  function renderBookPage({
    page,
    rendered,
    previous,
    next,
  }: RenderBookPageOptions): string {
    return renderHtmlisp(templates.bookPage, {
      bookNavigation: renderBookNavigation(page, rendered.tableOfContents),
      chapterFile: page.file,
      chapterLabel: page.label,
      chapterSlug: page.slug,
      content: insertChapterHistory(rendered.content, page),
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
  }: RenderLayoutOptions): string {
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

  function renderBookNavigation(
    currentChapter: BookPage,
    tableOfContents: TableOfContentsItem[],
  ): string {
    const headings = tableOfContents.filter(
      (item) => item.level > 1 && item.level < 4,
    );

    return renderHtmlisp(templates.bookNavigation, {
      bookContents: renderSidebarContents(currentChapter),
      headings: headings.map((item) => ({
        ...item,
        className: `toc-level-${item.level}`,
        href: `#${item.slug}`,
      })),
    });
  }

  function renderHomeContents(): string {
    return renderChapterParts({
      chapters: indexChapters,
      currentChapter: null,
      mode: "home",
    });
  }

  function renderSidebarContents(currentChapter: BookPage): string {
    return renderChapterParts({
      chapters: indexChapters,
      currentChapter,
      mode: "sidebar",
    });
  }

  function renderChapterParts({
    chapters,
    currentChapter,
    mode,
  }: {
    chapters: BookPage[];
    currentChapter: BookPage | null;
    mode: "home" | "sidebar";
  }): string {
    const chapterByFile = new Map(
      chapters.map((chapter) => [chapter.file, chapter]),
    );
    const partPageByFile = new Map(
      indexPartPages.map((partPage) => [partPage.file, partPage]),
    );
    const assignedFiles = new Set();
    const parts: RenderPart[] = partMetadata.parts.map((part) => {
      const partPage = part.file ? partPageByFile.get(part.file) || null : null;
      const partChapters = part.chapters
        .map((file) => chapterByFile.get(file))
        .filter((chapter): chapter is BookPage => Boolean(chapter));

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
        file: "",
        partPage: null,
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

  function renderHomePart(part: RenderPart): string {
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

  function renderHomeChapter(chapter: BookPage): string {
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
      return `<li class="${escapeAttribute(chapter.className || "")}"><span class="chapter-card" aria-disabled="true">
      ${inner}
    </span></li>`;
    }

    return `<li class="${escapeAttribute(chapter.className || "")}"><a href="${escapeAttribute(chapter.url || "")}">
      ${inner}
    </a></li>`;
  }

  function renderSidebarPart(
    part: RenderPart,
    currentChapter: BookPage | null,
  ): string {
    const heading = part.number
      ? `Part ${part.number}: ${part.title}`
      : part.title;
    const headingContent = part.partPage
      ? `<a href="${escapeAttribute(part.partPage.url)}"${
          part.partPage.slug === currentChapter?.slug
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

  function renderSidebarChapter(
    chapter: BookPage,
    currentChapter: BookPage | null,
  ): string {
    const ariaCurrent =
      chapter.slug === currentChapter?.slug ? ' aria-current="page"' : "";
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

    return `<li><a href="${escapeAttribute(chapter.url || "")}"${ariaCurrent}>${inner}</a></li>`;
  }

  function renderPaginationLink(
    chapter: BookPage | undefined,
    label: string,
    rel: string,
  ): string {
    if (!chapter) {
      return "<span></span>";
    }

    return renderHtmlisp(templates.paginationLink, {
      label,
      rel,
      title: chapter.title,
      url: chapter.url || "",
    });
  }
}

function insertChapterHistory(content: string, page: BookPage): string {
  if (!page.createdAt || !page.updatedAt) {
    return content;
  }

  const history = `<dl class="chapter-history" aria-label="Chapter history" title="Dates derived from Git history">
  <div><dt>Created</dt><dd><time datetime="${escapeAttribute(page.createdAt)}">${escapeHtml(formatGitDate(page.createdAt))}</time></dd></div>
  <div><dt>Updated</dt><dd><time datetime="${escapeAttribute(page.updatedAt)}">${escapeHtml(formatGitDate(page.updatedAt))}</time></dd></div>
</dl>`;
  const headingEnd = content.indexOf("</h1>");

  if (headingEnd === -1) {
    return `${history}\n${content}`;
  }

  const insertionPoint = headingEnd + "</h1>".length;

  return `${content.slice(0, insertionPoint)}\n${history}${content.slice(insertionPoint)}`;
}

function formatGitDate(value: string): string {
  const calendarDate = value.slice(0, 10);
  const date = new Date(`${calendarDate}T00:00:00Z`);

  if (Number.isNaN(date.valueOf())) {
    return calendarDate;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}
