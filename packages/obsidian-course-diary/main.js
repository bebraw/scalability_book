// Loaded directly by Obsidian. All writing stays in ordinary Markdown files.
const {
  FuzzySuggestModal,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  TFile,
} = require("obsidian");

const phases = ["Establish", "Challenge", "Compare"];
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
const lectures = Array.from({ length: 9 }, (_, index) => {
  const phase = Math.floor(index / 3);
  return {
    number: index + 1,
    phase: phases[phase],
    slot: (index % 3) + 1,
    path: `0${phase + 1}-${phases[phase]}.md`,
  };
});

function publicSource(value) {
  try {
    const url = new URL(value);
    if (
      url.origin === "https://scalableweb.dev" &&
      !url.username &&
      !url.password &&
      !url.search &&
      (url.pathname === "/" ||
        readingPaths.some((prefix) => url.pathname.startsWith(prefix)))
    )
      return url;
  } catch {
    // Clipboard contents can be arbitrary prose.
  }
  return null;
}

function markdownUrl(url) {
  return url.href.replaceAll("(", "%28").replaceAll(")", "%29");
}

function readHighlight(clipboard) {
  const lines = clipboard.trim().split(/\r?\n/);
  const footer = lines.pop()?.match(/^\[Book source\]\(([^\s)]+)\)$/);
  const source = footer && publicSource(footer[1]);
  while (lines.at(-1) === "") lines.pop();
  if (
    !source ||
    !lines.length ||
    !lines.every((line) => /^>(?: |$)/.test(line))
  )
    throw new Error("Use Copy highlight in the course book, then try again.");
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
      const title = line.replace(/^ {0,3}#{1,2}\s*/, "").replace(/\s+#+$/, "");
      const number = Number(title.match(/^Lecture ([1-9])\b/)?.[1]);
      sections.push({ title, number, start: offset, end: text.length });
    }
    offset += raw.length + 1;
  }
  return sections;
}

function lectureSection(text, lecture) {
  const matches = sections(text).filter(
    (section) => section.number === lecture.number,
  );
  if (matches.length !== 1)
    throw new Error(
      `Keep one Lecture ${lecture.number} heading in ${lecture.path}, or paste your material where you want it.`,
    );
  return matches[0];
}

function readingIn(text) {
  for (const match of text.matchAll(/\[[^\n\]]+\]\((https:\/\/[^\s)]+)\)/g)) {
    const url = publicSource(match[1]);
    if (url) return url;
  }
  return null;
}

function selectedReading(editor) {
  const selected = readingIn(editor.getSelection());
  if (selected) return selected;
  // A selection inside a saved quotation usually omits the source line.
  const start = editor.posToOffset(editor.getCursor("from"));
  const end = editor.posToOffset(editor.getCursor("to"));
  const highlights =
    /^(?:>[^\r\n]*\r?\n)+\r?\n\[Book source\]\((https:\/\/[^\s)]+)\)/gm;
  for (const match of editor.getValue().matchAll(highlights)) {
    if (start >= match.index && end <= match.index + match[0].length)
      return publicSource(match[1]);
  }
  return null;
}

