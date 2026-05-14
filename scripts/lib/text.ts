import path from "node:path";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function stableParagraphId(value: string): string {
  const text = stripHtml(value).toLowerCase().replace(/\s+/g, " ").trim();
  const readable =
    slugify(text).split("-").slice(0, 8).join("-") || "paragraph";

  return `p-${readable}-${hashString(text)}`;
}

function hashString(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}

export function titleFromFilename(file: string): string {
  return path
    .basename(file, ".md")
    .replace(/^\d+_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function chapterNumberFromFilename(file: string): string {
  const match = path.basename(file).match(/^(\d+)_/);

  return match ? String(Number(match[1])) : "";
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

export function stripHeadingNumber(value: string): string {
  return value.replace(/^\d+(?:\.\d+)+\s+/, "");
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function escapeAttribute(value: unknown): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

export function parseJsonc(source: string): unknown {
  return JSON.parse(stripTrailingCommas(stripJsonComments(source)));
}

function stripJsonComments(source: string): string {
  let output = "";
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    const next = source[index + 1];

    if (inString) {
      output += char;

      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") {
        index++;
      }
      output += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        output += source[index] === "\n" ? "\n" : " ";
        index++;
      }
      index++;
      continue;
    }

    output += char;
  }

  return output;
}

function stripTrailingCommas(source: string): string {
  let output = "";
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];

    if (inString) {
      output += char;

      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === ",") {
      let nextIndex = index + 1;

      while (/\s/.test(source[nextIndex] || "")) {
        nextIndex++;
      }

      if (source[nextIndex] === "]" || source[nextIndex] === "}") {
        continue;
      }
    }

    output += char;
  }

  return output;
}
