const { isBookOrigin, matchingBookSource } = require("./book-origin.js");
const { startObsidianAssistant } = require("./assistant-runtime.ts");

const keyName = "scalableweb-course-ta-openai";

function allowedReading(url) {
  return isBookOrigin(url) && (url.protocol !== "http:" || url.port === "3000");
}

function assistantReading(app, reading) {
  if (!allowedReading(reading))
    throw new Error("Choose a reading from the course book.");
  const matched = matchingBookSource(app, reading);
  const url = new URL(allowedReading(matched) ? matched.href : reading.href);
  url.searchParams.set("assistant", "1");
  url.searchParams.set("diaryTA", "1");
  return url;
}

/** A controller owns only the host it started for this vault's plugin instance. */
class DiaryAssistant {
  constructor(plugin, Review) {
    this.plugin = plugin;
    this.Review = Review;
  }
  async review(reading, open) {
    const { app } = this.plugin;
    if (this.plugin.taUnloaded) return;
    if (
      !app.secretStorage ||
      !process.getBuiltinModule?.("node:sqlite")?.DatabaseSync
    )
      throw new Error(
        "Update the Obsidian desktop installer for the built-in TA, or open the reading with the separate companion.",
      );
    const url = assistantReading(app, reading);
    if (this.running) {
      if (this.origin !== url.origin)
        throw new Error(
          "Stop Obsidian TA before starting it for a different book website.",
        );
      const started = this.running;
      await started;
      if (started === this.running && !this.plugin.taUnloaded) await open(url);
      return;
    }
    const previous = await this.plugin.loadData();
    if (this.plugin.taUnloaded) return;
    new this.Review(app, "Start the Obsidian TA", (el, modal) => {
      el.createEl("p", {
        text: `The TA will accept connections from ${url.origin} while this vault is open. OpenAI receives your selected context when you send a message and bills your API account for usage.`,
      });
      const model = el
        .createEl("label", { text: "OpenAI model" })
        .createEl("input");
      model.value = previous?.taModel ?? "";
      const key = el
        .createEl("label", { text: "OpenAI API key" })
        .createEl("input", {
          attr: { type: "password", autocomplete: "off", spellcheck: "false" },
        });
      el.createEl("p", {
        text: "Enter a Chat Completions model ID from your account. Obsidian saves the key in its secret storage. Leave the key blank to reuse your saved key.",
      });
      modal.action("Start TA and open reading", async () => {
        const selected = model.value.trim();
        if (!selected) throw new Error("Enter your OpenAI model ID.");
        const credential =
          key.value.trim() || (await app.secretStorage.getSecret(keyName));
        if (!credential) throw new Error("Enter an OpenAI API key.");
        if (this.plugin.taUnloaded || this.running || this.stopping)
          throw new Error(
            "The TA has changed state. Close this dialog and reopen Discuss with the course TA.",
          );
        this.origin = url.origin;
        this.controller = new AbortController();
        const started = startObsidianAssistant({
          vaultPath: app.vault.adapter.getBasePath(),
          origin: url.origin,
          model: selected,
          apiKey: credential,
          version: this.plugin.manifest.version,
          signal: this.controller.signal,
        });
        this.running = started;
        try {
          await started;
          if (started !== this.running) return;
          if (key.value.trim())
            await app.secretStorage.setSecret(keyName, credential);
          key.value = "";
          if (started !== this.running) return;
          const data = await this.plugin.loadData();
          if (started !== this.running) return;
          await this.plugin.saveData({ ...data, taModel: selected });
        } catch (error) {
          if (started !== this.running) return;
          await this.stop();
          if (error.code === "EADDRINUSE")
            throw new Error(
              "The Obsidian TA port is in use. Stop the TA in its other vault, or use the separate companion.",
            );
          throw error;
        }
        if (started === this.running) await open(url);
      });
    }).open();
  }
  async stop() {
    if (this.stopping) return this.stopping;
    if (!this.running) return;
    const started = this.running;
    this.running = null;
    this.controller.abort();
    this.controller = null;
    this.stopping = started.then(
      (host) => host.stop(),
      () => {},
    );
    try {
      await this.stopping;
    } finally {
      this.stopping = null;
    }
  }
}

module.exports = { DiaryAssistant };
