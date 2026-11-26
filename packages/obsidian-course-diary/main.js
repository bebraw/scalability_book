// Loaded directly by Obsidian. All writing stays in ordinary Markdown files.
const {
  FuzzySuggestModal,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  TFile,
} = require("obsidian");
const { isInquiryReadingPath } = require("../../shared/concept-pages.ts");
const { isBookOrigin, matchingBookSource } = require("./book-origin.js");
const { lectures } = require("./lecture-layout.ts");

const readingPaths = [
  "/chapters/",
  "/appendices/",
  "/parts/",
  "/case-studies/",
  "/project/",
  "/concepts/",
  "/explore/",
  "/demos/",
  "/diary/",
  "/agents/",
  "/notebook/setup/",
];

function readingPath(pathname) {
  return (
    pathname === "/" ||
    readingPaths.some((prefix) => pathname.startsWith(prefix))
  );
}

function publicSource(value) {
  try {
    const url = new URL(value);
    if (
      url.origin === "https://scalableweb.dev" &&
      !url.username &&
      !url.password &&
      !url.search &&
      readingPath(url.pathname)
    )
      return url;
  } catch {
    // Clipboard contents can be arbitrary prose.
  }
  return null;
}

function isWebViewerHighlight(event) {
  if (
    !event.isMainFrame ||
    event.target.tagName !== "WEBVIEW" ||
    !event.url?.endsWith("#scalableweb-course-diary-add-highlight")
  )
    return false;
  try {
    const url = new URL(event.url);
    const current = new URL(event.target.getURL());
    return (
      isBookOrigin(url) &&
      readingPath(url.pathname) &&
      url.hash === "#scalableweb-course-diary-add-highlight" &&
      url.origin === current.origin &&
      url.pathname === current.pathname &&
      url.search === current.search
    );
  } catch {
    // A Web viewer can be detached or navigated while the event is in flight.
    return false;
  }
}

function markdownUrl(url) {
  return url.href.replaceAll("(", "%28").replaceAll(")", "%29");
}

