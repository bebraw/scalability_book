import { Problem, requireThat, obj } from "./course-validation.ts";
export function sameOrigin(request: Request) {
  requireThat(
    request.headers.get("origin") === new URL(request.url).origin,
    "Use the course page to make changes.",
    403,
  );
}
export async function boundedJson(request: Request) {
  requireThat(
    request.headers.get("content-type")?.split(";")[0] === "application/json",
    "Send JSON.",
    415,
  );
  requireThat(request.body, "Missing request body.");
  const reader = request.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 96_000) {
        await reader.cancel();
        throw new Problem("Request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return obj(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (error) {
    if (error instanceof Problem) throw error;
    throw new Problem("Invalid JSON.");
  }
}
