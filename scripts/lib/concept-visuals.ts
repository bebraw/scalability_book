import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { concepts } from "../../shared/concepts.ts";
import { conceptRelationships } from "../../shared/concept-relationships.ts";
import { neighborhood } from "../../shared/concept-graph.ts";
import {
  bookGraphicResources,
  demoResources,
  graphResources,
  type LearningResource,
} from "../../shared/learning-resources.ts";
import { renderConceptGraph } from "./concept-html.ts";
import { renderBookDiagrams } from "./render-book-diagrams.ts";
import { escapeHtml } from "./text.ts";

// Freeze the light theme into the exported image. A fetched SVG must not depend
// on the host page's CSS variables, stylesheets, JavaScript, or selected theme.
export function resolveVisualStyles(styles: string, theme: string): string {
  const tokens = new Map(
    [
      ...theme.split("[data-theme", 1)[0]!.matchAll(/(--[\w-]+):\s*([^;]+);/g),
    ].map((match) => [match[1]!, match[2]!.trim()]),
  );
  return styles
    .replace(
      /var\((--[\w-]+)(?:,\s*([^)]*))?\)/g,
      (_match, name: string, fallback: string) => {
        const value = tokens.get(name) || fallback;
        if (!value) throw new Error(`Unknown visual theme token: ${name}`);
        return value;
      },
    )
    .replace(
      /color-mix\(in srgb,\s*(#[a-f\d]{6})\s+(\d+)%,\s*(#[a-f\d]{6})\s*\)/gi,
      (_match, first: string, percent: string, second: string) => {
        const fraction = Number(percent) / 100;
        const channels = [1, 3, 5].map((offset) =>
          Math.round(
            parseInt(first.slice(offset, offset + 2), 16) * fraction +
              parseInt(second.slice(offset, offset + 2), 16) * (1 - fraction),
          )
            .toString(16)
            .padStart(2, "0"),
        );
        return `#${channels.join("")}`;
      },
    );
}

function wrap(text: string, limit: number) {
  const lines = [""];
  for (const word of text.split(/\s+/)) {
    const last = lines.at(-1)!;
    if (last && `${last} ${word}`.length > limit) lines.push(word);
    else lines[lines.length - 1] = last ? `${last} ${word}` : word;
  }
  return lines;
}

export function frameVisual(
  svg: string,
  resource: LearningResource,
  styles: string,
  graph = false,
): string {
  const bounds = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!bounds) throw new Error(`Missing SVG bounds: ${resource.id}`);
  const width = Number(bounds[1]) + 48;
  const title = wrap(resource.title, Math.floor((width - 48) / 14));
  const caption = wrap(resource.caption, Math.floor((width - 48) / 7.4));
  const top = 40 + title.length * 28;
  const bottom = top + Number(bounds[2]);
  const height = bottom + 36 + caption.length * 20;
  const originalClass = svg.match(/class="([^"]*)"/)?.[1] || "";
  const body = svg
    .replace(/^<svg\b[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    // HTML permits bare data attributes; standalone XML SVG requires values.
    .replace(/\bdata-concept-arrow(?=\s)/g, 'data-concept-arrow=""');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="resource-title resource-description" class="${graph ? "concept-map has-connection-labels" : ""}">
<title id="resource-title">${escapeHtml(resource.title)}</title>
<desc id="resource-description">${escapeHtml(`${resource.caption} ${resource.assumptions}`)}</desc>
<style>${styles}
.concept-edge-label { display: block !important; }
a { text-decoration: none; }
</style>
<rect width="${width}" height="${height}" fill="#f8f6f0"/>
${title.map((line, index) => `<text x="24" y="${34 + index * 28}" fill="#134e4a" font-family="sans-serif" font-size="23" font-weight="700">${escapeHtml(line)}</text>`).join("\n")}
<g transform="translate(24 ${top})" class="${graph ? "concept-map-graphic" : originalClass}">${body}</g>
${caption.map((line, index) => `<text x="24" y="${bottom + 22 + index * 20}" fill="#53635d" font-family="sans-serif" font-size="13">${escapeHtml(line)}</text>`).join("\n")}
</svg>`;
}

export async function writeConceptVisuals(
  root: string,
  buildDir: string,
  siteUrl = "https://scalableweb.dev/",
) {
  const [theme, figures, book, graph] = await Promise.all([
    readFile(path.join(root, "site/styles/theme.css"), "utf8"),
    readFile(path.join(root, "site/styles/figures.css"), "utf8"),
    readFile(path.join(root, "site/styles/book.css"), "utf8"),
    readFile(path.join(root, "site/styles/concepts.css"), "utf8"),
  ]);
  const progression = [...book.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => match[1]!.includes(".progression-"))
    .map((match) => match[0])
    .join("\n");
  const figureStyles = resolveVisualStyles(figures + progression, theme);
  const graphRules = [...graph.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(
      (match) =>
        match[1]!.includes(".concept-map-graphic") ||
        match[1]!.includes(".concept-edge-label"),
    )
    .map((match) => match[0])
    .join("\n");
  const graphStyles = resolveVisualStyles(graphRules, theme);
  const bookDiagrams = renderBookDiagrams();
  const output = path.join(buildDir, "concepts/visuals");
  await mkdir(output, { recursive: true });
  for (const resource of [...graphResources, ...bookGraphicResources]) {
    const isGraph = resource.id.startsWith("graph-");
    let svg: string;
    if (isGraph) {
      const focus =
        resource.id === "graph-complete" ? "" : resource.id.slice(6);
      const ids = focus
        ? [...neighborhood(focus, conceptRelationships)]
        : concepts.map(({ id }) => id);
      const html = renderConceptGraph(
        focus ? `export-${focus}` : "reference-concepts",
        ids,
        focus,
        !focus,
      );
      svg = html.match(/<svg\b[\s\S]*?<\/svg>/)![0];
      svg = svg.replace(
        /href="(\/concepts\/#[a-z-]+)"/g,
        (_match, href: string) =>
          `href="${escapeHtml(new URL(href, siteUrl).href)}"`,
      );
    } else {
      svg = bookDiagrams.get(resource.id)!;
      if (!svg) throw new Error(`Missing book graphic: ${resource.id}`);
    }
    const framed = frameVisual(
      svg,
      resource,
      isGraph ? graphStyles : figureStyles,
      isGraph,
    );
    await writeFile(path.join(output, `${resource.id}.svg`), framed);
    await sharp(Buffer.from(framed))
      .png()
      .toFile(path.join(output, `${resource.id}.png`));
  }
  for (const resource of demoResources)
    await copyFile(
      path.join(root, "site/assets/demo-previews", `${resource.id}.png`),
      path.join(output, `${resource.id}.png`),
    );
}
