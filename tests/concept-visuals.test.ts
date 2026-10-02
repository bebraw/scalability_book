import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { renderConceptGraph } from "../scripts/lib/concept-html.ts";
import {
  frameVisual,
  resolveVisualStyles,
} from "../scripts/lib/concept-visuals.ts";
import { graphResources } from "../shared/learning-resources.ts";

test("standalone styles freeze theme tokens and mixed colors without an external stylesheet", () => {
  const theme = readFileSync("site/styles/theme.css", "utf8");
  const result = resolveVisualStyles(
    "text { fill: var(--text); } rect { fill: color-mix(in srgb, var(--accent) 12%, var(--bg)); }",
    theme,
  );
  assert.match(result, /fill: #17201d/);
  assert.doesNotMatch(result, /var\(|color-mix\(/);
  assert.throws(
    () => resolveVisualStyles("fill: var(--missing)", theme),
    /Unknown visual theme token/,
  );
});

test("a downloaded graph renders as XML with accessible text and visible arrow geometry", async () => {
  const html = renderConceptGraph("export", ["queue", "latency"], "latency");
  const svg = html.match(/<svg\b[\s\S]*?<\/svg>/)![0];
  const resource = graphResources.find(({ id }) => id === "graph-latency")!;
  const framed = frameVisual(
    svg,
    resource,
    "text { font-family: sans-serif; }",
    true,
  );
  assert.match(framed, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(framed, /role="img"/);
  assert.match(framed, /data-concept-arrow=""/);
  assert.match(framed, /can add waiting time to/);
  assert.match(framed, /direction alone does not establish causation/);
  const png = await sharp(Buffer.from(framed)).png().toBuffer();
  assert.equal((await sharp(png).metadata()).format, "png");
});
