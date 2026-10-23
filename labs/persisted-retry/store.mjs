import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

export function openReceiver(directory) {
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(join(directory, "receiver.sqlite"));
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;
    CREATE TABLE IF NOT EXISTS effects(id INTEGER PRIMARY KEY, message TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS receipts(command_key TEXT PRIMARY KEY, message TEXT NOT NULL, effect_id INTEGER NOT NULL REFERENCES effects(id));`);
  return db;
}
export function openWorker(directory) {
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(join(directory, "worker.sqlite"));
  db.exec(`CREATE TABLE IF NOT EXISTS completions(command_key TEXT PRIMARY KEY, receipt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY, command_key TEXT NOT NULL, used_key TEXT NOT NULL, outcome TEXT NOT NULL);`);
  return db;
}
export function receiverRecord(db) {
  return {
    effects: db.prepare("SELECT id, message FROM effects ORDER BY id").all(),
    receipts: db
      .prepare(
        "SELECT command_key, message, effect_id FROM receipts ORDER BY command_key",
      )
      .all(),
  };
}
export function workerRecord(db) {
  return {
    attempts: db.prepare("SELECT * FROM attempts ORDER BY id").all(),
    completions: db
      .prepare(
        "SELECT command_key, receipt FROM completions ORDER BY command_key",
      )
      .all(),
  };
}
