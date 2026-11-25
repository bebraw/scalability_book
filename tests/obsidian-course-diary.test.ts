import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";

// Obsidian supplies its CommonJS API at runtime. Run its shipping entry point
// against an in-memory vault so these tests cannot touch someone's notes.
function diary({ deniedClipboardReads = 0 } = {}) {
  const notices: string[] = [];
  const links: string[] = [];
  const external: string[] = [];
  const splits: string[] = [];
  const files = new Map<string, TFile>();
  const commands = new Map();
  const layoutChanges = new Set<() => void>();
  const cleanups: (() => void)[] = [];
  const protocols = new Map<
    string,
    (params: Record<string, string>) => Promise<void>
  >();
  const ui = new Map();
  let modal: Modal;
  let active: MarkdownView;
  let clipboard = "";
  let readerEnabled = true;

  class Modal {
    declare onOpen?: () => void;
    declare onClose?: () => void;
    titleEl = { setText: (title: string) => ui.set("title", title) };
    contentEl = {
      createEl: (tag: string, options: { text?: string } = {}) => {
        const node = {
          ...options,
          createEl: this.contentEl.createEl,
          addEventListener: (_name: string, action: () => void) =>
            ui.set(options.text, action),
        };
        ui.set(tag, node);
        return node;
      },
      empty: () => ui.clear(),
    };
    open() {
      modal = this;
      ui.clear();
      this.onOpen?.();
    }
    close() {
      this.onClose?.();
    }
  }
  class FuzzySuggestModal extends Modal {
    declare getItems: () => { number: number }[];
    declare onChooseItem: (item: { number: number }) => Promise<void>;
    setPlaceholder() {}
  }
  class Notice {
    constructor(message: string) {
      notices.push(message);
    }
  }
  class Plugin {
    register(cleanup: () => void) {
      cleanups.push(cleanup);
    }
    registerEvent(unsubscribe: () => void) {
      this.register(unsubscribe);
    }
    addCommand(command: { id: string }) {
      commands.set(command.id, command);
    }
    registerObsidianProtocolHandler(
      action: string,
      handler: (params: Record<string, string>) => Promise<void>,
    ) {
      protocols.set(action, handler);
    }
  }
  class TFile {
    path: string;
    text: string;
    constructor(path: string, text: string) {
      this.path = path;
      this.text = text;
    }
    get basename() {
      return this.path.slice(0, -3);
    }
  }
  type Editor = {
    getValue(): string;
    getSelection(): string;
    getCursor(side: string): number;
    posToOffset(position: number): number;
    offsetToPos(offset: number): number;
    replaceRange(body: string, offset: number): void;
  };
  class MarkdownView {
    file: TFile;
    editor: Editor;
    constructor(file: TFile, editor: Editor) {
      this.file = file;
      this.editor = editor;
    }
    getMode() {
      return "source";
    }
  }
  const leaves: object[] = [];
  const app = {
    vault: {
      getAbstractFileByPath: (path: string) => files.get(path),
      read: async (file: TFile) => file.text,
      process: async (file: TFile, edit: (text: string) => string) => {
        file.text = edit(file.text);
      },
      create: async (path: string, text: string) => {
        assert.ok(!files.has(path));
        const file = new TFile(path, text);
        files.set(path, file);
        return file;
      },
    },
    workspace: {
      on: (event: string, handle: () => void) => {
        assert.equal(event, "layout-change");
        layoutChanges.add(handle);
        return () => layoutChanges.delete(handle);
      },
      getActiveViewOfType: () => active,
      openLinkText: async (link: string) => {
        links.push(link);
      },
      getLeavesOfType: (type: string) => (type === "webviewer" ? leaves : []),
      getLeaf: (type: string, direction: string) => {
        assert.equal(type, "split");
        assert.equal(direction, "vertical");
        const leaf = {
          view: { getViewType: () => (readerEnabled ? "webviewer" : "empty") },
          getViewState: () => ({ state: { url: splits.at(-1) } }),
          setViewState: async ({
            type,
            state,
          }: {
            type: string;
            state: { url: string };
          }) => {
            assert.equal(type, "webviewer");
            if (readerEnabled) splits.push(state.url);
          },
          detach: () => leaves.splice(leaves.indexOf(leaf), 1),
        };
        leaves.push(leaf);
        return leaf;
      },
      revealLeaf: async () => {},
    },
  };
  const obsidian = {
    Plugin,
    MarkdownView,
    TFile,
    Modal,
    FuzzySuggestModal,
    Notice,
  };
  const module: { exports?: new () => { app: typeof app; onload(): void } } =
    {};
  const source = readFileSync("packages/obsidian-course-diary/main.js", "utf8");
  runInNewContext(source, {
    module,
    URL,
    TextEncoder,
    crypto: webcrypto,
    require: (name: string) => {
      if (name === "obsidian") return obsidian;
      assert.equal(name, "electron");
      return {
        shell: {
          openExternal: async (url: string) => {
            external.push(url);
          },
        },
      };
    },
    navigator: {
      clipboard: {
        readText: async () => {
          if (deniedClipboardReads > 0) {
            deniedClipboardReads--;
            throw new Error("Document is not focused");
          }
          return clipboard;
        },
        writeText: async (text: string) => {
          clipboard = text;
        },
      },
    },
  });
  assert.ok(module.exports);
  const plugin = new module.exports();
  plugin.app = app;
  plugin.onload();
  for (const path of ["01-Establish.md", "02-Challenge.md", "03-Compare.md"]) {
    files.set(
      path,
      new TFile(path, readFileSync("docs/diary-pilot/" + path, "utf8")),
    );
  }
  return {
    files,
    notices,
    links,
    external,
    splits,
    ui,
    get clipboard() {
      return clipboard;
    },
    set clipboard(text: string) {
      clipboard = text;
    },
    disableReader() {
      readerEnabled = false;
    },
    openHighlight(params: Record<string, string> = {}) {
      const handler = protocols.get("scalableweb-course-diary-add-highlight");
      assert.ok(handler);
      return handler(params);
    },
    unload() {
      cleanups.forEach((cleanup) => cleanup());
    },
    webViewer(current: string) {
      type Navigation = {
        url: string;
        isMainFrame: boolean;
        target: { tagName: string; getURL: () => string };
      };
      let listener: ((event: Navigation) => Promise<void> | void) | undefined;
      const containerEl = {
        addEventListener(
          name: string,
          handle: typeof listener,
          capture: boolean,
        ) {
          assert.equal(name, "did-navigate-in-page");
          assert.ok(capture);
          listener = handle;
        },
        removeEventListener(_name: string, handle: typeof listener) {
          assert.equal(handle, listener);
          listener = undefined;
        },
      };
      const leaf = { view: { containerEl } };
      leaves.push(leaf);
      layoutChanges.forEach((handler) => handler());
      return {
        navigate(url: string, isMainFrame = true, tagName = "WEBVIEW") {
          return listener?.({
            url,
            isMainFrame,
            target: { tagName, getURL: () => current },
          });
        },
        close() {
          leaves.splice(leaves.indexOf(leaf), 1);
          layoutChanges.forEach((handler) => handler());
        },
      };
    },
    run: (id: string) => {
      const command = commands.get(id);
      return command.callback
        ? command.callback()
        : command.editorCallback(active.editor, active);
    },
    selectLecture: (number: number) => {
      assert.ok(modal instanceof FuzzySuggestModal);
      const item = modal
        .getItems()
        .find((lecture) => lecture.number === number);
      assert.ok(item);
      return modal.onChooseItem(item);
    },
    click: (label: string) => ui.get(label)(),
    select(path: string, selection: string, extra = "") {
      const file = files.get(path)!;
      let text = file.text.replace(
        "## At phase end",
        extra + "\n## At phase end",
      );
      const from = text.indexOf(selection);
      assert.ok(from !== -1);
      active = new MarkdownView(file, {
        getValue: () => text,
        getSelection: () => selection,
        getCursor: (side: string) =>
          side === "from" ? from : from + selection.length,
        posToOffset: (position: number) => position,
        offsetToPos: (offset: number) => offset,
        replaceRange: (body: string, offset: number) => {
          text = text.slice(0, offset) + body + text.slice(offset);
        },
      });
      return active.editor;
    },
  };
}

