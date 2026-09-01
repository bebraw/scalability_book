import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export type OpenGraphCard = {
  imagePath: string;
  label: string;
  title: string;
};

type OpenGraphBrand = {
  author: string;
  domain: string;
  siteTitle: string;
};

type WriteOpenGraphImagesOptions = OpenGraphBrand & {
  buildDir: string;
  cards: OpenGraphCard[];
};

const imageWidth = 1200;
const imageHeight = 630;

export function getOpenGraphImagePath(currentUrl: string | null): string {
  const route = (currentUrl || "/")
    .split(/[?#]/, 1)[0]
    ?.split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-z0-9-]+/gi, "-").toLowerCase())
    .filter(Boolean)
    .join("--");

  return `/assets/og/${route || "home"}.png`;
}

export function getOpenGraphLabel(currentUrl: string | null): string {
  const segments = (currentUrl || "/").split("/").filter(Boolean);
  const [section, entry] = segments;

  if (!section) {
    return "Aalto University course book";
  }

  if (section === "chapters") {
    return "Course book · Chapter";
  }

  if (section === "appendices") {
    return "Course book · Appendix";
  }

  if (section === "parts") {
    return "Course book · Part";
  }

  if (section === "project") {
    return entry ? "Course project · Phase brief" : "Course project";
  }

  if (section === "case-studies") {
    return entry ? "Field evidence · Case study" : "Field evidence";
  }

  if (section === "demos") {
    return "Interactive systems labs";
  }

  if (section === "admin") {
    return "Book administration";
  }

  return "Elements of scalable web development";
}

export function getOpenGraphCardTitle(
  documentTitle: string,
  siteTitle: string,
): string {
  const suffix = ` - ${siteTitle}`;

  return documentTitle.endsWith(suffix)
    ? documentTitle.slice(0, -suffix.length)
    : documentTitle;
}

export async function writeOpenGraphImages({
  author,
  buildDir,
  cards,
  domain,
  siteTitle,
}: WriteOpenGraphImagesOptions): Promise<void> {
  const uniqueCards = new Map<string, OpenGraphCard>();

  for (const card of cards) {
    const existing = uniqueCards.get(card.imagePath);

    if (
      existing &&
      (existing.title !== card.title || existing.label !== card.label)
    ) {
      throw new Error(`Conflicting Open Graph card path: ${card.imagePath}`);
    }

    uniqueCards.set(card.imagePath, card);
  }

  await Promise.all(
    [...uniqueCards.values()].map(async (card) => {
      const relativePath = card.imagePath.replace(/^\/+/, "");
      const outputPath = path.resolve(buildDir, relativePath);

      if (!outputPath.startsWith(`${path.resolve(buildDir)}${path.sep}`)) {
        throw new Error(
          `Open Graph card escapes build directory: ${card.imagePath}`,
        );
      }

      await mkdir(path.dirname(outputPath), { recursive: true });
      await sharp(
        Buffer.from(
          renderOpenGraphSvg(card, { author, domain, siteTitle }),
          "utf8",
        ),
      )
        .png({ compressionLevel: 9 })
        .toFile(outputPath);
    }),
  );
}

export function renderOpenGraphSvg(
  card: OpenGraphCard,
  { author, domain, siteTitle }: OpenGraphBrand,
): string {
  const layout = getTitleLayout(card.title);
  const titleLines = layout.lines
    .map(
      (line, index) =>
        `<text x="72" y="${layout.startY + index * layout.lineHeight}">${escapeXml(line)}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}" viewBox="0 0 ${imageWidth} ${imageHeight}">
  <rect width="1200" height="630" fill="#f8f6f0"/>
  <rect x="0" y="486" width="1200" height="16" fill="#0f766e"/>
  <rect x="0" y="502" width="1200" height="128" fill="#17201d"/>

  <text x="72" y="68" fill="#0f766e" font-family="Avenir Next, Segoe UI, sans-serif" font-size="18" font-weight="700" letter-spacing="3">${escapeXml(card.label.toLocaleUpperCase())}</text>
  <rect x="72" y="88" width="76" height="5" rx="2.5" fill="#0f766e"/>

  <g fill="#17201d" font-family="Georgia, Cambria, Times New Roman, serif" font-size="${layout.fontSize}" font-weight="500">
    ${titleLines}
  </g>

  <g transform="translate(1002 74)" fill="none" stroke="#0f766e">
    <path d="M18 314V244H58V174H98V104H138V34" stroke-width="3"/>
    <path d="M18 314H154" stroke="#bfd8cd" stroke-width="1"/>
    <circle cx="18" cy="314" r="8" fill="#f8f6f0" stroke-width="3"/>
    <circle cx="58" cy="244" r="8" fill="#f8f6f0" stroke-width="3"/>
    <circle cx="98" cy="174" r="8" fill="#f8f6f0" stroke-width="3"/>
    <circle cx="138" cy="104" r="8" fill="#f8f6f0" stroke-width="3"/>
    <path d="M138 104V34M124 48L138 34L152 48" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <text x="72" y="554" fill="#ffffff" font-family="Georgia, Cambria, Times New Roman, serif" font-size="28" font-weight="600">${escapeXml(siteTitle)}</text>
  <text x="72" y="594" fill="#a8b8b0" font-family="Avenir Next, Segoe UI, sans-serif" font-size="17" font-weight="500">${escapeXml(author)}</text>
  <text x="1128" y="594" fill="#99f6e4" font-family="Avenir Next, Segoe UI, sans-serif" font-size="16" font-weight="700" letter-spacing="1.5" text-anchor="end">${escapeXml(domain.toLocaleUpperCase())}</text>

  <g transform="translate(1008 524)">
    <rect x="0" y="38" width="13" height="22" fill="#53635d"/>
    <rect x="25" y="28" width="13" height="32" fill="#0f766e"/>
    <rect x="50" y="18" width="13" height="42" fill="#5eead4"/>
    <rect x="75" y="8" width="13" height="52" fill="#ffffff"/>
  </g>
</svg>`;
}

function getTitleLayout(title: string) {
  const candidates = [76, 70, 62, 54, 48];

  for (const fontSize of candidates) {
    const maxCharacters = Math.max(18, Math.floor(850 / (fontSize * 0.52)));
    const lines = wrapWords(title, maxCharacters);

    if (lines.length <= 4) {
      const lineHeight = Math.round(fontSize * 1.08);
      const blockHeight = (lines.length - 1) * lineHeight;
      const startY = Math.round(285 - blockHeight / 2);

      return { fontSize, lineHeight, lines, startY };
    }
  }

  const lines = wrapWords(title, 34).slice(0, 4);
  const finalLine = lines[3];

  if (finalLine && title.length > lines.join(" ").length) {
    lines[3] = `${finalLine.replace(/[.,;:!?-]*$/, "")}…`;
  }

  return { fontSize: 48, lineHeight: 52, lines, startY: 207 };
}

function wrapWords(value: string, maxCharacters: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;

    if (line && candidate.length > maxCharacters) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines.length ? lines : ["Untitled"];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
