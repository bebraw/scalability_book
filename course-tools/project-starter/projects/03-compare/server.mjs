import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// This stub owns no application state. Add your own application behavior here
// or replace it with your chosen stack, documenting the decision.
export async function startServer(port = 0) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("Port must be an integer between 0 and 65535.");
  }
  const page = await readFile(new URL("./index.html", import.meta.url));
  const server = createServer((request, response) => {
    let pathname;
    try {
      pathname = new URL(request.url, "http://127.0.0.1").pathname;
    } catch {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Invalid request target");
      return;
    }
    if (pathname !== "/" && pathname !== "/health") {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }
    const isPage = pathname === "/";
    response.writeHead(200, {
      "Content-Type": isPage
        ? "text/html; charset=utf-8"
        : "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(
      request.method === "HEAD"
        ? undefined
        : isPage
          ? page
          : JSON.stringify({ status: "ok", application: "not-implemented" }),
    );
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
  const server = await startServer(
    Number(process.argv[2] ?? process.env.PORT ?? 4177),
  );
  console.log(`Project starter: http://127.0.0.1:${server.address().port}`);
  console.log(
    "Setup is running. The Work Activity Tracker is not implemented.",
  );
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => server.close());
  }
}
