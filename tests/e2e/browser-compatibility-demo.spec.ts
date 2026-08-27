import { readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import browserslist from "browserslist";
import ts from "typescript";

const browsers = browserslist(undefined, { path: process.cwd() });
const es2019SafariTargets = browsers.filter(targetsSafariBefore14);
const e2ePort = Number(process.env.E2E_PORT || 3100);
const e2eBuildDir = path.resolve(
  process.cwd(),
  process.env.E2E_BUILD_DIR ||
    path.join(tmpdir(), `scalability-book-e2e-build-${e2ePort}`),
);
const unsupportedTokenKinds = new Map<ts.SyntaxKind, string>([
  [ts.SyntaxKind.BigIntLiteral, "BigInt literal"],
  [ts.SyntaxKind.QuestionQuestionToken, "nullish coalescing (??)"],
  [ts.SyntaxKind.QuestionDotToken, "optional chaining (?.)"],
  [ts.SyntaxKind.QuestionQuestionEqualsToken, "logical assignment"],
  [ts.SyntaxKind.BarBarEqualsToken, "logical assignment"],
  [ts.SyntaxKind.AmpersandAmpersandEqualsToken, "logical assignment"],
]);
const unsupportedBuiltInCalls = new Map([
  ["at", "Array/String.prototype.at"],
  ["replaceAll", "String.prototype.replaceAll"],
]);

function targetsSafariBefore14(target: string) {
  const [browser, versionRange] = target.split(" ");

  if (browser !== "ios_saf" && browser !== "safari") {
    return false;
  }

  const firstVersion = versionRange?.split("-")[0] || "";
  const major = Number.parseInt(firstVersion, 10);

  return Number.isFinite(major) && major < 14;
}

test.describe("browser bundle compatibility", () => {
  test("avoids unsupported syntax and built-ins in eager bundles", async () => {
    test.setTimeout(60_000);

    expect(
      es2019SafariTargets,
      "package.json browserslist should include Safari/iOS Safari targets that need ES2019-safe demo bundles",
    ).not.toEqual([]);

    const files = (await readdir(e2eBuildDir))
      .filter((file) => file.endsWith(".js"))
      .sort();
    const unsupported: Array<{ file: string; feature: string }> = [];

    for (const file of files) {
      const source = await readFile(path.join(e2eBuildDir, file), "utf8");
      const scanner = ts.createScanner(
        ts.ScriptTarget.Latest,
        true,
        ts.LanguageVariant.Standard,
        source,
      );
      const found = new Set<string>();

      for (
        let token = scanner.scan();
        token !== ts.SyntaxKind.EndOfFileToken;
        token = scanner.scan()
      ) {
        const syntax = unsupportedTokenKinds.get(token);

        if (syntax && !found.has(syntax)) {
          found.add(syntax);
          unsupported.push({ file, feature: syntax });
        }
      }

      const sourceFile = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.JS,
      );

      const inspectBuiltInCalls = (node: ts.Node) => {
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === "BigInt" &&
          !found.has("BigInt()")
        ) {
          found.add("BigInt()");
          unsupported.push({ file, feature: "BigInt()" });
        }

        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression)
        ) {
          const feature = unsupportedBuiltInCalls.get(
            node.expression.name.text,
          );

          if (feature && !found.has(feature)) {
            found.add(feature);
            unsupported.push({ file, feature });
          }
        }

        ts.forEachChild(node, inspectBuiltInCalls);
      };

      inspectBuiltInCalls(sourceFile);
    }

    expect(unsupported).toEqual([]);
  });
});
