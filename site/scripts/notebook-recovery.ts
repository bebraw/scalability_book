import {
  notebookMarkdown,
  type NotebookEntry,
} from "../../shared/learning-workspace.ts";
import { LearningClient } from "./learning-client.ts";
import {
  downloadFile,
  downloadMarkdown,
  legacyRecovery,
} from "./learning-diary.ts";

function mountRecovery(heading: HTMLElement) {
  const client = new LearningClient();
  const section = document.createElement("section");
  section.id = "notebook-recovery";
  section.setAttribute("aria-labelledby", "notebook-recovery-title");
  section.innerHTML = `<h2 id="notebook-recovery-title">Notebook recovery</h2>
    <p>Start the companion that holds your notes on this computer. Connect to download your entries as Markdown or keep a complete JSON backup with revisions and concept judgments.</p>
    <form><fieldset>
      <div data-connect>
        <label>Companion address <input type="url" required></label>
        <button type="submit" value="connect">Connect companion</button>
      </div>
      <div data-exports hidden>
        <button type="submit" value="markdown">Download previous notes as Markdown</button>
        <button type="submit" value="json">Export notebook backup</button>
      </div>
    </fieldset></form>
    <p role="status"></p>`;
  heading.after(section);
  const form = section.querySelector("form")!;
  const fieldset = form.querySelector("fieldset")!;
  const connect = form.querySelector<HTMLElement>("[data-connect]")!;
  const exports = form.querySelector<HTMLElement>("[data-exports]")!;
  const address = form.querySelector("input")!;
  const status = section.querySelector<HTMLElement>('[role="status"]')!;
  address.value = client.base;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (fieldset.disabled || !(event.submitter instanceof HTMLButtonElement))
      return;
    const action = event.submitter.value;
    fieldset.disabled = true;
    try {
      if (action === "connect") {
        status.textContent = "Connecting…";
        await client.connect(address.value);
        connect.hidden = true;
        exports.hidden = false;
        status.textContent = "Connected to your local companion.";
      } else if (action === "json") {
        const archive = await client.request<unknown>("/export");
        downloadFile(
          "learning-notebook.json",
          JSON.stringify(archive, null, 2),
          "application/json",
        );
        status.textContent = "Notebook backup downloaded.";
      } else if (action === "markdown") {
        const { entries } = await client.request<{ entries: NotebookEntry[] }>(
          "/notebook",
        );
        if (entries.length) {
          downloadMarkdown(
            "Previous learning notes",
            notebookMarkdown(entries),
          );
          status.textContent = "Notebook entries downloaded.";
        } else {
          status.textContent =
            "There are no saved notebook entries to download.";
        }
      }
    } catch (error) {
      connect.hidden = false;
      exports.hidden = true;
      status.textContent =
        error instanceof Error
          ? error.message
          : "Unable to reach the companion.";
    } finally {
      fieldset.disabled = false;
    }
  });
}

const heading = document.querySelector<HTMLElement>(".guide-main h1");
if (legacyRecovery && heading) mountRecovery(heading);
