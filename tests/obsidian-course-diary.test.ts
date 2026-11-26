import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire, isBuiltin } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import * as http from "node:http";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { buildCourseDiaryPlugin } from "../scripts/lib/course-diary-download.ts";
import {
  obsidianCompanionAddress,
  obsidianCompanionPort,
} from "../shared/learning-connection.ts";
import { teachingPolicyIdentity } from "../shared/learning-agent.ts";

const previewOrigin =
  "https://class-pilot-scalability-book.survivejs.workers.dev";
const source = await buildCourseDiaryPlugin(process.cwd(), previewOrigin);
const loadBuiltin = createRequire(import.meta.url);

test("the distributed desktop plugin connects a reviewed reading and retains a first TA reply in private storage", async (t) => {
  const home = await mkdtemp(path.join(tmpdir(), "obsidian-ta-"));
  const model = "synthetic-course-model";
  const key = "synthetic-course-key";
  const reply = "Which offered requests were still waiting at the end?";
  const calls: { url: string; auth?: string; body: string }[] = [];
  let delayDiscovery: (() => void) | undefined;
  const provider = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    calls.push({
      url: req.url!,
      auth: req.headers.authorization,
      body: Buffer.concat(chunks).toString(),
    });
    if (delayDiscovery && req.url === "/v1/models") {
      delayDiscovery();
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify(
        req.url === "/v1/models"
          ? { data: [{ id: model }] }
          : {
              model,
              choices: [
                {
                  finish_reason: "stop",
                  message: { role: "assistant", content: reply },
                },
              ],
            },
      ),
    );
  });
  provider.listen(0, "127.0.0.1");
  await once(provider, "listening");
  const address = provider.address();
  assert.ok(address && typeof address === "object");
  const h = diary({
    desktop: { home, provider: new URL("http://127.0.0.1:" + address.port) },
  });
  async function stop() {
    const before = h.notices.length;
    if (h.run("stop-obsidian-ta")) {
      const deadline = Date.now() + 2000;
      while (!h.notices.slice(before).includes("Obsidian TA stopped.")) {
        assert.ok(
          Date.now() < deadline,
          "Timed out stopping the plugin's companion",
        );
        await delay(10);
      }
    }
  }
  t.after(async () => {
    await stop();
    h.unload();
    await new Promise<void>((resolve) => provider.close(() => resolve()));
    await rm(home, { recursive: true, force: true });
  });
  const question = "Which requests should I count?";
  const privateText = "Unselected private details about the team.";
  const reading = "/chapters/benchmarking/";
  h.webViewer(previewOrigin + reading);
  h.select(
    "Challenge/Lecture 6.md",
    question,
    "> " +
      question +
      "\n\n[Book source](https://scalableweb.dev" +
      reading +
      "#which-requests-counted)\n\n" +
      privateText,
  );
  await h.run("discuss");
  h.ui.get("textarea").value = question;
  await h.click("Use Obsidian TA");
  h.inputs.get("OpenAI model")!.value = model;
  h.inputs.get("OpenAI API key")!.value = key;
  await h.click("Start TA and open reading");
  assert.deepEqual(
    h.external,
    [previewOrigin + reading + "?assistant=1&diaryTA=1#which-requests-counted"],
    h.notices.join("\n"),
  );
  assert.equal(h.clipboard, question);
  assert.deepEqual(Object.entries(h.settings), [["taModel", model]]);
  assert.deepEqual([...h.secrets.values()], [key]);
  assert.deepEqual(
    calls.map((call) => call.url),
    ["/v1/models"],
  );
  let token = "";
  async function call(endpoint: string, body?: object, origin = previewOrigin) {
    return new Promise<Response>((resolve, reject) => {
      const req = http.request(
        obsidianCompanionAddress + endpoint,
        {
          port: h.port,
          method: body ? "POST" : "GET",
          headers: {
            Host: new URL(obsidianCompanionAddress).host,
            Origin: origin,
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: "Bearer " + token } : {}),
          },
        },
        async (res) => {
          const chunks = [];
          for await (const chunk of res) chunks.push(chunk);
          resolve(
            new Response(Buffer.concat(chunks).toString(), {
              status: res.statusCode,
            }),
          );
        },
      );
      req.once("error", reject);
      req.end(body ? JSON.stringify(body) : undefined);
    });
  }
  assert.equal(
    (await call("/connect", {}, "https://scalableweb.dev")).status,
    403,
  );
  token = (await (await call("/connect", {})).json()).token;
  assert.ok(token);
  const status = await (await call("/status")).json();
  assert.equal(status.provider, "OpenAI API");
  assert.deepEqual(status.teaching.policy, teachingPolicyIdentity);
  assert.ok(status.storage.startsWith(home + path.sep));
  const start = await call("/agent/conversations", {
    source: {
      url: previewOrigin + reading,
      kind: "page",
      title: "Synthetic reading",
      anchor: "",
      excerpt: "",
      revision: null,
      conceptIds: [],
    },
  });
  const conversation = await start.json();
  assert.equal(start.status, 201, JSON.stringify(conversation));
  const endpoint = "/agent/conversations/" + conversation.id;
  const sent = await call(endpoint, {
    text: h.clipboard,
    mode: "explanation",
    noteIds: [],
    browserId: webcrypto.randomUUID(),
  });
  assert.equal(sent.status, 202, await sent.text());
  const deadline = Date.now() + 3000;
  for (;;) {
    const updated = await (await call(endpoint)).json();
    if (updated.state === "idle") {
      assert.equal(
        updated.messages.at(-1).text,
        reply,
        JSON.stringify(updated),
      );
      break;
    }
    assert.ok(Date.now() < deadline, JSON.stringify(updated));
    await delay(20);
  }
  assert.deepEqual(
    calls.map((call) => call.url),
    ["/v1/models", "/v1/chat/completions"],
  );
  for (const call of calls) assert.equal(call.auth, "Bearer " + key);
  const payload = JSON.parse(calls[1]!.body);
  assert.equal(payload.model, model);
  assert.ok(calls[1]!.body.includes(question));
  assert.ok(calls[1]!.body.includes("Distinguish authored claims"));
  for (const text of [key, privateText])
    assert.ok(!calls[1]!.body.includes(text));
  await stop();
  assert.equal(h.run("stop-obsidian-ta"), false);
  await h.run("discuss");
  await h.click("Use Obsidian TA");
  assert.equal(h.inputs.get("OpenAI model")!.value, model);
  h.inputs.get("OpenAI API key")!.value = "";
  await h.click("Start TA and open reading");
  token = (await (await call("/connect", {})).json()).token;
  assert.equal(
    (await (await call(endpoint)).json()).messages.at(-1).text,
    reply,
  );
  await stop();

  // Unloading while the provider is still checking this account must release
  // the lock, discard pending settings and leave the reading closed.
  await h.run("discuss");
  await h.click("Use Obsidian TA");
  h.inputs.get("OpenAI model")!.value = "pending-model";
  h.inputs.get("OpenAI API key")!.value = "pending-key";
  const discovering = new Promise<void>((resolve) => {
    delayDiscovery = resolve;
  });
  const opening = h.click("Start TA and open reading");
  await discovering;
  h.unload();
  await opening;
  assert.equal(h.external.length, 2);
  assert.deepEqual(Object.entries(h.settings), [["taModel", model]]);
  assert.deepEqual([...h.secrets.values()], [key]);
  assert.equal(h.run("stop-obsidian-ta"), false);
});

