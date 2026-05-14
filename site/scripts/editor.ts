type EasyMDEEditor = {
  codemirror: { focus: () => void };
  value: (value?: string) => string;
};

declare const EasyMDE:
  | (new (options: Record<string, unknown>) => EasyMDEEditor)
  | undefined;

const editor = document.querySelector<HTMLElement>("[data-editor]");
const toggle = document.querySelector<HTMLButtonElement>(
  "[data-editor-toggle]",
);

if (editor && toggle) {
  const textarea = editor.querySelector<HTMLTextAreaElement>(
    "[data-editor-source]",
  );
  const save = editor.querySelector<HTMLButtonElement>("[data-editor-save]");
  const cancel = editor.querySelector<HTMLButtonElement>(
    "[data-editor-cancel]",
  );
  const status = editor.querySelector<HTMLElement>("[data-editor-status]");
  const slug = editor.dataset.chapterSlug;
  let markdownEditor: EasyMDEEditor | undefined;
  let originalSource = "";

  if (!textarea || !save || !cancel || !status || !slug) {
    throw new Error("Editor controls are missing");
  }
  const sourceTextarea = textarea;
  const statusElement = status;

  fetch("/api/editor/status")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Editor API unavailable");
      }

      return response.json();
    })
    .then(() => {
      toggle.hidden = false;
    })
    .catch(() => {});

  toggle.addEventListener("click", async () => {
    if (editor.hidden) {
      await loadSource();
      editor.hidden = false;
      toggle.textContent = "Hide editor";
      getEditor().codemirror.focus();
      return;
    }

    editor.hidden = true;
    toggle.textContent = "Edit";
  });

  cancel.addEventListener("click", () => {
    setEditorValue(originalSource);
    editor.hidden = true;
    toggle.textContent = "Edit";
    setStatus("Changes discarded.");
  });

  save.addEventListener("click", async () => {
    setStatus("Saving...");
    save.disabled = true;

    try {
      const response = await fetch(`/api/chapters/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: getEditorValue() }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Save failed");
      }

      originalSource = getEditorValue();
      setStatus("Saved. Reloading...");
      location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
      save.disabled = false;
    }
  });

  async function loadSource(): Promise<void> {
    if (originalSource) {
      return;
    }

    setStatus("Loading Markdown...");
    const response = await fetch(`/api/chapters/${slug}`);

    if (!response.ok) {
      throw new Error("Unable to load chapter source");
    }

    const data = (await response.json()) as { content: string; file: string };
    originalSource = data.content;
    setEditorValue(data.content);
    setStatus(`Editing ${data.file}`);
  }

  function getEditor(): EasyMDEEditor {
    if (!markdownEditor && typeof EasyMDE !== "undefined") {
      markdownEditor = new EasyMDE({
        element: sourceTextarea,
        autofocus: false,
        autosave: {
          enabled: true,
          uniqueId: `chapter-${slug}`,
          delay: 1000,
        },
        minHeight: "32rem",
        nativeSpellcheck: true,
        previewClass: ["editor-preview", "prose"],
        renderingConfig: {
          codeSyntaxHighlighting: true,
        },
        sideBySideFullscreen: false,
        status: false,
        toolbar: [
          "bold",
          "italic",
          "heading",
          "|",
          "quote",
          "unordered-list",
          "ordered-list",
          "|",
          "link",
          "code",
          "table",
          "|",
          "preview",
          "side-by-side",
          "fullscreen",
          "|",
          "guide",
        ],
      });
    }

    if (!markdownEditor) {
      throw new Error("Markdown editor is unavailable");
    }

    return markdownEditor;
  }

  function getEditorValue(): string {
    return markdownEditor ? markdownEditor.value() : sourceTextarea.value;
  }

  function setEditorValue(value: string): void {
    sourceTextarea.value = value;

    if (typeof EasyMDE !== "undefined") {
      getEditor().value(value);
    }
  }

  function setStatus(message: string): void {
    statusElement.textContent = message;
  }
}
