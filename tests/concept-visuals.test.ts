import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { renderConceptGraph } from "../scripts/lib/concept-html.ts";
import {
  extractConceptMapSvg,
  frameVisual,
  resolveVisualStyles,
  writeConceptVisuals,
} from "../scripts/lib/concept-visuals.ts";
import { graphResources } from "../shared/learning-resources.ts";
import { concepts } from "../shared/concepts.ts";
import { conceptRelationships } from "../shared/concept-relationships.ts";

test("published PNGs visibly paint the relationship shafts", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "book-concept-visuals-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeConceptVisuals(process.cwd(), dir);

  for (const id of ["graph-cache", "graph-complete"]) {
    const base = path.join(dir, "concepts/visuals", id);
    const svg = await readFile(`${base}.svg`, "utf8");
    const png = await sharp(`${base}.png`)
      .removeAlpha()
      .greyscale()
      .raw()
      .toBuffer();
    // Hide only the shafts. Arrowheads, labels, leaders and boxes still paint,
    // so none of them can accidentally satisfy the check.
    for (const direction of ["directed", "undirected"]) {
      const hidden = svg.replace(
        "</style>",
        `[data-direction="${direction}"] [data-concept-line] { stroke: none !important; }</style>`,
      );
      const reference = await sharp(Buffer.from(hidden))
        .removeAlpha()
        .greyscale()
        .raw()
        .toBuffer();
      let darkPixels = 0;
      for (let i = 0; i < png.length && darkPixels < 25; i++) {
        if (reference[i]! - png[i]! > 48) darkPixels++;
      }
      assert.ok(darkPixels >= 25, `${id} has no distinct ${direction} shaft`);
    }
  }
});

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
  const svg = extractConceptMapSvg(html);
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

test("the clustered overview export remains a complete standalone SVG", async () => {
  const svg = extractConceptMapSvg(renderConceptGraph("reference-concepts"));
  const resource = graphResources.find(({ id }) => id === "graph-complete")!;
  const framed = frameVisual(
    svg,
    resource,
    "text { font-family: sans-serif; }",
    true,
  );
  assert.equal((svg.match(/data-concept-cluster=/g) || []).length, 4);
  assert.equal(
    (svg.match(/data-concept-node=/g) || []).length,
    concepts.length,
  );
  assert.equal(
    (svg.match(/data-concept-edge=/g) || []).length,
    conceptRelationships.length,
  );
  assert.ok((await sharp(Buffer.from(framed)).metadata()).width! > 0);
});
