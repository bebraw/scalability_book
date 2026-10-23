import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { responseFor } from "./response.mjs";

const assets = new Map([
  ["/", ["index.html", "text/html"]],
  ["/styles.css", ["styles.css", "text/css"]],
  ["/app.mjs", ["app.mjs", "text/javascript"]],
]);
export async function startServer(port = 0) {
  let version = 1;
  let requests = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const send = (status, body) => {
      response.writeHead(status, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      response.end(JSON.stringify(body));
    };
    if (request.method === "GET" && url.pathname === "/control/log")
      return send(200, { version, requests });
    if (request.method === "POST" && url.pathname === "/control/change") {
      version++;
      return send(200, { version });
    }
    if (request.method === "POST" && url.pathname === "/control/reset") {
      version = 1;
      requests = [];
      return send(200, { version });
    }
    if (request.method === "GET" && url.pathname === "/api/summary") {
      const policy = url.searchParams.get("policy");
      if (!["fresh", "validate"].includes(policy))
        return send(400, { error: "Choose fresh or validate" });
      const ifNoneMatch = request.headers["if-none-match"] ?? null;
      const record = { policy, version, ifNoneMatch, status: null };
      requests.push(record);
      try {
        const result = responseFor({ policy, version, ifNoneMatch });
        if (
          ![200, 304].includes(result.status) ||
          !result.headers ||
          typeof result.headers !== "object"
        )
          throw new Error("Return status 200/304 and headers per SPEC.md");
        record.status = result.status;
        response.writeHead(result.status, {
          "content-type": "application/json",
          ...result.headers,
        });
        response.end(
          result.status === 304
            ? undefined
            : JSON.stringify({ version, total: version + 2 }),
        );
      } catch (error) {
        record.status = 500;
        send(500, { error: error.message });
      }
      return;
    }
    const asset = assets.get(url.pathname);
    if (request.method !== "GET" || !asset)
      return send(404, { error: "Not found" });
    try {
      response.writeHead(200, {
        "content-type": `${asset[1]};charset=utf-8`,
        "cache-control": "no-store",
      });
      response.end(await readFile(new URL(asset[0], import.meta.url)));
    } catch {
      response.end("Fixture unavailable");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return server;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = await startServer(Number(process.env.PORT || 4182));
  console.log(`HTTP cache lab: http://127.0.0.1:${server.address().port}`);
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => server.close());
}
