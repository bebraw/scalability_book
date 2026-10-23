import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const files = new Map([
  ["/", ["index.html", "text/html;charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css;charset=utf-8"]],
  ...["app.mjs", "fixture.mjs", "export.mjs"].map((file) => [
    `/${file}`,
    [file, "text/javascript;charset=utf-8"],
  ]),
]);
export async function startServer(port = 0) {
  const server = createServer(async (request, response) => {
    const file = files.get(new URL(request.url, "http://127.0.0.1").pathname);
    if (!file || request.method !== "GET") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    try {
      const content = await readFile(new URL(file[0], import.meta.url));
      response.writeHead(200, {
        "Content-Type": file[1],
        "Cache-Control": "no-store",
      });
      response.end(content);
    } catch {
      response.writeHead(500);
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
  const server = await startServer(Number(process.env.PORT || 4175));
  console.log(`CSV lab: http://127.0.0.1:${server.address().port}`);
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => server.close());
}
