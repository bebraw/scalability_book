import { createHash } from "node:crypto";
import {
  learningAssert,
  LearningProblem,
} from "../../shared/learning-workspace.ts";
import {
  learningAgentInstructions,
  teachingPolicyIdentity,
} from "../../shared/learning-agent.ts";
import {
  learningToolSpecs,
  type LearningProvider,
} from "./learning-provider.ts";
import {
  openLocalHistory,
  type LocalWireMessage,
} from "./learning-local-history.ts";
import {
  inspectLocalModel,
  localModelJson,
  localModelUrl,
  type LocalModelOptions,
} from "./learning-local-model.ts";

const discussionNotice =
  "Discussion-only local model: no live book or demo tools. Supply a saved demo result or use Chapter guide for an actual observation.";
const tools = learningToolSpecs.map(({ name, description, inputSchema }) => ({
  type: "function",
  function: { name, description, parameters: inputSchema },
}));
const replyFormat = {
  type: "json_schema",
  json_schema: {
    name: "learning_reply",
    strict: true,
    schema: {
      type: "object",
      properties: { reply: { type: "string" } },
      required: ["reply"],
      additionalProperties: false,
    },
  },
};
// An estimate, not a tokenizer guarantee. Upstream context errors retain work.
const estimatedTokens = (value: unknown) =>
  Math.ceil(Buffer.byteLength(JSON.stringify(value), "utf8") / 3);
