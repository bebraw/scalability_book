import { expect, type Locator, type Page } from "@playwright/test";

// Follow the pane most recently raised by a header action or deliberate handoff.
export function activeLearningPanel(page: Page) {
  return page.locator('.learning-workspace[data-learning-active="true"]');
}
export async function openAssistantSettings(panel: Locator) {
  const settings = panel.locator(".learning-assistant-settings");
  if (!(await settings.evaluate((element) => element.hasAttribute("open"))))
    await settings.locator("summary").first().click();
}
export async function chooseNotebookTool(panel: Locator, name: string) {
  const page = panel.page();
  const owner =
    name === "Connect"
      ? await panel.getAttribute("data-learning-experience")
      : ["Discuss", "Chapter guide", "Peer discussion"].includes(name)
        ? "assistant"
        : "notebook";
  const target = page.locator(`#learning-${owner}`);
  if (!(await target.isVisible()))
    await page
      .locator(`.site-header [data-learning-toggle="${owner}"]`)
      .click();
  await expect(target).toBeVisible();
  const button = target.getByRole("button", { name, exact: true });
  if (!(await button.isVisible()))
    await target.getByText("More learning tools", { exact: true }).click();
  await button.click();
  if (name === "Discuss") await openAssistantSettings(target);
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
