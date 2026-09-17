import test from "node:test";
import assert from "node:assert/strict";
import { studyHeaders } from "../shared/study-headers.ts";

test("study demos remain sandboxed under direct and extensionless URLs", () => {
  for (const url of [
    "/learn/pilot/scalability/demos/amdahl.html",
    "/learn/pilot/scalability/demos/amdahl",
    "/learn/pilot/scalability/demos/amdahl/",
    "/learn/pilot/scalability/%64emos/amdahl.html",
  ]) {
    const headers = studyHeaders(url);
    assert.match(headers["Content-Security-Policy"]!, /sandbox allow-scripts/);
    assert.doesNotMatch(
      headers["Content-Security-Policy"]!,
      /allow-same-origin/,
    );
    assert.match(headers["Content-Security-Policy"]!, /connect-src 'none'/);
  }
});

test("study runtime uses JavaScript MIME and revalidates stable filenames", () => {
  for (const url of [
    "/learn/pilot/assets/study.mjs",
    "/learn/pilot/assets/study.css",
    "/learn/pilot/scalability/module.json",
    "/learn/pilot/",
  ]) {
    const headers = studyHeaders(url);
    assert.equal(
      headers["Cache-Control"],
      "public, max-age=0, must-revalidate",
    );
    assert.doesNotMatch(headers["Content-Security-Policy"]!, /sandbox/);
  }
  assert.match(
    studyHeaders("/learn/pilot/assets/study.mjs")["Content-Type"]!,
    /javascript/,
  );
  assert.deepEqual(studyHeaders("/chapters/introduction/"), {});
});
