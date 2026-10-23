import { test } from "node:test";
import assert from "node:assert/strict";
import { serializeEvents } from "../export.mjs";

// Expected bytes come from SPEC.md, independently of the serializer and UI fixture.
test("no visible rows exports only the header", () => {
  assert.equal(serializeEvents([]), "title,location\r\n");
});
test("columns and row order follow the supplied records", () => {
  assert.equal(
    serializeEvents([
      { id: "second", title: "Beta", location: "B" },
      { id: "first", title: "Alpha", location: "A" },
    ]),
    "title,location\r\nBeta,B\r\nAlpha,A\r\n",
  );
});
test("commas and double quotes survive in both columns", () => {
  assert.equal(
    serializeEvents([{ title: 'A, "B"', location: 'Room, "C"' }]),
    'title,location\r\n"A, ""B""","Room, ""C"""\r\n',
  );
});
test("embedded LF and CRLF are preserved inside quoted fields", () => {
  assert.equal(
    serializeEvents([{ title: "One\nTwo", location: "East\r\nWest" }]),
    'title,location\r\n"One\nTwo","East\r\nWest"\r\n',
  );
});
test("a bare carriage return also requires quoting", () => {
  assert.equal(
    serializeEvents([{ title: "A\rB", location: "C" }]),
    'title,location\r\n"A\rB",C\r\n',
  );
});
test("empty strings, Unicode and whitespace remain unchanged", () => {
  assert.equal(
    serializeEvents([{ title: " Åland / 東京 ", location: "" }]),
    "title,location\r\n Åland / 東京 ,\r\n",
  );
});
test("serialization does not mutate records or their order", () => {
  const rows = Object.freeze([
    Object.freeze({ title: "Beta", location: "B" }),
    Object.freeze({ title: "Alpha", location: "A" }),
  ]);
  assert.equal(
    serializeEvents(rows),
    "title,location\r\nBeta,B\r\nAlpha,A\r\n",
  );
});
