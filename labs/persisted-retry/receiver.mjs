import { createServer } from "node:http";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { openReceiver, receiverRecord } from "./store.mjs";
import { applyOnce } from "./apply-once.mjs";

export async function startReceiver(directory, port = 0) {
  const db = openReceiver(directory);
  const server = createServer(async (request, response) => {
    const send = (status, body) => {
      response.writeHead(status, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      response.end(JSON.stringify(body));
    };
    if (request.method === "GET" && request.url === "/health")
      return send(200, { ready: true });
    if (request.method === "GET" && request.url === "/ledger")
      return send(200, receiverRecord(db));
    if (request.method !== "POST" || request.url !== "/deliver")
      return send(404, { error: "Not found" });
    try {
      let raw = "";
      for await (const chunk of request) {
        raw += chunk;
        if (raw.length > 4096)
          return send(413, { error: "Fixture command too large" });
      }
      const command = JSON.parse(raw);
      if (
        typeof command.key !== "string" ||
        !command.key ||
        typeof command.message !== "string"
      )
        return send(400, {
          error: "Expected a nonempty key and string message",
        });
      send(200, applyOnce(db, command));
    } catch (error) {
      send(error.code === "KEY_CONFLICT" ? 409 : 500, { error: error.message });
    }
  });
  server.on("close", () => db.close());
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", resolve);
    });
  } catch (error) {
    db.close();
    throw error;
  }
  return server;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { values } = parseArgs({
    options: {
      dir: { type: "string", default: ".lab-data" },
      port: { type: "string", default: "4181" },
    },
  });
  const server = await startReceiver(values.dir, Number(values.port));
  console.log(
    JSON.stringify({
      ready: true,
      url: `http://127.0.0.1:${server.address().port}`,
    }),
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => server.close());
}
