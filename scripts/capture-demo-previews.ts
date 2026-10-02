import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { demoCatalog } from "../shared/demo-catalog.ts";
import { demoId } from "../shared/learning-resources.ts";

// Run against a local build after changing a demo's visible default state.
// These are orientation images, not an API for executing a simulation.
const baseUrl = process.argv[2] || "http://127.0.0.1:3000/";
const output = path.resolve("site/assets/demo-previews");
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1200 },
    reducedMotion: "reduce",
  });
  await page.goto(new URL("/demos/", baseUrl).href);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: `
    .site-header, .demo-gallery-item-header { position: static !important; }
    [data-demo-permalink] { visibility: hidden; }
    :target { outline: none !important; }
    * { caret-color: transparent !important; }
  `,
  });
  for (const demo of demoCatalog) {
    const id = demoId(demo.title);
    const element = page.locator(`#${id}`);
    await element.scrollIntoViewIfNeeded();
    if (id === "demo-orchestration-control-loop")
      await page.locator(`#${id}:not([data-busy])`).waitFor();
    await element.screenshot({
      path: path.join(output, `${id}.png`),
      animations: "disabled",
    });
    console.log(`Captured ${id}`);
  }
} finally {
  await browser.close();
}