test("choose a lecture from the starter, preview a highlight and save it once into the latest editor text", async () => {
  const h = diary();
  const file = h.files.get("01-Establish.md")!;
  const section = "## Lecture 2 · Checking an agent’s work";
  h.run("open-lecture");
  await h.selectLecture(2);
  assert.equal(h.links[0], file.path + "#" + section.slice(3));
  h.clipboard =
    "> A \\*literal\\*\n> second line\\.\n\n[Book source](https://scalableweb.dev/chapters/benchmarking/#requests)\n";
  await h.openHighlight({
    content: "Other text from a URI",
    lecture: "9",
  });
  const quoted = h.clipboard;
  h.clipboard = "Clipboard changed while the lecture picker was open.";
  await h.selectLecture(2);
  assert.equal(h.ui.get("blockquote").text, "A *literal*\nsecond line.");
  assert.ok(!file.text.includes("second line"));
  const editor = h.select(file.path, section);
  const offset = editor.getValue().indexOf(section) + section.length;
  editor.replaceRange(
    "\n\nMy unsaved thought.\n\n```text\n## Lecture 2\n```",
    offset,
  );
  await h.click("Save highlight");
  const saved = editor.getValue();
  assert.ok(saved.includes("My unsaved thought."));
  assert.ok(saved.indexOf("second line") > saved.indexOf(section));
  assert.ok(saved.indexOf("[Book source]") < saved.indexOf("## Lecture 3"));
  assert.match(saved, /> A \\\*literal\\\*\n> second line\\\./);
  assert.ok(!file.text.includes("[Book source]"));
  h.clipboard = quoted;
  await h.run("add-highlight");
  await h.selectLecture(2);
  await h.click("Save highlight");
  assert.equal(editor.getValue(), saved);
  assert.match(h.notices.at(-1) ?? "", /already in that lecture/);
});