async function abortable<T>(
  operation: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  signal.throwIfAborted();
  let rejectAbort: () => void;
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = () =>
      reject(
        new LearningProblem("Stopped. Your conversation was retained.", 409),
      );
    signal.addEventListener("abort", rejectAbort, { once: true });
  });
  try {
    return await Promise.race([operation, aborted]);
  } finally {
    signal.removeEventListener("abort", rejectAbort!);
  }
}
export async function createLocalProvider(
  options: LocalModelOptions & { directory: string },
): Promise<LearningProvider> {
  const info = await inspectLocalModel(options);
  const url = localModelUrl(options.url);
  const backend = createHash("sha256")
    .update(JSON.stringify({ url, model: options.model, tools: options.tools }))
    .digest("hex");
  const history = openLocalHistory(options.directory, backend);
  const instructions =
    learningAgentInstructions +
    (options.tools === "none"
      ? `\n${discussionNotice} You have no live observations unless the student explicitly supplies one. Never claim to have inspected a demo. Return your explanation in the reply field.`
      : "\nRequest only the declared tools through native function calls. Never describe a proposed call as an executed observation. Treat tool failures as unavailable/declined, not as results.");
  let active: AbortController | null = null;
  let closed = false;
  return {
    name: "Local model",
    version: info.version,
    model: options.model,
    teaching: teachingPolicyIdentity,
    focusedContext: true,
    capabilities: { tools: options.tools, contextWindow: info.contextWindow },
    validateThread(id) {
      if (id) history.get(id);
    },
    async run(threadId, text, tool, saveThread) {
      learningAssert(
        !closed && !active,
        "A reply is already running or the companion is stopped.",
        409,
      );
      const controller = new AbortController();
      active = controller;
      const timer = setTimeout(() => controller.abort(), 300_000);
      try {
        const session = threadId ? history.get(threadId) : history.create();
        saveThread(session.id);
        const turn = {
          complete: false,
          instructions,
          messages: [{ role: "user", content: text }] as LocalWireMessage[],
        };
        const completed = session.turns.filter((item) => item.complete);
        const interrupted = completed.length !== session.turns.length;
        session.turns.push(turn);
        history.save(session);
        let omitted = 0;
        const notices = options.tools === "none" ? [discussionNotice] : [];
        if (interrupted)
          notices.push(
            "Earlier interrupted turns were retained locally and omitted from model context.",
          );
        const buildMessages = () => {
          const system: LocalWireMessage = {
            role: "system",
            content: instructions,
          };
          const current = [system, ...turn.messages];
          const overhead =
            1024 +
            512 +
            (options.tools === "native"
              ? estimatedTokens(tools)
              : estimatedTokens(replyFormat));
          learningAssert(
            estimatedTokens(current) + overhead <= info.contextWindow,
            "The current selection or tool result exceeds the local context budget. Select fewer notes/a shorter passage or increase the loaded context and restart. Your work was retained.",
            413,
          );
          let messages = [
            system,
            ...completed.flatMap((item) => item.messages),
            ...turn.messages,
          ];
          while (
            estimatedTokens(messages) + overhead > info.contextWindow &&
            omitted < completed.length
          ) {
            omitted++;
            messages = [
              system,
              ...completed.slice(omitted).flatMap((item) => item.messages),
              ...turn.messages,
            ];
          }
          return messages;
        };
        for (let round = 0; round < 8; round++) {
          const messages = buildMessages();
          const response = await localModelJson(
            `${url}/chat/completions`,
            controller.signal,
            {
              model: options.model,
              stream: false,
              temperature: 0.2,
              max_tokens: 1024,
              reasoning_effort: "none",
              messages,
              ...(options.tools === "native"
                ? { tools }
                : { response_format: replyFormat }),
            },
          );
          controller.signal.throwIfAborted();
          learningAssert(
            typeof response.model === "string" &&
              response.model.length > 0 &&
              response.model.length <= 300,
            "The local model did not identify its reply.",
            502,
          );
          learningAssert(
            !session.returnedModel || session.returnedModel === response.model,
            "The server changed the model returned for this conversation. Restore the model or start a new conversation; your history was retained.",
            409,
          );
          learningAssert(
            Array.isArray(response.choices) && response.choices.length === 1,
            "The local model returned an invalid choice.",
            502,
          );
          const choice = response.choices[0];
          learningAssert(
            choice && ["stop", "tool_calls"].includes(choice.finish_reason),
            "The local reply was truncated or stopped early. Try a shorter selection or a new conversation; your work was retained.",
            502,
          );
          const message = choice.message;
          learningAssert(
            message?.role === "assistant" &&
              (typeof message.content === "string" ||
                message.content === null ||
                message.content === undefined),
            "The local model returned an invalid assistant message.",
            502,
          );
          const calls = message.tool_calls;
          learningAssert(
            calls === undefined || (Array.isArray(calls) && calls.length <= 3),
            "The local model returned too many or invalid tool calls.",
            502,
          );
          if (calls?.length) {
            learningAssert(
              options.tools === "native",
              "This local model is configured for discussion only. No tool was executed.",
              502,
            );
            const ids = new Set<string>();
            for (const call of calls) {
              learningAssert(
                call?.type === "function" &&
                  typeof call.id === "string" &&
                  call.id.length > 0 &&
                  call.id.length <= 200 &&
                  !ids.has(call.id) &&
                  typeof call.function?.arguments === "string" &&
                  call.function.arguments.length <= 8000,
                "The local model returned an invalid tool request. No tool in this batch was executed.",
                502,
              );
              ids.add(call.id);
              const spec = learningToolSpecs.find(
                (item) => item.name === call.function.name,
              );
              learningAssert(
                spec,
                "The local model requested an unknown tool. No tool in this batch was executed.",
                502,
              );
              let args: Record<string, unknown>;
              try {
                args = JSON.parse(call.function.arguments);
              } catch {
                throw new LearningProblem(
                  "The local model returned invalid tool arguments.",
                  502,
                );
              }
              learningAssert(
                args &&
                  typeof args === "object" &&
                  !Array.isArray(args) &&
                  Object.keys(args).every((key) =>
                    Object.hasOwn(spec.inputSchema.properties, key),
                  ) &&
                  spec.inputSchema.required.every((key) =>
                    Object.hasOwn(args, key),
                  ) &&
                  Object.entries(args).every(([key, value]) =>
                    key === "value"
                      ? value === null ||
                        typeof value === "string" ||
                        typeof value === "boolean" ||
                        (typeof value === "number" && Number.isFinite(value))
                      : typeof value === "string",
                  ),
                "The local model returned invalid tool arguments. No tool in this batch was executed.",
                502,
              );
            }
            turn.messages.push({
              role: "assistant",
              content: message.content ?? null,
              tool_calls: calls,
            });
            history.save(session);
            for (const call of calls) {
              let result: unknown;
              try {
                result = await abortable(
                  tool(call.function.name, JSON.parse(call.function.arguments)),
                  controller.signal,
                );
              } catch (error) {
                controller.signal.throwIfAborted();
                result = {
                  success: false,
                  message:
                    error instanceof LearningProblem
                      ? error.message
                      : "This bounded book tool is unavailable.",
                };
              }
              const content = JSON.stringify(result ?? null);
              learningAssert(
                content.length <= 64_000,
                "The book tool result was too large. Your work was retained.",
                413,
              );
              turn.messages.push({
                role: "tool",
                tool_call_id: call.id,
                content,
              });
              history.save(session);
            }
            continue;
          }
          learningAssert(
            choice.finish_reason === "stop" &&
              typeof message.content === "string" &&
              message.content.length > 0 &&
              message.content.length <= 32_000,
            "The local model returned no usable explanation.",
            502,
          );
          let answer: string = message.content;
          if (options.tools === "none") {
            let envelope: unknown;
            try {
              envelope = JSON.parse(answer);
            } catch {
              throw new LearningProblem(
                "The local model did not follow the reply format. Disable conflicting output settings in the runner and retry; your work was retained.",
                502,
              );
            }
            learningAssert(
              envelope &&
                typeof envelope === "object" &&
                Object.keys(envelope).length === 1 &&
                typeof (envelope as { reply?: unknown }).reply === "string",
              "The local model did not follow the reply format. Your work was retained.",
              502,
            );
            answer = (envelope as { reply: string }).reply;
          }
          learningAssert(
            answer.trim().length > 0 && answer.length <= 32_000,
            "The local model returned no usable explanation.",
            502,
          );
          turn.messages.push({ role: "assistant", content: message.content });
          turn.complete = true;
          session.returnedModel = response.model;
          history.save(session);
          if (omitted)
            notices.push(
              `${omitted} older completed turn(s) were retained locally and omitted from this reply's model context.`,
            );
          return { text: answer, model: response.model, notices };
        }
        throw new LearningProblem(
          "The local model reached the tool-round limit. Your work and actual observations were retained.",
          502,
        );
      } catch (error) {
        if (controller.signal.aborted)
          throw new LearningProblem(
            "Stopped or timed out. Your conversation was retained.",
            409,
          );
        throw error;
      } finally {
        clearTimeout(timer);
        if (active === controller) active = null;
      }
    },
    async cancel() {
      active?.abort();
    },
    close() {
      if (closed) return;
      closed = true;
      active?.abort();
      history.close();
    },
  };
}