async function clipboardText() {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

function readHighlight(clipboard) {
  if (clipboard === null)
    throw new Error(
      "Clipboard access is unavailable. Paste the copied Markdown into your lecture note.",
    );
  const lines = clipboard.trim().split(/\r?\n/);
  const footer = lines.pop()?.match(/^\[Book source\]\(([^\s)]+)\)$/);
  const source = footer && publicSource(footer[1]);
  while (lines.at(-1) === "") lines.pop();
  if (
    !source ||
    !lines.length ||
    !lines.every((line) => /^>(?: |$)/.test(line))
  )
    throw new Error(
      "Select a passage in the course book and choose Add book highlight or Copy highlight.",
    );
  // The book escapes Markdown punctuation before putting text on the clipboard.
  const quote = lines
    .map((line) =>
      line.replace(/^> ?/, "").replace(/\\([!-\/:-@\[-`{-~])/g, "$1"),
    )
    .join("\n");
  if (!quote.trim())
    throw new Error("Select some words in the course book first.");
  const literal = quote.replace(/[\\`*_{}\[\]()<>#+.!|~=$-]/g, "\\$&");
  return {
    source,
    quote,
    markdown:
      literal
        .split("\n")
        .map((line) => "> " + line)
        .join("\n") +
      "\n\n[Book source](" +
      markdownUrl(source) +
      ")",
  };
}

// Offsets delimit real Markdown sections, including after a student adds code
// samples containing example headings. Keep the recorded source text intact.
function sections(text) {
  const sections = [];
  let offset = 0;
  let fence = "";
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const boundary = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (boundary) {
      if (!fence) fence = boundary[1];
      else if (boundary[1].startsWith(fence) && !boundary[2].trim()) fence = "";
    } else if (!fence && /^ {0,3}#{1,2}(?:\s|$)/.test(line)) {
      if (sections.length) sections.at(-1).end = offset;
      sections.push({ start: offset, end: text.length });
    }
    offset += raw.length + 1;
  }
  return sections;
}

function readingIn(text, validate = publicSource) {
  for (const match of text.matchAll(/\[[^\n\]]+\]\((https?:\/\/[^\s)]+)\)/g)) {
    const url = validate(match[1]);
    if (url) return url;
  }
  return null;
}

function selectedReading(editor, validate = publicSource) {
  const selected = readingIn(editor.getSelection(), validate);
  if (selected) return selected;
  // A selection inside a saved quotation usually omits the source line.
  const start = editor.posToOffset(editor.getCursor("from"));
  const end = editor.posToOffset(editor.getCursor("to"));
  const highlights =
    /^(?:>[^\r\n]*\r?\n)+\r?\n\[Book source\]\((https?:\/\/[^\s)]+)\)/gm;
  for (const match of editor.getValue().matchAll(highlights)) {
    if (start >= match.index && end <= match.index + match[0].length)
      return validate(match[1]);
  }
  return null;
}

function peerSource(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    !isBookOrigin(url) ||
    (url.search && url.search !== "?inquiry=1") ||
    (url.hash && !/^#[a-z0-9_-]{1,200}$/i.test(url.hash)) ||
    !isInquiryReadingPath(url.pathname)
  )
    return null;
  return url;
}

async function markerFor(kind, parts) {
  const bytes = new TextEncoder().encode(JSON.stringify(parts));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hash = Array.from(digest, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `<!-- scalableweb-${kind}:${hash} -->`;
}

function appendText(text, marker, markdown) {
  if (text.includes(marker)) return "";
  const lineEnd = text.includes("\r\n") ? "\r\n" : "\n";
  const gap =
    !text || /\r?\n\r?\n$/.test(text)
      ? ""
      : text.endsWith("\n")
        ? "\n"
        : "\n\n";
  return (gap + markdown.trim() + "\n\n" + marker + "\n").replace(
    /\r?\n/g,
    lineEnd,
  );
}

class LecturePicker extends FuzzySuggestModal {
  constructor(app, select) {
    super(app);
    this.select = select;
    this.setPlaceholder("Choose a lecture");
  }
  getItems() {
    return lectures;
  }
  getItemText(item) {
    return `Lecture ${item.number} · ${item.phase}`;
  }
  onChooseItem(item) {
    return this.select(item);
  }
}

class Review extends Modal {
  constructor(app, title, draw) {
    super(app);
    this.title = title;
    this.draw = draw;
  }
  onOpen() {
    this.titleEl.setText(this.title);
    this.draw(this.contentEl, this);
  }
  action(label, perform) {
    const button = this.contentEl.createEl("button", { text: label });
    button.addEventListener("click", async () => {
      if (this.busy) return;
      this.busy = true;
      button.disabled = true;
      try {
        await perform();
        this.close();
      } catch (error) {
        new Notice(error.message);
      } finally {
        this.busy = false;
        button.disabled = false;
      }
    });
  }
  onClose() {
    this.contentEl.empty();
  }
}

class CourseDiary extends Plugin {
  onload() {
    this.taUnloaded = false;
    this.register(() => {
      this.taUnloaded = true;
      void this.diaryAssistant?.stop();
    });
    this.addCommand({
      id: "stop-obsidian-ta",
      name: "Stop Obsidian TA",
      checkCallback: (checking) => {
        if (!this.diaryAssistant?.running) return false;
        if (!checking)
          void this.run(async () => {
            await this.diaryAssistant.stop();
            new Notice("Obsidian TA stopped.");
          });
        return true;
      },
    });
    this.addCommand({
      id: "open-lecture",
      name: "Open lecture diary",
      callback: () => this.choose((lecture) => this.openLecture(lecture)),
    });
    const addHighlight = () => this.run(() => this.addHighlight());
    this.registerObsidianProtocolHandler(
      "scalableweb-course-diary-add-highlight",
      addHighlight,
    );
    this.watchWebViewerHighlights(addHighlight);
    this.addCommand({
      id: "add-highlight",
      name: "Add book highlight",
      callback: addHighlight,
    });
    this.addCommand({
      id: "discuss",
      name: "Discuss with the course TA",
      editorCallback: (editor, view) =>
        this.run(() => this.discuss(editor, view)),
    });
    this.addCommand({
      id: "initial-thinking",
      name: "Use as my initial thinking",
      editorCallback: (editor, view) =>
        this.run(() => this.peerAttempt(editor, view)),
    });
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        if (!view.file?.path.endsWith(".md") || !editor.getSelection().trim())
          return;
        menu.addItem((item) =>
          item
            .setTitle("Use as my initial thinking")
            .setIcon("messages-square")
            .onClick(() => this.run(() => this.peerAttempt(editor, view))),
        );
        menu.addItem((item) =>
          item
            .setTitle("Discuss with the course TA")
            .setIcon("message-circle-question")
            .onClick(() => this.run(() => this.discuss(editor, view))),
        );
      }),
    );
    this.addCommand({
      id: "portfolio",
      name: "Prepare portfolio excerpt",
      editorCallback: (editor, view) =>
        this.run(() => this.prepare(editor, view)),
    });
  }
  watchWebViewerHighlights(addHighlight) {
    const workspace = this.app.workspace;
    const onNavigation = (event) => {
      if (isWebViewerHighlight(event)) return addHighlight();
    };
    // Capturing on each Web viewer catches its guest's navigation event even
    // when the view replaces the guest element, including in pop-out windows.
    const eventName = "did-navigate-in-page";
    let containers = [];
    const watch = (next) => {
      for (const container of containers)
        if (!next.includes(container))
          container.removeEventListener(eventName, onNavigation, true);
      for (const container of next)
        if (!containers.includes(container))
          container.addEventListener(eventName, onNavigation, true);
      containers = next;
    };
    const refresh = () =>
      watch(
        workspace
          .getLeavesOfType("webviewer")
          .map((leaf) => leaf.view.containerEl),
      );
    this.registerEvent(workspace.on("layout-change", refresh));
    this.register(() => watch([]));
    refresh();
  }
  async run(action) {
    try {
      await action();
    } catch (error) {
      new Notice(error.message);
    }
  }
  choose(action) {
    new LecturePicker(this.app, (lecture) =>
      this.run(() => action(lecture)),
    ).open();
  }
  lectureFile(lecture) {
    const file = this.app.vault.getAbstractFileByPath(lecture.path);
    if (!(file instanceof TFile))
      throw new Error(
        `Open the course diary vault and check for ${lecture.path}.`,
      );
    return file;
  }
  editorFor(file) {
    const workspace = this.app.workspace;
    const active = workspace.getActiveViewOfType(MarkdownView);
    const editable = (view) =>
      view instanceof MarkdownView &&
      view.file?.path === file.path &&
      view.getMode() === "source";
    if (editable(active)) return active.editor;
    return workspace
      .getLeavesOfType("markdown")
      .find((leaf) => editable(leaf.view))?.view.editor;
  }
  async openLecture(lecture) {
    const file = this.lectureFile(lecture);
    await this.app.workspace.openLinkText(file.path, file.path);
  }
  async append(file, marker, markdown) {
    // Preserve unsaved editor text and undo history. For inactive notes
    // Vault.process appends to the latest on-disk contents.
    const editor = this.editorFor(file);
    if (editor) {
      const text = editor.getValue();
      const addition = appendText(text, marker, markdown);
      if (!addition) return false;
      editor.replaceRange(addition, editor.offsetToPos(text.length));
      return true;
    }
    let inserted = false;
    await this.app.vault.process(file, (text) => {
      const addition = appendText(text, marker, markdown);
      inserted = Boolean(addition);
      return text + addition;
    });
    return inserted;
  }
  async addHighlight() {
    const clipboard = await clipboardText();
    const copied = clipboard === null ? null : readHighlight(clipboard);
    this.choose(async (lecture) => {
      // The protocol can arrive before Obsidian has focus. Choosing a lecture
      // gives its window focus so it can retry a denied clipboard read.
      const highlight = copied ?? readHighlight(await clipboardText());
      const file = this.lectureFile(lecture);
      const marker = await markerFor("highlight", [
        highlight.source.href,
        highlight.quote,
      ]);
      new Review(
        this.app,
        `Add highlight to Lecture ${lecture.number}`,
        (el, modal) => {
          el.createEl("blockquote", { text: highlight.quote });
          el.createEl("p", { text: highlight.source.href });
          el.createEl("p", { text: `Save in ${file.path}` });
          modal.action("Save highlight", async () => {
            if (this.lectureFile(lecture) !== file)
              throw new Error(
                "The lecture note changed. Choose the lecture again.",
              );
            const inserted = await this.append(
              file,
              marker,
              highlight.markdown,
            );
            new Notice(
              inserted
                ? `Saved to ${file.path}.`
                : "This highlight is already in that lecture.",
            );
          });
        },
      ).open();
    });
  }
  async discuss(editor, view) {
    const selected = editor.getSelection();
    const lecture = lectures.find((item) => item.path === view.file?.path);
    const reading = lecture ? selectedReading(editor) : readingIn(selected);
    const launch = async (lecture) => {
      const file = this.lectureFile(lecture);
      const url =
        reading ??
        readingIn(
          this.editorFor(file)?.getValue() ?? (await this.app.vault.read(file)),
        );
      if (!url)
        throw new Error(
          "Add a public course reading link to the lecture to open its TA.",
        );
      url.searchParams.set("assistant", "1");
      new Review(this.app, "Discuss with the course TA", (el, modal) => {
        el.createEl("p", { text: `Lecture ${lecture.number} · ${url.href}` });
        const label = el.createEl("label", {
          text: "Review your excerpt and add a question",
        });
        const writing = label.createEl("textarea", { attr: { rows: "6" } });
        writing.value = selected ? selected + "\n\n" : "";
        el.createEl("p", {
          text: "Use Obsidian TA to run the assistant with your OpenAI API account, or open the reading with a separately configured companion. Paste your reviewed text into the book and choose Send message.",
        });
        modal.action("Use Obsidian TA", async () => {
          const { DiaryAssistant } = require("./assistant-ui.js");
          this.diaryAssistant ??= new DiaryAssistant(this, Review);
          await this.diaryAssistant.review(url, async (destination) => {
            await this.copyDraft(writing);
            if (!this.taUnloaded && this.diaryAssistant.running)
              await require("electron").shell.openExternal(destination.href);
          });
        });
        modal.action("Copy and open beside diary", async () => {
          await this.copyDraft(writing);
          await this.openBeside(url.href);
        });
        modal.action("Copy and open in default browser", async () => {
          await this.copyDraft(writing);
          await require("electron").shell.openExternal(url.href);
        });
      }).open();
    };
    if (lecture) await launch(lecture);
    else this.choose(launch);
  }
  async copyDraft(writing) {
    if (!writing.value.trim()) return;
    try {
      await navigator.clipboard.writeText(writing.value);
    } catch {
      writing.focus();
      writing.select();
      throw new Error(
        "Copy the selected draft manually, then open the displayed reading in Chrome.",
      );
    }
  }
  async openBeside(url) {
    const workspace = this.app.workspace;
    if (
      this.readerLeaf &&
      workspace.getLeavesOfType("webviewer").includes(this.readerLeaf) &&
      this.readerLeaf.getViewState().state?.url === url
    ) {
      await workspace.revealLeaf(this.readerLeaf);
      return;
    }
    const leaf = workspace.getLeaf("split", "vertical");
    try {
      await leaf.setViewState({
        type: "webviewer",
        active: true,
        state: { url, navigate: true },
      });
      await workspace.revealLeaf(leaf);
      if (leaf.view.getViewType() !== "webviewer") throw new Error();
      this.readerLeaf = leaf;
    } catch {
      leaf.detach();
      throw new Error(
        "Enable Web viewer under Core plugins or choose the default browser.",
      );
    }
  }
  peerAttempt(editor, view) {
    const selected = editor.getSelection();
    const file = view.file;
    if (
      !selected.trim() ||
      !(file instanceof TFile) ||
      !file.path.endsWith(".md")
    )
      throw new Error("Select your own initial thinking in a Markdown note.");
    const text = editor.getValue();
    const start = editor.posToOffset(editor.getCursor("from"));
    const section = sections(text).find(
      (part) => part.start <= start && start < part.end,
    );
    // A student often writes their response immediately below a saved highlight.
    const preceding = text.slice(section?.start ?? 0, start);
    let precedingSource = null;
    for (const match of preceding.matchAll(
      /^\[Book source\]\((https?:\/\/[^\s)]+)\)\s*$/gm,
    )) {
      const candidate = peerSource(match[1]);
      if (candidate) precedingSource = candidate;
    }
    const source =
      selectedReading(editor, peerSource) ??
      precedingSource ??
      readingIn(
        text.slice(section?.start ?? 0, section?.end ?? text.length),
        peerSource,
      ) ??
      (lectures.some((lecture) => lecture.path === file.path)
        ? readingIn(text, peerSource)
        : null);

    new Review(this.app, "Use as my initial thinking", (el, modal) => {
      el.createEl("blockquote", { text: selected });
      const field = el.createEl("label", {
        text: "Book passage for this discussion",
      });
      const address = field.createEl("input", {
        attr: { type: "url", placeholder: "Paste the book passage URL" },
      });
      address.value = matchingBookSource(this.app, source)?.href ?? "";
      el.createEl("p", {
        text: "Your words stay in this diary. At the book, choose Reveal peer inquiry to tell the course you saved your initial thinking.",
      });
      modal.action("Open class discussion", async () => {
        const url = peerSource(address.value);
        if (!url)
          throw new Error(
            "Use a published course reading URL, optionally with its paragraph or heading.",
          );
        const saved = await this.app.vault.read(file);
        if (view.file !== file || editor.getValue() !== text)
          throw new Error(
            "The note changed. Close this review and select your passage again.",
          );
        if (saved.replace(/\r\n/g, "\n") !== text.replace(/\r\n/g, "\n"))
          throw new Error(
            "Save this note in Obsidian, then choose Open class discussion again.",
          );
        // These one-handoff references are independent of the note's name and contents.
        url.search = "?inquiry=1";
        url.hash +=
          "&diaryAttempt=" + crypto.randomUUID() + "." + crypto.randomUUID();
        await require("electron").shell.openExternal(url.href);
      });
    }).open();
  }
  async prepare(editor, view) {
    const selected = editor.getSelection();
    const lecture = lectures.find((item) => item.path === view.file?.path);
    if (!selected.trim() || !lecture)
      throw new Error("Select a passage in a course lecture note.");
    const source = selectedReading(editor) ?? readingIn(editor.getValue());
    const destination = `Portfolio - ${lecture.phase}.md`;
    const marker = await markerFor("excerpt", [lecture.number, selected]);
    const markdown =
      `## Course lecture ${lecture.number} · Portfolio lecture ${lecture.slot}\n\n${selected}` +
      (source ? "\n\n[Lecture reading](" + markdownUrl(source) + ")" : "");
    new Review(this.app, "Prepare portfolio excerpt", (el, modal) => {
      el.createEl("p", {
        text: `Add to the private draft ${destination}. Review and submit chosen material in My portfolio on the course website.`,
      });
      el.createEl("pre", { text: markdown });
      modal.action("Add to private draft", async () => {
        const vault = this.app.vault;
        let file = vault.getAbstractFileByPath(destination);
        if (!file) {
          try {
            file = await vault.create(
              destination,
              `# ${lecture.phase} portfolio draft\n`,
            );
          } catch (error) {
            file = vault.getAbstractFileByPath(destination);
            if (!file) throw error;
          }
        }
        if (!(file instanceof TFile))
          throw new Error(`A folder already uses the name ${destination}.`);
        const inserted = await this.append(file, marker, markdown);
        new Notice(
          inserted
            ? `Added to ${destination}.`
            : "This excerpt is already in the draft.",
        );
      });
    }).open();
  }
}

module.exports = CourseDiary;
