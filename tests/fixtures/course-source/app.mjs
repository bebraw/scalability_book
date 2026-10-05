import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

export function tracker(state, persist = () => {}) {
  const event = (item, type, actor) =>
    state.events.push({
      id: crypto.randomUUID(),
      workspace: item.workspace,
      item: item.id,
      type,
      actor,
      at: new Date().toISOString(),
    });
  return {
    state,
    create(workspace, title, actor) {
      if (
        !state.workspaces.some((w) => w.id === workspace) ||
        !title?.trim() ||
        !actor?.trim()
      )
        throw new Error("Workspace, title and actor required");
      const item = { id: crypto.randomUUID(), workspace, title, state: "open" };
      state.items.push(item);
      event(item, "item_created", actor);
      persist();
      return item;
    },
    advance(id, next, actor) {
      const item = state.items.find((i) => i.id === id);
      if (
        !item ||
        !actor?.trim() ||
        !({ open: "active", active: "done" }[item.state] === next)
      )
        throw new Error("Unsupported transition");
      item.state = next;
      event(item, next === "active" ? "work_started" : "work_completed", actor);
      persist();
      return item;
    },
    summary(workspace) {
      return Object.fromEntries(
        ["open", "active", "done"].map((stateName) => [
          stateName,
          state.items.filter(
            (i) => i.workspace === workspace && i.state === stateName,
          ).length,
        ]),
      );
    },
  };
}

if (process.argv.includes("--seed")) {
  mkdirSync(".local", { recursive: true });
  writeFileSync(".local/state.json", readFileSync("fixture.json"));
  console.log("Synthetic fixtures initialized");
}
if (process.argv.includes("--serve") || process.argv.includes("--demo")) {
  const state = JSON.parse(readFileSync(".local/state.json", "utf8"));
  const app = tracker(state, () =>
    writeFileSync(".local/state.json", JSON.stringify(state)),
  );
  if (process.argv.includes("--demo"))
    console.log(
      JSON.stringify({ ready: true, summary: app.summary("sample") }),
    );
  else {
    const server = createServer(async (request, response) => {
      try {
        const url = new URL(request.url, "http://localhost");
        if (request.method === "GET") {
          const result =
            url.pathname === "/summary"
              ? app.summary(url.searchParams.get("workspace") || "sample")
              : url.pathname === "/events"
                ? state.events
                    .filter(
                      (e) =>
                        (!url.searchParams.get("workspace") ||
                          e.workspace === url.searchParams.get("workspace")) &&
                        (!url.searchParams.get("type") ||
                          e.type === url.searchParams.get("type")),
                    )
                    .slice()
                    .reverse()
                : state;
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(JSON.stringify(result));
        } else if (
          request.method === "POST" &&
          ["/items", "/advance"].includes(url.pathname)
        ) {
          let body = "";
          for await (const chunk of request) {
            body += chunk;
            if (body.length > 4096) throw new Error("Request too large");
          }
          const data = JSON.parse(body);
          const result =
            url.pathname === "/items"
              ? app.create(data.workspace, data.title, data.actor)
              : app.advance(data.id, data.state, data.actor);
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(JSON.stringify(result));
        } else {
          response.writeHead(404);
          response.end("Unknown operation");
        }
      } catch {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Invalid operation" }));
      }
    });
    server.listen(Number(process.env.PORT || 0), "127.0.0.1", () =>
      console.log(
        `Synthetic tracker: http://127.0.0.1:${server.address().port}`,
      ),
    );
  }
}