test("the book handoff can read the highlight after the lecture picker receives focus", async () => {
  const h = diary({ deniedClipboardReads: 1 });
  const file = h.files.get("02-Challenge.md")!;
  const original = file.text;
  h.clipboard =
    "> The cache missed.\n\n[Book source](https://scalableweb.dev/chapters/benchmarking/#requests)";
  await h.openHighlight();
  await h.selectLecture(5);
  assert.equal(h.ui.get("blockquote").text, "The cache missed.");
  assert.equal(file.text, original);
  await h.click("Save highlight");
  assert.match(file.text, /## Lecture 5.*The cache missed.*## Lecture 6/s);

  const denied = diary({ deniedClipboardReads: 2 });
  await denied.openHighlight();
  await denied.selectLecture(5);
  assert.match(denied.notices.at(-1) ?? "", /Paste the copied Markdown/);
  assert.equal(denied.files.get(file.path)!.text, original);
});

test("a book page in a Web viewer can request a reviewed highlight in its own vault", async () => {
  const path = "/chapters/benchmarking/";
  const marker = "#scalableweb-course-diary-add-highlight";
  for (const origin of ["https://scalableweb.dev", "http://127.0.0.1:3000"]) {
    const h = diary();
    const viewer = h.webViewer(origin + path + "#requests");
    const file = h.files.get("02-Challenge.md")!;
    const original = file.text;
    h.clipboard =
      "> Measure cold reads.\n\n[Book source](https://scalableweb.dev/chapters/benchmarking/#requests)";
    await viewer.navigate(origin + path + marker);
    await h.selectLecture(4);
    assert.equal(h.ui.get("blockquote").text, "Measure cold reads.");
    assert.equal(file.text, original);
    await h.click("Save highlight");
    assert.match(file.text, /## Lecture 4.*Measure cold reads.*## Lecture 5/s);
  }
});

test("only a current course reading in the Web viewer main frame can start a handoff", async () => {
  const h = diary();
  // A clipboard read would surface a validation notice.
  h.clipboard = "Unrelated clipboard";
  const reading = "https://scalableweb.dev/chapters/benchmarking/";
  const marker = "#scalableweb-course-diary-add-highlight";
  const view = h.webViewer(reading);
  await view.navigate(reading + "#requests");
  await view.navigate(reading + marker, false);
  await view.navigate(reading + marker, true, "IFRAME");
  await view.navigate("https://scalableweb.dev/chapters/other/" + marker);
  await view.navigate("http://localhost:3000/chapters/benchmarking/" + marker);
  for (const url of [
    "https://scalableweb.dev.example/chapters/benchmarking/",
    "http://example.test/chapters/benchmarking/",
    "https://scalableweb.dev/course/",
    "http://localhost:3000/admin/",
  ]) {
    const other = h.webViewer(url);
    await other.navigate(url + marker);
    other.close();
  }
  view.close();
  await view.navigate(reading + marker);
  const last = h.webViewer(reading);
  h.unload();
  await last.navigate(reading + marker);
  assert.deepEqual(h.notices, []);
});

test("malformed source links and ambiguous destinations leave student writing alone", async () => {
  const h = diary();
  const file = h.files.get("01-Establish.md")!;
  file.text += "\n## Lecture 2\nAn unrelated heading with the same number.\n";
  const original = file.text;
  for (const url of [
    "https://scalableweb.dev.other.test/chapters/",
    "https://scalableweb.dev/chapters/?private=draft",
    "https://scalableweb.dev/course/private-assessment/",
  ]) {
    h.clipboard = "> text\n\n[Book source](" + url + ")";
    await h.openHighlight();
    assert.match(h.notices.at(-1) ?? "", /Copy highlight/);
  }
  h.clipboard =
    "> text\n\n[Book source](https://scalableweb.dev/chapters/architecture/)";
  await h.run("add-highlight");
  await h.selectLecture(2);
  assert.match(h.notices.at(-1) ?? "", /Keep one Lecture 2 heading/);
  assert.equal(file.text, original);
});

test("TA handoff copies only the reviewed selection and opens a public reading in the split or default browser", async () => {
  const h = diary();
  const selection = "The cache missed on cold requests.";
  h.select(
    "02-Challenge.md",
    selection,
    "Confidential peer feedback.\n" + selection,
  );
  h.clipboard = "existing clipboard";
  await h.run("discuss");
  assert.equal(h.clipboard, "existing clipboard");
  assert.equal(h.ui.get("textarea").value.trim(), selection);
  h.ui.get("textarea").value = "Which measurements cover cold requests?";
  await h.click("Copy and open beside diary");
  assert.equal(h.clipboard, "Which measurements cover cold requests?");
  const url =
    "https://scalableweb.dev/chapters/reality/?assistant=1#what-documented-web-incidents-reveal";
  assert.deepEqual(h.splits, [url]);
  assert.deepEqual(h.external, []);

  const other = diary();
  other.select("02-Challenge.md", selection, selection);
  other.disableReader();
  await other.run("discuss");
  await other.click("Copy and open beside diary");
  assert.match(other.notices.at(-1) ?? "", /Enable Web viewer/);
  await other.click("Copy and open in default browser");
  assert.deepEqual(other.external, [url]);
  assert.equal(other.clipboard.trim(), selection);
});

test("a phase portfolio draft receives only the approved selection and survives a repeated export", async () => {
  const h = diary();
  const selection = "We measured cold reads before setting the TTL.";
  h.select("03-Compare.md", selection, "Private meeting notes.\n" + selection);
  const path = "Portfolio - Compare.md";
  await h.run("portfolio");
  assert.ok(!h.files.has(path));
  await h.click("Add to private draft");
  const draft = h.files.get(path)!;
  assert.match(draft.text, /Course lecture 9 · Portfolio lecture 3/);
  assert.ok(draft.text.includes(selection));
  assert.ok(!draft.text.includes("Private meeting"));
  draft.text += "\nA follow-up I added myself.\n";
  const original = draft.text;
  await h.run("portfolio");
  await h.click("Add to private draft");
  assert.equal(draft.text, original);
});

test("discussing words inside a pasted book quote opens that passage's source", async () => {
  const h = diary();
  const selection = "Measure requests";
  h.select(
    "03-Compare.md",
    selection,
    "> Measure requests at the edge.\n\n[Book source](https://scalableweb.dev/chapters/benchmarking/#which-requests-counted)\n",
  );
  await h.run("discuss");
  assert.equal(h.ui.get("textarea").value.trim(), selection);
  await h.click("Copy and open beside diary");
  assert.deepEqual(h.splits, [
    "https://scalableweb.dev/chapters/benchmarking/?assistant=1#which-requests-counted",
  ]);
});
