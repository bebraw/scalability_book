import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, lstat, readdir, writeFile } from "node:fs/promises";
import { StringDecoder } from "node:string_decoder";
import path from "node:path";
import {
  LearningProblem,
  learningAssert,
} from "../../shared/learning-workspace.ts";
import { learningAgentInstructions } from "../../shared/learning-agent.ts";

type Json = Record<string, unknown>;
export interface LearningProvider {
  name: string;
  run(
    threadId: string | null,
    text: string,
    tool: (name: string, args: unknown) => Promise<unknown>,
    saveThread: (id: string) => void,
  ): Promise<string>;
  cancel(): Promise<void>;
  close(): void;
}
const toolSpecs = [
  {
    type: "function",
    name: "read_book",
    description:
      "Read an approved published book page/resource. HTML is static source, not an observed demo.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "observe_demo",
    description:
      "Observe the real active browser demo, its declared controls, current inputs, visible results and authored assumptions.",
    inputSchema: {
      type: "object",
      properties: { demoId: { type: "string" } },
      required: ["demoId"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "change_demo",
    description:
      "Propose one bounded change to a declared live demo control. The student must have saved initial thinking and approve it in the browser. The result is a real observation.",
    inputSchema: {
      type: "object",
      properties: {
        demoId: { type: "string" },
        controlId: { type: "string" },
        value: { type: ["string", "number", "boolean", "null"] },
      },
      required: ["demoId", "controlId", "value"],
      additionalProperties: false,
    },
  },
];
export async function createCodexProvider(options: {
  home: string;
  model?: string;
  binary?: string;
}): Promise<LearningProvider> {
  const home = path.resolve(options.home);
  await mkdir(home, { recursive: true, mode: 0o700 });
  const exists = async (name: string) =>
    lstat(path.join(home, name)).catch(() => null);
  for (const name of [
    "config.toml",
    "AGENTS.md",
    "AGENTS.override.md",
    ".agents",
    "hooks",
    "plugins",
    "rules",
    "requirements.toml",
  ])
    learningAssert(
      !(await exists(name)),
      `Use a dedicated Codex profile without ${name}.`,
    );
  const skills = await exists("skills");
  if (skills)
    learningAssert(
      skills.isDirectory() &&
        (await readdir(path.join(home, "skills"))).every(
          (name) => name === ".system",
        ),
      "Use a dedicated profile without custom skills.",
    );
  const auth = await exists("auth.json");
  learningAssert(
    auth?.isFile() && !auth.isSymbolicLink(),
    "Sign in to the dedicated Codex profile first; see /notebook/setup/.",
  );
  const workspace = path.join(home, "book-workspace");
  await mkdir(workspace, { recursive: true, mode: 0o700 });
  learningAssert(
    (await readdir(workspace)).every((name) => name === ".book-learning-root"),
    "The dedicated book workspace must contain only its root marker.",
  );
  const marker = path.join(workspace, ".book-learning-root");
  const markerState = await lstat(marker).catch(() => null);
  learningAssert(
    !markerState || (markerState.isFile() && !markerState.isSymbolicLink()),
    "The book root marker must be a regular file.",
  );
  await writeFile(marker, "", { mode: 0o600 });
  const config: Json = {
    cli_auth_credentials_store: "file",
    web_search: "disabled",
    project_root_markers: [".book-learning-root"],
    history: { persistence: "none" },
    analytics: { enabled: false },
    feedback: { enabled: false },
    features: Object.fromEntries(
      [
        "apps",
        "auth_elicitation",
        "browser_use",
        "browser_use_external",
        "browser_use_full_cdp_access",
        "code_mode",
        "computer_use",
        "goals",
        "hooks",
        "image_generation",
        "in_app_browser",
        "multi_agent",
        "plugins",
        "remote_plugin",
        "shell_snapshot",
        "shell_tool",
        "skill_mcp_dependency_install",
        "skill_search",
        "tool_call_mcp_elicitation",
        "tool_suggest",
        "unified_exec",
        "view_image",
        "workspace_dependencies",
      ].map((name) => [name, false]),
    ),
  };
  const env: Record<string, string> = {};
  for (const name of [
    "PATH",
    "LANG",
    "LC_ALL",
    "TMPDIR",
    "SYSTEMROOT",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "NO_PROXY",
    "SSL_CERT_FILE",
    "SSL_CERT_DIR",
    "CODEX_CA_CERTIFICATE",
    "NODE_EXTRA_CA_CERTS",
  ])
    if (process.env[name]) env[name] = process.env[name]!;
  Object.assign(env, { CODEX_HOME: home, HOME: home, USERPROFILE: home });
  let child: ChildProcessWithoutNullStreams | null = null;
  let sequence = 0;
  let ready: Promise<void> | null = null;
  const pending = new Map<
    number,
    {
      resolve: (value: Json) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  let active: {
    thread: string;
    turn: string | null;
    tool: (name: string, args: unknown) => Promise<unknown>;
    resolve: (text: string) => void;
    reject: (error: Error) => void;
    text: string;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  const getActive = () => active;
  const fail = () => {
    const error = new LearningProblem(
      "Codex disconnected. Your conversation was retained; reconnect and try again.",
      503,
    );
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pending.clear();
    if (active) {
      clearTimeout(active.timer);
      active.reject(error);
      active = null;
    }
    child = null;
    ready = null;
  };
  const write = (message: Json) =>
    child?.stdin.write(`${JSON.stringify(message)}\n`);
  const rpc = (method: string, params: Json): Promise<Json> =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(
          new LearningProblem(
            "Codex did not respond. Reconnect the companion.",
            504,
          ),
        );
      }, 30_000);
      pending.set(id, { resolve, reject, timer });
      write({ id, method, params });
    });
  async function receive(message: Json) {
    if (typeof message.id === "number" && !message.method) {
      const request = pending.get(message.id);
      if (!request) return;
      clearTimeout(request.timer);
      pending.delete(message.id);
      if (message.error)
        request.reject(
          new LearningProblem(
            "Codex rejected the request. Check the dedicated profile, CLI version and account access.",
            502,
          ),
        );
      else request.resolve((message.result ?? {}) as Json);
      return;
    }
    const params = (message.params ?? {}) as Json;
    if (message.id !== undefined && message.method) {
      if (
        message.method === "item/tool/call" &&
        active &&
        params.threadId === active.thread
      ) {
        try {
          const result = await active.tool(
            String(params.tool),
            params.arguments,
          );
          write({
            id: message.id,
            result: {
              success: true,
              contentItems: [
                { type: "inputText", text: JSON.stringify(result) },
              ],
            },
          });
        } catch (error) {
          write({
            id: message.id,
            result: {
              success: false,
              contentItems: [
                {
                  type: "inputText",
                  text:
                    error instanceof LearningProblem
                      ? error.message
                      : "This bounded book tool is unavailable.",
                },
              ],
            },
          });
        }
      } else if (
        message.method === "item/commandExecution/requestApproval" ||
        message.method === "item/fileChange/requestApproval"
      )
        write({ id: message.id, result: { decision: "decline" } });
      else if (message.method === "item/permissions/requestApproval")
        write({ id: message.id, result: { permissions: {}, scope: "turn" } });
      else
        write({
          id: message.id,
          error: {
            code: -32601,
            message: "This client supports only bounded book tools.",
          },
        });
      return;
    }
    if (!active || params.threadId !== active.thread) return;
    if (message.method === "item/completed") {
      const item = (params.item ?? {}) as Json;
      if (item.type === "agentMessage" && typeof item.text === "string")
        active.text += `${item.text}\n\n`;
    }
    if (message.method === "turn/completed") {
      const turn = (params.turn ?? {}) as Json;
      const current = active;
      active = null;
      clearTimeout(current.timer);
      if (turn.status !== "completed")
        current.reject(
          new LearningProblem(
            "Codex stopped before completing the reply. Your work was retained.",
            502,
          ),
        );
      else
        current.resolve(
          current.text.trim() ||
            "No explanation was returned. Try a shorter question.",
        );
    }
  }
  const start = () =>
    (ready ??= (async () => {
      const args = ["app-server", "--stdio"];
      // Nested settings use dotted TOML overrides, without inheriting a coding profile.
      const flatten = (object: Json, prefix = "") => {
        for (const [key, value] of Object.entries(object)) {
          const name = prefix ? `${prefix}.${key}` : key;
          if (value && typeof value === "object" && !Array.isArray(value))
            flatten(value as Json, name);
          else args.push("-c", `${name}=${JSON.stringify(value)}`);
        }
      };
      flatten(config);
      const process_ = spawn(options.binary ?? "codex", args, {
        cwd: workspace,
        env: env as NodeJS.ProcessEnv,
        stdio: "pipe",
      });
      child = process_;
      process_.stderr.resume(); // Provider diagnostics may contain credentials or prompts; never relay them to the site/log.
      process_.once("error", () => {
        if (child === process_) fail();
      });
      process_.once("exit", () => {
        if (child === process_) fail();
      });
      let buffer = "";
      const decoder = new StringDecoder("utf8");
      process_.stdout.on("data", (chunk: Buffer) => {
        buffer += decoder.write(chunk);
        if (Buffer.byteLength(buffer) > 2_000_000) {
          child?.kill();
          fail();
          return;
        }
        let end: number;
        while ((end = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, end);
          buffer = buffer.slice(end + 1);
          try {
            void receive(JSON.parse(line) as Json).catch(() => {
              child?.kill();
              fail();
            });
          } catch {
            child?.kill();
            fail();
          }
        }
      });
      try {
        await rpc("initialize", {
          clientInfo: {
            name: "scalable-book-learning",
            title: "Book learning companion",
            version: "1",
          },
          capabilities: { experimentalApi: true },
        });
      } catch (error) {
        if (child === process_) {
          process_.kill();
          fail();
        }
        throw error;
      }
      write({ method: "initialized", params: {} });
    })());
  const cancel = async () => {
    const current = getActive();
    if (!current) return;
    active = null;
    clearTimeout(current.timer);
    if (current.turn)
      await rpc("turn/interrupt", {
        threadId: current.thread,
        turnId: current.turn,
      }).catch(() => undefined);
    current.reject(
      new LearningProblem(
        "Stopped. Your conversation and notebook were retained.",
        409,
      ),
    );
  };
  return {
    name: "Codex",
    async run(threadId, text, tool, saveThread) {
      learningAssert(
        !active,
        "A conversation is already running. Wait or stop it first.",
        409,
      );
      await start();
      const params: Json = {
        cwd: workspace,
        approvalPolicy: "never",
        sandbox: "read-only",
        environments: [],
        developerInstructions: learningAgentInstructions,
        ...(options.model ? { model: options.model } : {}),
      };
      const result = await rpc(threadId ? "thread/resume" : "thread/start", {
        ...params,
        ...(threadId ? { threadId } : { dynamicTools: toolSpecs }),
      });
      const thread = result.thread as Json;
      learningAssert(
        typeof thread?.id === "string",
        "Codex returned an invalid thread.",
        502,
      );
      const id = thread.id;
      saveThread(id);
      const completion = new Promise<string>((resolve, reject) => {
        active = {
          thread: id,
          turn: null,
          tool,
          resolve,
          reject,
          text: "",
          timer: setTimeout(() => {
            void cancel();
          }, 300_000),
        };
      });
      void completion.catch(() => undefined);
      try {
        const result = await rpc("turn/start", {
          threadId: id,
          input: [{ type: "text", text, text_elements: [] }],
        });
        const current = getActive();
        if (current) current.turn = String((result.turn as Json)?.id);
        return await completion;
      } catch (error) {
        const current = getActive();
        if (current) {
          clearTimeout(current.timer);
          active = null;
        }
        throw error;
      }
    },
    cancel,
    close() {
      child?.kill();
      fail();
    },
  };
}
