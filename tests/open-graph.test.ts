import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  getOpenGraphCardTitle,
  getOpenGraphImagePath,
  getOpenGraphLabel,
  renderOpenGraphSvg,
} from "../scripts/lib/open-graph.ts";

test("derives stable card paths and context labels from public routes", () => {
  assert.equal(getOpenGraphImagePath("/"), "/assets/og/home.png");
  assert.equal(
    getOpenGraphImagePath("/chapters/introduction/"),
    "/assets/og/chapters--introduction.png",
  );
  assert.equal(
    getOpenGraphImagePath("/case-studies/slideotter/"),
    "/assets/og/case-studies--slideotter.png",
  );
  assert.equal(
    getOpenGraphLabel("/appendices/scalability-models/"),
    "Course book · Appendix",
  );
  assert.equal(
    getOpenGraphLabel("/project/compare/"),
    "Course project · Phase brief",
  );
});

test("removes the repeated site name from card titles", () => {
  assert.equal(
    getOpenGraphCardTitle(
      "Architecture - Elements of Scalable Web Development",
      "Elements of Scalable Web Development",
    ),
    "Architecture",
  );
});

test("renders escaped, bounded 1200 by 630 graphics", async () => {
  const svg = renderOpenGraphSvg(
    {
      imagePath: "/assets/og/test.png",
      label: "Chapter & field note",
      title:
        "Queues, pressure, and the assumptions that become visible when systems grow beyond their expected boundaries",
    },
    {
      author: "Juho Vepsäläinen",
      domain: "scalableweb.dev",
      siteTitle: "Elements of Scalable Web Development",
    },
  );
  const titleLines = svg.match(/<text x="72" y="\d+">/g) || [];
  const metadata = await sharp(Buffer.from(svg))
    .png()
    .toBuffer()
    .then((png) => sharp(png).metadata());

  assert.match(svg, /CHAPTER &amp; FIELD NOTE/);
  assert.ok(titleLines.length > 1 && titleLines.length <= 4);
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 630);
});
