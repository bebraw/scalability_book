import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { learningKeychain } from "../scripts/lib/learning-keychain.ts";

/** Opt in only on a machine/session with an available OS credential store.
 * Every operation targets newly generated synthetic identifiers; there is no
 * personal credential lookup, enumeration, profile access or provider request.
 */
test(
  "native OS credentials survive another process and exact synthetic entries can be removed",
  {
    skip: process.env.LEARNING_KEYCHAIN_LIVE !== "1",
    timeout: 120_000,
  },
  async () => {
    const service = `dev.scalableweb.companion.test.${randomUUID()}`;
    const account = `synthetic-${randomUUID()}`;
    const key = `synthetic-key-${randomUUID()}`;
    let ownsEntry = false;
    try {
      assert.equal(await learningKeychain.get(service, account), null);
      // Set this before saving: a timed-out write might still have completed.
      ownsEntry = true;
      await learningKeychain.set(service, account, key);
      const moduleUrl = new URL(
        "../scripts/lib/learning-keychain.ts",
        import.meta.url,
      ).href;
      const script = `
      import { learningKeychain } from ${JSON.stringify(moduleUrl)};
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      const { service, account, key } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const stored = await learningKeychain.get(service, account);
      if (stored !== key) throw new Error('Synthetic key did not persist across processes.');
      process.stdout.write('verified');
    `;
      const child = spawn(
        process.execPath,
        ["--input-type=module", "--eval", script],
        {
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
      let output = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        output += chunk;
      });
      child.stderr.resume(); // Native errors can contain diagnostics; never relay.
      child.stdin.on("error", () => {});
      const end = once(child, "close");
      const timer = setTimeout(() => child.kill("SIGKILL"), 20_000);
      child.stdin.end(JSON.stringify({ service, account, key }));
      try {
        const [code] = await end;
        assert.equal(
          code,
          0,
          "Synthetic cross-process keychain read failed or timed out.",
        );
        assert.equal(output, "verified");
      } finally {
        clearTimeout(timer);
        if (child.exitCode === null && child.signalCode === null)
          child.kill("SIGKILL");
      }
      assert.equal(await learningKeychain.delete(service, account), true);
      assert.equal(await learningKeychain.get(service, account), null);
    } finally {
      if (ownsEntry) {
        try {
          await learningKeychain.delete(service, account);
          assert.equal(await learningKeychain.get(service, account), null);
        } catch {
          throw new Error(
            `Synthetic keychain cleanup could not be confirmed. Remove only service ${service}, account ${account}, then retry.`,
          );
        }
      }
    }
  },
);
