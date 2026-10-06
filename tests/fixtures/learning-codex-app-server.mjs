// Synthetic app-server transcript. No provider account or network access.
import { createInterface } from "node:readline";
import { existsSync, unlinkSync } from "node:fs";
let waiting;
const send = (value) => process.stdout.write(JSON.stringify(value) + "\n");
for await (const line of createInterface({ input: process.stdin })) {
  const message = JSON.parse(line);
  if (message.method === "initialize") {
    const flag = `${process.argv[1]}.reject-initialize`;
    if (existsSync(flag)) {
      unlinkSync(flag);
      send({
        id: message.id,
        error: { code: -32000, message: "Synthetic initialization rejection" },
      });
    } else send({ id: message.id, result: {} });
  }
  if (message.method === "thread/start" || message.method === "thread/resume") {
    if (
      message.params.sandbox !== "read-only" ||
      message.params.approvalPolicy !== "never"
    )
      process.exit(3);
    send({
      id: message.id,
      result: { thread: { id: message.params.threadId ?? "synthetic-thread" } },
    });
  }
  if (message.method === "turn/start") {
    send({ id: message.id, result: { turn: { id: "synthetic-turn" } } });
    if (message.params.input[0].text === "disconnect") process.exit(0);
    waiting = true;
    send({
      id: "tool",
      method: "item/tool/call",
      params: {
        threadId: "synthetic-thread",
        turnId: "synthetic-turn",
        tool: "observe_demo",
        arguments: { demoId: "demo-queue-balance-lab" },
      },
    });
    send({
      id: "approval",
      method: "item/commandExecution/requestApproval",
      params: { threadId: "synthetic-thread" },
    });
  }
  if (message.id === "approval" && message.result?.decision !== "decline")
    process.exit(4);
  if (message.id === "tool" && waiting) {
    waiting = false;
    send({
      method: "item/completed",
      params: {
        threadId: "synthetic-thread",
        item: {
          type: "agentMessage",
          text: "Use the actual observation and test a changed interval.",
        },
      },
    });
    send({
      method: "turn/completed",
      params: {
        threadId: "synthetic-thread",
        turn: { id: "synthetic-turn", status: "completed" },
      },
    });
  }
  if (message.method === "turn/interrupt") {
    waiting = false;
    send({ id: message.id, result: {} });
    send({
      method: "turn/completed",
      params: { threadId: "synthetic-thread", turn: { status: "interrupted" } },
    });
  }
}