// Obsidian supplies its CommonJS API at runtime. Run its shipping entry point
// against an in-memory vault so these tests cannot touch someone's notes.
function diary({
  deniedClipboardReads = 0,
  desktop = undefined,
}: {
  deniedClipboardReads?: number;
  desktop?: { home: string; provider: URL };
} = {}) {
  const notices: string[] = [];
  const links: string[] = [];
  const external: string[] = [];
  const splits: string[] = [];
  const files = new Map<string, TFile>();
  const commands = new Map();
  const layoutChanges = new Set<() => void>();
  const editorMenus = new Set<
    (menu: unknown, editor: Editor, view: MarkdownView) => void
  >();
  const cleanups: (() => void)[] = [];
  const protocols = new Map<
    string,
    (params: Record<string, string>) => Promise<void>
  >();
  const ui = new Map();
  const inputs = new Map<string, { value?: string }>();
  const secrets = new Map<string, string>();
  let settings = {};
  let port = 0;
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
          createEl: (child: string, attributes?: { text?: string }) => {
            const result = this.contentEl.createEl(child, attributes);
            if (tag === "label" && child === "input" && options.text)
              inputs.set(options.text, result);
            return result;
          },
          addEventListener: (_name: string, action: () => void) =>
            ui.set(options.text, action),
        };
        ui.set(tag, node);
        return node;
      },
      empty: () => {
        if (modal === this) ui.clear();
      },
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
    manifest = { version: "test" };
    loadData() {
      return Promise.resolve(settings);
    }
    saveData(value: object) {
      settings = value;
      return Promise.resolve();
    }
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
    secretStorage: {
      getSecret: (key: string) => secrets.get(key),
      setSecret: (key: string, value: string) => secrets.set(key, value),
    },
    vault: {
      adapter: {
        getBasePath: () => {
          assert.ok(desktop);
          return desktop.home;
        },
      },
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
        if (event === "editor-menu") {
          editorMenus.add(handle);
          return () => editorMenus.delete(handle);
        }
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
  runInNewContext(source, {
    module,
    URL,
    TextEncoder,
    process: Object.assign(Object.create(process), {
      env: {
        ...process.env,
        XDG_DATA_HOME: desktop?.home,
        LOCALAPPDATA: desktop?.home,
      },
    }),
    Headers,
    Response,
    Request,
    ReadableStream,
    AbortController,
    AbortSignal,
    Buffer,
    Uint8Array,
    setTimeout,
    clearTimeout,
    structuredClone,
    crypto: webcrypto,
    require: (name: string) => {
      if (name === "obsidian") return obsidian;
      if (name === "node:os" && desktop)
        return { ...loadBuiltin(name), homedir: () => desktop.home };
      if (name === "node:http" && desktop)
        return {
          ...http,
          // Run the shipped host on an ephemeral socket during tests so a real
          // Obsidian vault can keep its own listener and data directory.
          createServer: (handler: http.RequestListener) => {
            const server = http.createServer(handler);
            const listen = server.listen.bind(server);
            server.listen = ((requested: number, host: string) => {
              assert.equal(requested, obsidianCompanionPort);
              assert.equal(host, "127.0.0.1");
              server.once("listening", () => {
                const address = server.address();
                assert.ok(address && typeof address === "object");
                port = address.port;
              });
              return listen(0, host);
            }) as typeof server.listen;
            return server;
          },
        };
      if (name === "node:https")
        return {
          request: (
            url: URL,
            options: http.RequestOptions,
            callback: (res: http.IncomingMessage) => void,
          ) => {
            assert.ok(desktop);
            assert.equal(url.origin, "https://api.openai.com");
            assert.ok(
              ["/v1/models", "/v1/chat/completions"].includes(url.pathname),
            );
            return http.request(
              new URL(url.pathname, desktop.provider),
              options,
              callback,
            );
          },
        };
      if (isBuiltin(name)) return loadBuiltin(name);
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
  function addNote(filePath: string, text: string) {
    const file = new TFile(filePath, text);
    files.set(filePath, file);
    return file;
  }
  const starter = "docs/diary-pilot";
  for (const filename of readdirSync(starter, { recursive: true })) {
    if (filename.endsWith(".md"))
      addNote(
        filename.split(path.sep).join("/"),
        readFileSync(path.join(starter, filename), "utf8"),
      );
  }
  return {
    files,
    addNote,
    get port() {
      return port;
    },
    inputs,
    secrets,
    get settings() {
      return settings;
    },
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
        querySelector: (tag: string) =>
          tag === "webview" ? { getURL: () => current } : null,
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
      if (command.checkCallback) return command.checkCallback(false);
      return command.callback
        ? command.callback()
        : command.editorCallback(active.editor, active);
    },
    editorMenu() {
      const actions = new Map<string, () => Promise<void>>();
      const menu = {
        addItem(build: (item: typeof menuItem) => void) {
          build(menuItem);
        },
      };
      const menuItem = {
        title: "",
        setTitle(title: string) {
          this.title = title;
          return this;
        },
        setIcon() {
          return this;
        },
        onClick(action: () => Promise<void>) {
          actions.set(this.title, action);
        },
      };
      editorMenus.forEach((handler) => handler(menu, active.editor, active));
      return actions;
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
      let text = extra ? file.text + "\n" + extra : file.text;
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
  const file = h.files.get("Establish/Lecture 2.md")!;
  const section = "# Lecture 2 · Checking an agent’s work";
  h.run("open-lecture");
  await h.selectLecture(2);
  assert.equal(h.links[0], file.path);
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
  assert.ok(
    !h.files.get("Establish/Lecture 3.md")!.text.includes("[Book source]"),
  );
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
  const file = h.files.get("Challenge/Lecture 5.md")!;
  const original = file.text;
  h.clipboard =
    "> The cache missed.\n\n[Book source](https://scalableweb.dev/chapters/benchmarking/#requests)";
  await h.openHighlight();
  await h.selectLecture(5);
  assert.equal(h.ui.get("blockquote").text, "The cache missed.");
  assert.equal(file.text, original);
  await h.click("Save highlight");
  assert.ok(file.text.startsWith(original));
  assert.match(file.text, /> The cache missed/);

  const denied = diary({ deniedClipboardReads: 2 });
  await denied.openHighlight();
  await denied.selectLecture(5);
  assert.match(denied.notices.at(-1) ?? "", /Paste the copied Markdown/);
  assert.equal(denied.files.get(file.path)!.text, original);
});

test("a reviewed highlight stays with the displayed lecture when switching notes and rechecks a replaced file", async () => {
  const h = diary();
  const file = h.files.get("Establish/Lecture 2.md")!;
  const other = h.files.get("Establish/Lecture 3.md")!;
  const initial = other.text;
  h.clipboard =
    "> Check timeouts.\n\n[Book source](https://scalableweb.dev/chapters/benchmarking/)";
  await h.openHighlight();
  await h.selectLecture(2);
  assert.equal(h.ui.get("p").text, "Save in Establish/Lecture 2.md");
  const editor = h.select(other.path, "Lecture 3");
  await h.click("Save highlight");
  assert.match(file.text, /> Check timeouts/);
  assert.equal(editor.getValue(), initial);
  assert.equal(other.text, initial);

  h.clipboard =
    "> A second observation.\n\n[Book source](https://scalableweb.dev/chapters/benchmarking/)";
  await h.openHighlight();
  await h.selectLecture(2);
  const previous = file.text;
  const replacement = h.addNote(file.path, "A new lecture note.");
  await h.click("Save highlight");
  assert.match(h.notices.at(-1)!, /Choose the lecture again/);
  assert.equal(replacement.text, "A new lecture note.");
  assert.equal(file.text, previous);
});

test("a phase overview is never used as the missing lecture's destination", async () => {
  const h = diary();
  h.files.delete("Establish/Lecture 1.md");
  const overview = h.files.get("Establish/01-Establish.md")!;
  const initial = overview.text;
  h.clipboard =
    "> A second worker.\n\n[Book source](https://scalableweb.dev/chapters/benchmarking/)";
  await h.openHighlight();
  await h.selectLecture(1);
  assert.match(h.notices.at(-1)!, /Establish\/Lecture 1\.md/);
  assert.equal(overview.text, initial);
});

test("a book page in a Web viewer can request a reviewed highlight in its own vault", async () => {
  const path = "/chapters/benchmarking/";
  const marker = "#scalableweb-course-diary-add-highlight";
  for (const origin of ["https://scalableweb.dev", "http://127.0.0.1:3000"]) {
    const h = diary();
    const viewer = h.webViewer(origin + path + "#requests");
    const file = h.files.get("Challenge/Lecture 4.md")!;
    const original = file.text;
    h.clipboard =
      "> Measure cold reads.\n\n[Book source](https://scalableweb.dev/chapters/benchmarking/#requests)";
    await viewer.navigate(origin + path + marker);
    await h.selectLecture(4);
    assert.equal(h.ui.get("blockquote").text, "Measure cold reads.");
    assert.equal(file.text, original);
    await h.click("Save highlight");
    assert.ok(file.text.startsWith(original));
    assert.match(file.text, /> Measure cold reads/);
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

test("malformed source links leave student writing alone", async () => {
  const h = diary();
  const file = h.files.get("Establish/Lecture 2.md")!;
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
  assert.equal(file.text, original);
});

test("TA handoff copies only the reviewed selection and opens a public reading in the split or default browser", async () => {
  const h = diary();
  const selection = "The cache missed on cold requests.";
  h.select(
    "Challenge/Lecture 6.md",
    selection,
    "Confidential peer feedback.\n\n## Later reflection\n" + selection,
  );
  h.clipboard = "existing clipboard";
  const discuss = h.editorMenu().get("Discuss with the course TA");
  assert.ok(discuss);
  await discuss();
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
  other.select("Challenge/Lecture 6.md", selection, selection);
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
  h.select(
    "Compare/Lecture 9.md",
    selection,
    "Private meeting notes.\n\n## Later reflection\n" + selection,
  );
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

test("a fresh preview or local lecture keeps discussions on its book and portfolio links shareable", async () => {
  const reading = "/chapters/what-is-scalability/";
  const highlighted = "/chapters/benchmarking/#which-requests-counted";
  for (const origin of [previewOrigin, "http://127.0.0.1:3000"]) {
    const h = diary();
    const file = h.files.get("Establish/Lecture 1.md")!;
    file.text = file.text.replace("https://scalableweb.dev", origin);
    const reflection = "I would measure the first request.";
    file.text += "\n\n" + reflection;
    h.select(file.path, reflection);
    await h.run("discuss");
    await h.click("Copy and open beside diary");
    assert.deepEqual(h.splits, [origin + reading + "?assistant=1"]);
    await h.run("portfolio");
    await h.click("Add to private draft");
    assert.ok(
      h.files
        .get("Portfolio - Establish.md")!
        .text.includes(
          "[Lecture reading](https://scalableweb.dev" + reading + ")",
        ),
    );
    const quote = "Count the offered requests.";
    file.text +=
      "\n\n> " +
      quote +
      "\n\n[Book source](https://scalableweb.dev" +
      highlighted +
      ")";
    h.select(file.path, quote);
    await h.run("discuss");
    await h.click("Copy and open in default browser");
    assert.deepEqual(h.external, [
      origin + highlighted.replace("#", "?assistant=1#"),
    ]);
    await h.run("initial-thinking");
    assert.equal(h.ui.get("input").value, origin + highlighted);
  }
});

test("another branch's reading cannot start the TA or become portfolio attribution", async () => {
  const h = diary();
  const file = h.files.get("Establish/Lecture 1.md")!;
  file.text = file.text.replace(
    "https://scalableweb.dev",
    "https://other-scalability-book.survivejs.workers.dev",
  );
  h.select(file.path, "Would you keep the cache?");
  await h.run("discuss");
  assert.match(h.notices.at(-1) ?? "", /public course reading link/);
  await h.run("portfolio");
  await h.click("Add to private draft");
  assert.doesNotMatch(
    h.files.get("Portfolio - Establish.md")!.text,
    /Lecture reading/,
  );
});

test("discussing words inside a pasted book quote opens that passage's source", async () => {
  const h = diary();
  const selection = "Measure requests";
  h.select(
    "Compare/Lecture 7.md",
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

test("a saved diary selection opens the reviewed paragraph with only opaque attempt references", async () => {
  const h = diary();
  const file = h.files.get("Challenge/Lecture 5.md")!;
  const thought = "I expect the queue to drain more slowly.";
  const paragraph =
    "https://scalableweb.dev/chapters/benchmarking/#p-count-all-requests";
  const editor = h.select(
    file.path,
    thought,
    "> Count all offered requests.\n\n[Book source](" +
      paragraph +
      ")\n\n" +
      thought +
      "\n\nA confidential observation about my team.",
  );
  h.clipboard = "existing clipboard";
  const action = h.editorMenu().get("Use as my initial thinking");
  assert.ok(action);
  await action();
  assert.equal(h.ui.get("blockquote").text, thought);
  assert.equal(h.ui.get("input").value, paragraph);
  assert.deepEqual(h.external, []);
  await h.click("Open class discussion");
  assert.match(h.notices.at(-1)!, /Save this note/);
  assert.deepEqual(h.external, []);

  // The editor normalizes newlines; the original file can have CRLF.
  file.text = editor.getValue().replaceAll("\n", "\r\n");
  await h.click("Open class discussion");
  assert.equal(h.clipboard, "existing clipboard");
  assert.equal(h.external.length, 1);
  const destination = new URL(h.external[0]!);
  const [anchor, references] = destination.hash.split("&diaryAttempt=");
  assert.equal(destination.search, "?inquiry=1");
  assert.equal(destination.origin + destination.pathname + anchor, paragraph);
  const ids = references!.split(".");
  assert.equal(ids.length, 2);
  assert.notEqual(ids[0], ids[1]);
  for (const id of ids)
    assert.match(
      id,
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
    );
});

test("a student's own reflection heading can start peer discussion for that lecture's reading", async () => {
  const h = diary();
  const file = h.files.get("Establish/Lecture 1.md")!;
  const thought = "The cached case took longer on the first request.";
  const editor = h.select(
    file.path,
    thought,
    "## A later reflection\n\n" + thought,
  );
  file.text = editor.getValue();
  await h.run("initial-thinking");
  assert.equal(
    h.ui.get("input").value,
    "https://scalableweb.dev/chapters/what-is-scalability/",
  );
});

test("peer handoff validates the edited source and rechecks the saved passage at confirmation", async () => {
  const h = diary();
  const file = h.files.get("Establish/Lecture 1.md")!;
  const thought = "I counted requests that timed out.";
  const editor = h.select(file.path, thought, thought);
  file.text = editor.getValue();
  await h.run("initial-thinking");
  const address = h.ui.get("input");
  for (const invalid of [
    "https://scalableweb.dev/course/private-assessment/",
    "https://scalableweb.dev/chapters/unknown/",
    "https://scalableweb.dev/chapters/benchmarking/?private=info",
    "https://scalableweb.dev/chapters/benchmarking/#p-a&diaryAttempt=x.y",
    "https://student:secret@scalableweb.dev/chapters/benchmarking/",
    "https://some-other-worker.survivejs.workers.dev/chapters/benchmarking/",
    "https://another-branch-scalability-book.survivejs.workers.dev/chapters/benchmarking/",
    "https://scalableweb.dev.example/chapters/benchmarking/",
  ]) {
    address.value = invalid;
    await h.click("Open class discussion");
    assert.match(h.notices.at(-1)!, /published course reading URL/);
    assert.deepEqual(h.external, []);
  }
  address.value = "http://127.0.0.1:3000/chapters/benchmarking/";
  editor.replaceRange("I revised this before confirming.\n", 0);
  await h.click("Open class discussion");
  assert.match(h.notices.at(-1)!, /note changed/);
  assert.deepEqual(h.external, []);
});

test("the peer handoff accepts reviewed page links and paragraph links on course previews", async () => {
  const h = diary();
  const file = h.files.get("Compare/Lecture 8.md")!;
  const thought = "Cold starts might change this result.";
  for (const source of [
    "http://localhost:3000/chapters/scaling/",
    previewOrigin + "/chapters/scaling/?inquiry=1#p-compare",
  ]) {
    const editor = h.select(file.path, thought, thought);
    file.text = editor.getValue();
    await h.run("initial-thinking");
    h.ui.get("input").value = source;
    await h.click("Open class discussion");
    const opened = new URL(h.external.at(-1)!);
    const chosen = new URL(source);
    assert.equal(
      opened.origin + opened.pathname,
      chosen.origin + chosen.pathname,
    );
    assert.equal(
      opened.hash.slice(1).split("&diaryAttempt=")[0],
      chosen.hash.slice(1),
    );
  }
});

test("the diary suggests the open book's origin only for an unambiguous matching reading", async () => {
  const h = diary();
  const file = h.files.get("Establish/Lecture 1.md")!;
  const thought = "An offered request can time out.";
  const reading = "/chapters/benchmarking/";
  const anchor = "#p-requests";
  const canonical = "https://scalableweb.dev" + reading + anchor;
  h.select(
    file.path,
    thought,
    "[Book source](" + canonical + ")\n\n" + thought,
  );
  h.webViewer("https://elsewhere.test" + reading);
  h.webViewer(previewOrigin + "/chapters/scaling/");
  await h.run("initial-thinking");
  assert.equal(h.ui.get("input").value, canonical);
  const preview = h.webViewer(
    previewOrigin + reading + "?private=skip#unrelated",
  );
  await h.run("initial-thinking");
  assert.equal(h.ui.get("input").value, previewOrigin + reading + anchor);
  const local = "http://localhost:3000";
  h.webViewer(local + reading);
  await h.run("initial-thinking");
  assert.equal(h.ui.get("input").value, canonical);
  preview.close();
  await h.run("initial-thinking");
  assert.equal(h.ui.get("input").value, local + reading + anchor);
});