async function markerFor(kind, parts) {
  const bytes = new TextEncoder().encode(JSON.stringify(parts));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hash = Array.from(digest, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `<!-- scalableweb-${kind}:${hash} -->`;
}

function insertion(text, start, end, marker, markdown) {
  if (text.slice(start, end).includes(marker)) return null;
  const lineEnd = text.includes("\r\n") ? "\r\n" : "\n";
  const preceding = text.slice(start, end);
  const gap = /\r?\n\r?\n$/.test(preceding)
    ? ""
    : preceding.endsWith("\n")
      ? "\n"
      : "\n\n";
  const following = end === text.length ? "\n" : "\n\n";
  return {
    at: end,
    body: (gap + markdown.trim() + "\n\n" + marker + following).replace(
      /\r?\n/g,
      lineEnd,
    ),
  };
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
    this.addCommand({
      id: "open-lecture",
      name: "Open lecture diary",
      callback: () => this.choose((lecture) => this.openLecture(lecture)),
    });
    this.addCommand({
      id: "add-highlight",
      name: "Add book highlight",
      callback: () => this.run(() => this.addHighlight()),
    });
    this.addCommand({
      id: "discuss",
      name: "Discuss with the course TA",
      editorCallback: (editor, view) =>
        this.run(() => this.discuss(editor, view)),
    });
    this.addCommand({
      id: "portfolio",
      name: "Prepare portfolio excerpt",
      editorCallback: (editor, view) =>
        this.run(() => this.prepare(editor, view)),
    });
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
  phaseFile(lecture) {
    const file = this.app.vault.getAbstractFileByPath(lecture.path);
    if (!(file instanceof TFile))
      throw new Error(
        `Open the extracted course diary as a vault. Its ${lecture.path} belongs at the top level.`,
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
  async lectureData(lecture) {
    const file = this.phaseFile(lecture);
    const text =
      this.editorFor(file)?.getValue() ?? (await this.app.vault.read(file));
    const section = lectureSection(text, lecture);
    return {
      file,
      section,
      source: readingIn(text.slice(section.start, section.end)),
    };
  }
  async openLecture(lecture) {
    const { file, section } = await this.lectureData(lecture);
    await this.app.workspace.openLinkText(
      file.path + "#" + section.title,
      file.path,
    );
  }
  async update(file, plan) {
    // Preserve unsaved editor text and undo history. For inactive notes
    // Vault.process applies the insertion against the latest on-disk contents.
    const editor = this.editorFor(file);
    if (editor) {
      const change = plan(editor.getValue());
      if (!change) return false;
      editor.replaceRange(change.body, editor.offsetToPos(change.at));
      return true;
    }
    let inserted = false;
    await this.app.vault.process(file, (text) => {
      const change = plan(text);
      if (!change) return text;
      inserted = true;
      return text.slice(0, change.at) + change.body + text.slice(change.at);
    });
    return inserted;
  }
  async addHighlight() {
    let clipboard;
    try {
      clipboard = await navigator.clipboard.readText();
    } catch {
      throw new Error(
        "Clipboard access is unavailable. Paste the copied Markdown into your lecture note.",
      );
    }
    const highlight = readHighlight(clipboard);
    this.choose(async (lecture) => {
      const { file } = await this.lectureData(lecture);
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
          modal.action("Save highlight", async () => {
            const inserted = await this.update(file, (text) => {
              const { start, end } = lectureSection(text, lecture);
              return insertion(text, start, end, marker, highlight.markdown);
            });
            new Notice(
              inserted
                ? `Saved to ${file.basename}.`
                : "This highlight is already in that lecture.",
            );
          });
        },
      ).open();
    });
  }
  currentLecture(editor, view) {
    if (!lectures.some((lecture) => view.file?.path === lecture.path))
      return null;
    const offset = editor.posToOffset(editor.getCursor("from"));
    const text = editor.getValue();
    const section = sections(text).find(
      (section) =>
        section.start <= offset &&
        (offset < section.end ||
          (offset === text.length && section.end === offset)),
    );
    return lectures.find(
      (lecture) =>
        lecture.path === view.file.path && lecture.number === section?.number,
    );
  }
  async discuss(editor, view) {
    const selected = editor.getSelection();
    const lecture = this.currentLecture(editor, view);
    const reading = lecture ? selectedReading(editor) : readingIn(selected);
    const launch = async (lecture) => {
      const data = await this.lectureData(lecture);
      const url = reading ?? data.source;
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
          text: "Copy the text you want to discuss, then paste it in the TA and choose Send message. Chrome on the computer running your companion is the supported browser.",
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
  async prepare(editor, view) {
    const selected = editor.getSelection();
    const lecture = this.currentLecture(editor, view);
    if (!selected.trim() || !lecture)
      throw new Error(
        "Select a passage from one lecture in a numbered phase note.",
      );
    const text = editor.getValue();
    const section = lectureSection(text, lecture);
    if (editor.posToOffset(editor.getCursor("to")) > section.end)
      throw new Error("Choose an excerpt from one lecture at a time.");
    const source =
      selectedReading(editor) ??
      readingIn(text.slice(section.start, section.end));
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
        const inserted = await this.update(file, (body) =>
          insertion(body, 0, body.length, marker, markdown),
        );
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
