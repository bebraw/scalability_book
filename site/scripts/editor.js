const editor = document.querySelector("[data-editor]");
const toggle = document.querySelector("[data-editor-toggle]");

if (editor && toggle) {
  const textarea = editor.querySelector("[data-editor-source]");
  const save = editor.querySelector("[data-editor-save]");
  const cancel = editor.querySelector("[data-editor-cancel]");
  const status = editor.querySelector("[data-editor-status]");
  const slug = editor.dataset.chapterSlug;
  let markdownEditor;
  let originalSource = "";

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
      setStatus(error.message);
      save.disabled = false;
    }
  });

  async function loadSource() {
    if (originalSource) {
      return;
    }

    setStatus("Loading Markdown...");
    const response = await fetch(`/api/chapters/${slug}`);

    if (!response.ok) {
      throw new Error("Unable to load chapter source");
    }

    const data = await response.json();
    originalSource = data.content;
    setEditorValue(data.content);
    setStatus(`Editing ${data.file}`);
  }

  function getEditor() {
    if (!markdownEditor && window.EasyMDE) {
      markdownEditor = new EasyMDE({
        element: textarea,
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

    return markdownEditor;
  }

  function getEditorValue() {
    return markdownEditor ? markdownEditor.value() : textarea.value;
  }

  function setEditorValue(value) {
    textarea.value = value;

    if (window.EasyMDE) {
      getEditor().value(value);
    }
  }

  function setStatus(message) {
    status.textContent = message;
  }
}
