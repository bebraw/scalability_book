import type { Locator, Page } from "@playwright/test";

export async function chooseNotebookTool(panel: Locator, name: string) {
  const button = panel.getByRole("button", { name, exact: true });
  if (!(await button.isVisible()))
    await panel.getByText("More notebook tools", { exact: true }).click();
  await button.click();
}

export async function selectReading(page: Page) {
  return page
    .locator("[data-comment-target]")
    .first()
    .evaluate((paragraph) => {
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      const fragment = range.cloneContents();
      for (const control of fragment.querySelectorAll(
        "button, .paragraph-feedback-actions, [data-paragraph-feedback-panel]",
      ))
        control.remove();
      return (fragment.textContent ?? "").replace(/\s+/g, " ").trim();
    });
}
