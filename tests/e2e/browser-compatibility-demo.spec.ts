import { readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import ts from "typescript";

const e2ePort = Number(process.env.E2E_PORT || 3100);
const e2eBuildDir = path.resolve(
  process.cwd(),
  process.env.E2E_BUILD_DIR ||
    path.join(tmpdir(), `scalability-book-e2e-build-${e2ePort}`),
);

// A targeted guard against known post-baseline features, not a complete
// compatibility analyser. Build targets own syntax lowering; browser journeys
// cover DOM/CSS behavior. Indirect aliases and arbitrary prototype calls are
// deliberately outside this check's scope.
const unsupportedBuiltInCalls = new Set([
  "Array.fromAsync",
  "Object.groupBy",
  "Map.groupBy",
  "Promise.withResolvers",
  "Promise.try",
  "RegExp.escape",
]);

function propertyPath(node: ts.Expression): string | undefined {
  if (ts.isIdentifier(node)) return node.text;

  if (ts.isPropertyAccessExpression(node)) {
    const owner = propertyPath(node.expression);
    return owner && `${owner}.${node.name.text}`;
  }

  if (
    ts.isElementAccessExpression(node) &&
    ts.isStringLiteralLike(node.argumentExpression)
  ) {
    const owner = propertyPath(node.expression);
    return owner && `${owner}.${node.argumentExpression.text}`;
  }

  return undefined;
}

function unsupportedFeatures(source: string, file = "fixture.js"): string[] {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const found = new Set<string>();

  const inspect = (node: ts.Node) => {
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const name = propertyPath(node.expression)?.replace(/^globalThis\./, "");
      if (name && unsupportedBuiltInCalls.has(name)) found.add(`${name}()`);

      const flags = node.arguments?.[1];
      if (
        name === "RegExp" &&
        flags &&
        ts.isStringLiteralLike(flags) &&
        flags.text.includes("v")
      ) {
        found.add("RegExp Unicode sets (v flag)");
      }
    }

    if (
      ts.isRegularExpressionLiteral(node) &&
      node.text.slice(node.text.lastIndexOf("/") + 1).includes("v")
    ) {
      found.add("RegExp Unicode sets (v flag)");
    }

    if (
      ts.isVariableDeclarationList(node) &&
      (node.flags & ts.NodeFlags.Using) !== 0
    ) {
      found.add("explicit resource management (using)");
    }

    if (
      ts.isPropertyDeclaration(node) &&
      node.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.AccessorKeyword,
      )
    ) {
      found.add("class auto-accessor");
    }

    ts.forEachChild(node, inspect);
  };

  inspect(sourceFile);
  return [...found].sort();
}

async function vendorScripts(directory: string): Promise<string[]> {
  const files: string[] = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await vendorScripts(file)));
    else if (entry.name.endsWith(".js")) files.push(file);
  }

  return files;
}

test.describe("browser bundle compatibility", () => {
  test("the guard rejects newer features without misreading supported syntax", () => {
    const negativeControls: Array<[string, string]> = [
      ["Object.groupBy(values, key);", "Object.groupBy()"],
      ["Map['groupBy'](values, key);", "Map.groupBy()"],
      ["globalThis.Promise.withResolvers();", "Promise.withResolvers()"],
      ["Array.fromAsync(values);", "Array.fromAsync()"],
      ["Promise.try(work);", "Promise.try()"],
      ["RegExp.escape(value);", "RegExp.escape()"],
      ["const pattern = /[a&&b]/v;", "RegExp Unicode sets (v flag)"],
      ['new RegExp("[a&&b]", "v");', "RegExp Unicode sets (v flag)"],
      ["using resource = acquire();", "explicit resource management (using)"],
      [
        "await using resource = acquire();",
        "explicit resource management (using)",
      ],
      ["class Example { accessor value = 1; }", "class auto-accessor"],
    ];

    for (const [source, feature] of negativeControls) {
      expect(unsupportedFeatures(source), source).toEqual([feature]);
    }

    expect(
      unsupportedFeatures(String.raw`
        const pattern = /\?\?|\?\.|\|\|=|Object\.groupBy/gu;
        const text = "Object.groupBy(values, key); /pattern/v";
        const last = values.at(-1)?.name ?? "";
        const cleaned = last.replaceAll("_", " ");
        const large = 1n + BigInt(2);
        const owns = Object.hasOwn(record, "id");
        const copy = values.toSorted().toReversed();
        let flag = false;
        flag ||= true;
      `),
    ).toEqual([]);
  });

  test("eager and lazy site bundles avoid known post-baseline features", async () => {
    test.setTimeout(60_000);

    // The site build owns root scripts and vendor/. The independent pinned
    // study exporter under learn/ has its own asset/build contract.
    const files = [
      ...(await readdir(e2eBuildDir))
        .filter((file) => file.endsWith(".js"))
        .map((file) => path.join(e2eBuildDir, file)),
      ...(await vendorScripts(path.join(e2eBuildDir, "vendor"))),
    ].sort();

    expect(files.map((file) => path.relative(e2eBuildDir, file))).toEqual(
      expect.arrayContaining([
        "course.js",
        "learning-workspace.js",
        path.join("vendor", "orchestration-demo.js"),
      ]),
    );

    const unsupported: Array<{ file: string; feature: string }> = [];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      for (const feature of unsupportedFeatures(source, file)) {
        unsupported.push({ file: path.relative(e2eBuildDir, file), feature });
      }
    }

    expect(unsupported).toEqual([]);
  });
});
