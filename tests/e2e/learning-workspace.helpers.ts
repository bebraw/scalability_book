import { expect, type Locator, type Page } from "@playwright/test";

export function assistantPanel(page: Page) {
  return page.locator("#learning-assistant");
}
export async function openAssistantSettings(panel: Locator) {
  const settings = panel.locator(".learning-assistant-settings");
  if (!(await settings.evaluate((element) => element.hasAttribute("open"))))
    await settings.locator("summary").first().click();
}
export async function chooseAssistantTool(
  panel: Locator,
  name: "Connect" | "Discuss" | "Peer discussion",
) {
  await expect(panel).toBeVisible();
  const button = panel.getByRole("button", { name, exact: true });
  if (!(await button.isVisible()))
    await panel.getByText("More learning tools", { exact: true }).click();
  await button.click();
  if (name === "Discuss") await openAssistantSettings(panel);
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

export async function downloadedMarkdown(control: Locator) {
  const [download] = await Promise.all([
    control.page().waitForEvent("download"),
    control.click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.md$/);
  const stream = await download.createReadStream();
  if (!stream) throw new Error("Could not read the downloaded Markdown.");
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}
