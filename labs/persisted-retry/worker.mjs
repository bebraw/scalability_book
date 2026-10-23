import { parseArgs } from "node:util";
import { randomUUID } from "node:crypto";
import { openWorker } from "./store.mjs";

const { values } = parseArgs({
  options: {
    dir: { type: "string", default: ".lab-data" },
    receiver: { type: "string", default: "http://127.0.0.1:4181" },
    key: { type: "string", default: "deliver:E42:subscriber-7" },
    "crash-after-effect": { type: "boolean", default: false },
    "fresh-key": { type: "boolean", default: false },
  },
});
const endpoint = new URL(values.receiver);
if (
  endpoint.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname)
)
  throw new Error("Use a loopback HTTP fixture receiver");
const db = openWorker(values.dir);
try {
  const completed = db
    .prepare("SELECT receipt FROM completions WHERE command_key=?")
    .get(values.key);
  if (completed)
    console.log(
      JSON.stringify({
        phase: "already-complete",
        receipt: JSON.parse(completed.receipt),
      }),
    );
  else {
    const usedKey = values["fresh-key"]
      ? `${values.key}:${randomUUID()}`
      : values.key;
    const attempt = db
      .prepare(
        "INSERT INTO attempts(command_key,used_key,outcome) VALUES(?,?,'dispatched')",
      )
      .run(values.key, usedKey);
    const response = await fetch(new URL("/deliver", endpoint), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        key: usedKey,
        message: "Deliver event E42 to subscriber-7",
      }),
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    const receipt = await response.json();
    if (!response.ok)
      throw new Error(`Receiver ${response.status}: ${receipt.error}`);
    db.prepare("UPDATE attempts SET outcome='effect-confirmed' WHERE id=?").run(
      attempt.lastInsertRowid,
    );
    console.log(
      JSON.stringify({
        phase: "receiver-confirmed",
        logicalKey: values.key,
        usedKey,
        receipt,
      }),
    );
    if (values["crash-after-effect"]) {
      // Deliberately interrupt this process before recording completion.
      process.exitCode = 86;
    } else {
      db.prepare(
        "INSERT INTO completions(command_key,receipt) VALUES(?,?)",
      ).run(values.key, JSON.stringify(receipt));
      db.prepare("UPDATE attempts SET outcome='completed' WHERE id=?").run(
        attempt.lastInsertRowid,
      );
      console.log(JSON.stringify({ phase: "completed", receipt }));
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
