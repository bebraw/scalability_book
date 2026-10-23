import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStoredZip, writeDirectoryZip } from "../scripts/lib/zip.ts";

test("source downloads exclude local lab records and generated check evidence", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "book-source-zip-"));
  const source = path.join(directory, "fixture");
  try {
    await mkdir(source);
    await writeFile(
      path.join(source, "README.md"),
      "Synthetic teaching source\n",
    );
    for (const name of [
      ".lab-data",
      "test-results",
      "node_modules",
      "playwright-report",
      ".git",
    ]) {
      await mkdir(path.join(source, name));
      await writeFile(
        path.join(source, name, "synthetic-record.txt"),
        "Must stay local\n",
      );
    }
    const output = path.join(directory, "fixture.zip");
    await writeDirectoryZip(source, output);
    assert.deepEqual(readStoredEntries(await readFile(output)), {
      "fixture/README.md": "Synthetic teaching source\n",
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("stored ZIP archives are deterministic and preserve file contents", () => {
  const entries = [
    { data: Buffer.from("second\n"), name: "example/z.txt" },
    { data: Buffer.from("first\n"), name: "example/a.txt" },
  ];
  const first = createStoredZip(entries);
  const second = createStoredZip([...entries].reverse());

  assert.deepEqual(first, second);
  assert.deepEqual(readStoredEntries(first), {
    "example/a.txt": "first\n",
    "example/z.txt": "second\n",
  });
  assert.equal(first.readUInt32LE(first.length - 22), 0x06054b50);
});

function readStoredEntries(archive: Buffer): Record<string, string> {
  const entries: Record<string, string> = {};
  let offset = 0;

  while (archive.readUInt32LE(offset) === 0x04034b50) {
    const method = archive.readUInt16LE(offset + 8);
    const size = archive.readUInt32LE(offset + 18);
    const nameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = archive.subarray(nameStart, nameStart + nameLength).toString();

    assert.equal(method, 0);
    entries[name] = archive.subarray(dataStart, dataStart + size).toString();
    offset = dataStart + size;
  }

  return entries;
}
