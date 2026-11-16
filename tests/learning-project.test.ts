import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import {
  mkdtemp,
  chmod,
  realpath,
  symlink,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  inspectProjectEvents,
  projectConfiguration,
  projectPhases,
} from "../scripts/lib/learning-project-config.ts";
import { saveLearningApiKey } from "../scripts/lib/learning-api-credentials.ts";
import { lockLearningDirectory } from "../scripts/lib/learning-storage.ts";

const cli =
  process.env.LEARNING_COMPANION_BIN ??
  fileURLToPath(
    new URL("../scripts/learning-companion-entry.ts", import.meta.url),
  );
const secret = "synthetic-course-access-763281";
const otherSecret = "synthetic-unrelated-secret-39157";
const source = path.resolve(import.meta.dirname, "..");
const rootThread = "01111111-1111-4111-8111-111111111111";
const workerIds = [
  "02222222-2222-4222-8222-222222222222",
  "03333333-3333-4333-8333-333333333333",
];

async function files(directory: string): Promise<string[]> {
  if (!existsSync(directory)) return [];
  const result: string[] = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, item.name);
    if (item.isDirectory()) result.push(...(await files(filename)));
    else if (item.isFile()) result.push(filename);
  }
  return result;
}

async function fixture(
  t: { after: (fn: () => Promise<void>) => void },
  installed = true,
) {
  const directory = await mkdtemp(
    path.join(tmpdir(), "book-project-launcher-"),
  );
  t.after(() => rm(directory, { recursive: true, force: true }));
  const data = path.join(directory, "companion");
  const projectData = data + "-projects";
  const workspace = path.join(directory, "student-project");
  await mkdir(workspace);
  await writeFile(
    path.join(workspace, "student.txt"),
    "Keep the student's project unchanged during preflight.\n",
  );
  const packageDirectory = path.join(
    projectData,
    "tools",
    "codex-0.154.0",
    "node_modules",
    "@openai",
    "codex",
  );
  const scenario = path.join(directory, "scenario.json");
  const calls = path.join(directory, "calls.jsonl");
  const versionReady = path.join(directory, "version-ready.txt");
  await writeFile(scenario, JSON.stringify({ mode: "success" }));
  const tty = path.join(directory, "terminal.mjs");
  await writeFile(
    tty,
    'Object.defineProperty(process.stdin, "isTTY", {value:true}); Object.defineProperty(process.stdout, "isTTY", {value:true});\n',
  );
  const fakeCodex = `
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
const args=process.argv.slice(2);
const scenario=JSON.parse(readFileSync(${JSON.stringify(scenario)}, 'utf8'));
const ownVersion = "0.154.0";
const kind=args.includes('--version')?'version':args.includes('exec')?'exec':'launch';
appendFileSync(${JSON.stringify(calls)},JSON.stringify({kind,args,entry:process.argv[1],version:ownVersion,home:process.env.HOME,profile:process.env.CODEX_HOME??null,modelKeyPresent:Boolean(process.env.AALTO_LLM_API_KEY),keyDigest:process.env.AALTO_LLM_API_KEY?createHash('sha256').update(process.env.AALTO_LLM_API_KEY).digest('hex'):null,originalKeyPresent:'COURSE_ACCESS' in process.env,otherSecretPresent:'UNRELATED_SECRET' in process.env,nodeOptionsPresent:'NODE_OPTIONS' in process.env})+'\\n');
if(kind==='version'){
  if(scenario.mode==='version-interrupt'){
    process.on('SIGTERM',()=>{console.log('codex-cli '+ownVersion);process.exit(0);});
    writeFileSync(${JSON.stringify(versionReady)},'ready');
    setInterval(()=>{},1000);
    await new Promise(()=>{});
  }
  console.log('codex-cli '+ownVersion);process.exit(0);
}
if(kind==='launch'){console.log('SYNTHETIC_INTERACTIVE_LAUNCH');process.exit(scenario.launchExit??0);}
const workspace=args[args.indexOf('--cd')+1]??process.cwd();
const profile=process.env.CODEX_HOME;
const config=readFileSync(path.join(profile,'config.toml'),'utf8');
if(scenario.mode==='trust-state')appendFileSync(path.join(profile,'config.toml'),'\\n[projects.'+JSON.stringify(workspace)+']\\ntrust_level = "trusted"\\n');
const fleet=/multi_agent = true/.test(config);
const model=config.match(/^model = "([^"]+)"/m)[1];
const root=${JSON.stringify(rootThread)};
const ids=${JSON.stringify(workerIds)};
const emit=value=>console.log(JSON.stringify(value));
emit({type:'thread.started',thread_id:root});emit({type:'turn.started'});
if(scenario.mode==='empty'){emit({type:'turn.completed',usage:{input_tokens:1,output_tokens:1}});process.exit(0);}
const outputs=fleet?['one.txt','two.txt']:['copy.txt'];
const input=readFileSync(path.join(workspace,'input.txt'));
for(const output of outputs)writeFileSync(path.join(workspace,output),scenario.mode==='wrong-output'?'wrong':input);
if(scenario.mode==='checker-edit')writeFileSync(path.join(workspace,'check.mjs'),'console.log("FILE_COPY_CHECK_PASSED");\\n');
const check=spawnSync(process.execPath,[path.join(workspace,'check.mjs')],{cwd:workspace,encoding:'utf8'});
if(fleet){
  const sessionDir=path.join(profile,'sessions','2026','11','16');mkdirSync(sessionDir,{recursive:true});
  for(let i=0;i<2;i++){
    const id=scenario.mode==='duplicate-worker'?ids[0]:ids[i];
    emit({type:'item.completed',item:{id:'spawn'+i,type:'collab_tool_call',tool:'spawn_agent',sender_thread_id:root,receiver_thread_ids:[id],status:'completed',agents_states:{[id]:{status:'pending_init',message:null}}}});
    const trace=[
      {type:'session_meta',payload:{id,model_provider:'aalto',cwd:workspace,source:{subagent:{thread_spawn:{parent_thread_id:root,depth:1}}}}},
      {type:'turn_context',payload:{model:scenario.mode==='wrong-worker-model'?'unapproved/model':model,cwd:workspace,effort:'none'}},
      {type:'response_item',payload:{type:'function_call',name:'exec_command',call_id:'call'+i,arguments:JSON.stringify({cmd:'cp input.txt '+outputs[i]})}},
      {type:'response_item',payload:{type:'function_call_output',call_id:'call'+i,output:'Process exited with code 0\\nOutput:\\n'}},
      {type:'event_msg',payload:{type:'task_complete',turn_id:'turn'+i,last_agent_message:'Copied '+outputs[i]}},
    ];
    if(scenario.mode!=='idle-workers')writeFileSync(path.join(sessionDir,'rollout-2026-11-16-'+id+'.jsonl'),trace.map(x=>JSON.stringify(x)).join('\\n')+'\\n');
    emit({type:'item.completed',item:{id:'wait'+i,type:'collab_tool_call',tool:'wait',sender_thread_id:root,receiver_thread_ids:[id],status:'completed',agents_states:{[id]:{status:'completed',message:'Copied '+outputs[i]}}}});
    if(scenario.mode!=='missing-close'||i===0)emit({type:'item.completed',item:{id:'close'+i,type:'collab_tool_call',tool:'close_agent',sender_thread_id:root,receiver_thread_ids:[id],status:'completed',agents_states:{[id]:{status:'completed',message:'Copied '+outputs[i]}}}});
  }
}
console.error('Synthetic provider echoed '+process.env.AALTO_LLM_API_KEY);
if(scenario.mode!=='no-command')emit({type:'item.completed',item:{id:'check',type:'command_execution',command:'node check.mjs',aggregated_output:scenario.mode==='wrong-output'?'FILE_COPY_CHECK_PASSED\\n':check.stdout,exit_code:scenario.mode==='wrong-output'?0:check.status,status:'completed'}});
emit({type:'turn.completed',usage:{input_tokens:10,output_tokens:10}});
process.exit(scenario.mode==='nonzero'?1:0);
`;
  if (installed) {
    await mkdir(path.join(packageDirectory, "bin"), { recursive: true });
    await writeFile(
      path.join(packageDirectory, "package.json"),
      JSON.stringify({
        name: "@openai/codex",
        version: "0.154.0",
        type: "module",
      }),
    );
    await writeFile(path.join(packageDirectory, "bin", "codex.js"), fakeCodex);
  }
  const run = async (
    args: string[],
    options: {
      terminal?: boolean;
      preferInstalled?: boolean;
      env?: NodeJS.ProcessEnv;
      preload?: string;
      input?: string;
      interruptAt?: string;
    } = {},
  ) => {
    const child = spawn(
      process.execPath,
      [
        ...(options.terminal ? ["--import", tty] : []),
        ...(options.preload ? ["--import", options.preload] : []),
        cli,
        "project",
        ...(!options.preferInstalled &&
        !args.includes("--forget-key") &&
        !args.includes("--help")
          ? ["--managed-codex"]
          : []),
        ...args,
        "--directory",
        data,
      ],
      {
        cwd: directory,
        env: {
          ...process.env,
          COURSE_ACCESS: secret,
          UNRELATED_SECRET: otherSecret,
          ...options.env,
        },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (chunk) => (stdout += String(chunk)));
    child.stderr.on("data", (chunk) => (stderr += String(chunk)));
    child.stdin.on("error", () => {});
    child.stdin.end(options.input ?? "");
    const closed = once(child, "close");
    const timer = setTimeout(() => child.kill("SIGKILL"), 15000);
    if (options.interruptAt) {
      const until = Date.now() + 5000;
      while (
        !existsSync(options.interruptAt) &&
        child.exitCode === null &&
        Date.now() < until
      )
        await new Promise((resolve) => setTimeout(resolve, 10));
      assert.ok(
        existsSync(options.interruptAt),
        "Synthetic version command never became ready for interruption",
      );
      child.kill("SIGINT");
    }
    const [code, signal] = await closed;
    clearTimeout(timer);
    return { code, signal, stdout, stderr };
  };
  const installPathCodex = async (name = "external tools") => {
    const binaries = path.join(directory, name);
    await mkdir(binaries, { recursive: true });
    const executable = path.join(binaries, "codex-real.mjs");
    const command = path.join(binaries, "codex");
    await writeFile(
      executable,
      "#!/usr/bin/env node\n" +
        fakeCodex.replace(
          'const ownVersion = "0.154.0";',
          'const ownVersion = scenario.version ?? "0.154.0";',
        ),
    );
    await chmod(executable, 0o755);
    await symlink(executable, command);
    // Any unexpected fallback must remain local and fail, never install from npm.
    const installAttempt = path.join(directory, "unexpected-install.txt");
    const npm = path.join(binaries, "npm");
    await writeFile(
      npm,
      `#!/usr/bin/env node
import {writeFileSync} from "node:fs";
writeFileSync(${JSON.stringify(installAttempt)}, "unexpected npm call");
process.exit(71);
`,
    );
    await chmod(npm, 0o755);
    return {
      command,
      executable: await realpath(executable),
      installAttempt,
      env: {
        PATH: [
          binaries,
          path.dirname(process.execPath),
          "/usr/bin",
          "/bin",
        ].join(path.delimiter),
      },
    };
  };
  const check = (phase = "challenge") =>
    run([
      phase,
      "--workspace",
      workspace,
      "--check",
      "--api-key-env",
      "COURSE_ACCESS",
    ]);
  const invocations = async () =>
    existsSync(calls)
      ? (await readFile(calls, "utf8"))
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line))
      : [];
  const setMode = (mode: string, extra: object = {}) =>
    writeFile(scenario, JSON.stringify({ mode, ...extra }));
  return {
    directory,
    data,
    projectData,
    workspace,
    packageDirectory,
    versionReady,
    run,
    check,
    invocations,
    setMode,
    installPathCodex,
  };
}

test("bundled phase profiles match the independently downloadable course configurations", async () => {
  const names = {
    establish: "aalto-glm-codex-2026-11-16.config.toml",
    challenge: "aalto-qwen-codex-2026-11-16.challenge.toml",
    compare: "aalto-qwen-codex-2026-11-16.compare.toml",
  };
  for (const phase of projectPhases) {
    assert.equal(
      projectConfiguration(phase).config,
      await readFile(
        path.join(source, "docs/course-environments", names[phase]),
        "utf8",
      ),
    );
  }
});

test("a fluent successful turn without an actual command result is not a passed setup check", () => {
  const trace = JSON.stringify({
    type: "turn.completed",
    usage: { input_tokens: 1, output_tokens: 1 },
  });
  assert.throws(
    () => inspectProjectEvents(trace, "challenge"),
    /checker|command/i,
  );
});

test("print is side-effect free and needs neither a key nor an installed harness", async (t) => {
  const f = await fixture(t, false);
  const result = await f.run(
    ["compare", "--workspace", f.workspace, "--print"],
    { env: { COURSE_ACCESS: "", AALTO_LLM_API_KEY: "" } },
  );
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Qwen\/Qwen3\.8-27B-FP8/);
  assert.match(result.stdout, /0\.154\.0/);
  assert.match(result.stdout, /multi_agent = true/);
  assert.equal(existsSync(f.data), false);
  assert.equal(existsSync(f.projectData), false);
  assert.deepEqual(await f.invocations(), []);
});

test("print never probes an available Codex or opens the keychain", async (t) => {
  const f = await fixture(t, false);
  const installed = await f.installPathCodex();
  const keychain = await mockedKeychain(f.directory);
  const result = await f.run(
    ["challenge", "--workspace", f.workspace, "--print"],
    {
      preferInstalled: true,
      preload: keychain.preload,
      env: { ...installed.env, COURSE_ACCESS: "", AALTO_LLM_API_KEY: "" },
    },
  );
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /installed stable >=0\.154\.0/);
  assert.equal(existsSync(f.data), false);
  assert.equal(existsSync(f.projectData), false);
  assert.equal(existsSync(keychain.readLog), false);
  assert.equal(existsSync(installed.installAttempt), false);
  assert.deepEqual(await f.invocations(), []);
});

test("a recent installed Codex is reused without installation or changes to existing settings", async (t) => {
  const f = await fixture(t, false);
  const installed = await f.installPathCodex();
  await f.setMode("success", { version: "0.155.0" });
  const home = path.join(f.directory, "synthetic-home");
  const globalProfile = path.join(home, ".codex");
  await mkdir(globalProfile, { recursive: true });
  await mkdir(path.join(f.data, "codex"), { recursive: true });
  const unchanged = new Map([
    [path.join(globalProfile, "config.toml"), 'model = "existing-model"\n'],
    [path.join(globalProfile, "auth.json"), '{"synthetic":"existing-auth"}\n'],
    [path.join(f.data, "companion-settings.json"), '{"provider":"notebook"}\n'],
    [path.join(f.data, "codex", "config.toml"), "Existing teaching profile\n"],
  ]);
  for (const [filename, content] of unchanged)
    await writeFile(filename, content);
  const result = await f.run(
    [
      "challenge",
      "--workspace",
      f.workspace,
      "--check",
      "--api-key-env",
      "COURSE_ACCESS",
    ],
    {
      preferInstalled: true,
      env: { ...installed.env, HOME: home, CODEX_HOME: globalProfile },
    },
  );
  assert.equal(result.code, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /Selected Codex 0\.155\.0 \(installed\)/);
  assert.equal(existsSync(path.join(f.projectData, "tools")), false);
  assert.equal(existsSync(installed.installAttempt), false);
  for (const [filename, content] of unchanged)
    assert.equal(await readFile(filename, "utf8"), content);
  assert.deepEqual(await readdir(f.workspace), ["student.txt"]);
  const calls = await f.invocations();
  assert.deepEqual(
    calls.map((call) => call.kind),
    ["version", "exec"],
  );
  const profile = path.join(
    f.projectData,
    "profiles",
    "aalto-qwen-codex-2026-11-16-challenge-installed-0.155.0",
  );
  assert.equal(calls[0].profile, path.join(f.projectData, "harness-probe"));
  assert.equal(calls[1].profile, profile);
  for (const call of calls) {
    assert.equal(call.entry, installed.command);
    assert.equal(call.home, home);
    assert.equal(call.originalKeyPresent, false);
    assert.equal(call.otherSecretPresent, false);
    assert.equal(call.modelKeyPresent, call.kind === "exec");
  }
  const receipt = JSON.parse(
    await readFile(path.join(profile, "preflight.json"), "utf8"),
  );
  assert.equal(receipt.status, "passed");
  assert.equal(receipt.codex, "0.155.0");
  assert.deepEqual(receipt.harness, {
    command: installed.command,
    args: [],
    version: "0.155.0",
    source: "installed",
    executable: installed.executable,
  });
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret));
});

test("installed Codex version and executable changes invalidate cached setup checks", async (t) => {
  const f = await fixture(t, false);
  const first = await f.installPathCodex();
  const launch = (env: NodeJS.ProcessEnv) =>
    f.run(
      [
        "challenge",
        "--workspace",
        f.workspace,
        "--api-key-env",
        "COURSE_ACCESS",
      ],
      { terminal: true, preferInstalled: true, env },
    );
  const receiptPath = (version: string) =>
    path.join(
      f.projectData,
      "profiles",
      `aalto-qwen-codex-2026-11-16-challenge-installed-${version}`,
      "preflight.json",
    );
  const countChecks = async () =>
    (await f.invocations()).filter((call) => call.kind === "exec").length;
  for (let run = 0; run < 2; run++) {
    const result = await launch(first.env);
    assert.equal(result.code, 0, result.stderr + result.stdout);
  }
  assert.equal(
    await countChecks(),
    1,
    "An unchanged installation should reuse its successful check",
  );
  const originalText = await readFile(receiptPath("0.154.0"), "utf8");
  const original = JSON.parse(originalText);
  await f.setMode("success", { version: "0.155.0" });
  const upgraded = await launch(first.env);
  assert.equal(upgraded.code, 0, upgraded.stderr + upgraded.stdout);
  assert.equal(
    await countChecks(),
    2,
    "A new installed version needs its own setup check",
  );
  const newer = JSON.parse(await readFile(receiptPath("0.155.0"), "utf8"));
  assert.equal(newer.codex, "0.155.0");
  assert.notEqual(newer.digest, original.digest);
  assert.equal(await readFile(receiptPath("0.154.0"), "utf8"), originalText);
  const second = await f.installPathCodex("other external tools");
  const moved = await launch(second.env);
  assert.equal(moved.code, 0, moved.stderr + moved.stdout);
  assert.equal(
    await countChecks(),
    3,
    "A different binary of the same version needs its own setup check",
  );
  const replaced = JSON.parse(await readFile(receiptPath("0.155.0"), "utf8"));
  assert.equal(replaced.harness.command, second.command);
  assert.equal(replaced.harness.executable, second.executable);
  assert.notEqual(replaced.digest, newer.digest);
  const newTarget = path.join(
    path.dirname(second.executable),
    "replacement.mjs",
  );
  await writeFile(newTarget, await readFile(second.executable));
  await chmod(newTarget, 0o755);
  await rm(second.command);
  await symlink(newTarget, second.command);
  const retargeted = await launch(second.env);
  assert.equal(retargeted.code, 0, retargeted.stderr + retargeted.stdout);
  assert.equal(
    await countChecks(),
    4,
    "Changing a symlink's target must invalidate the check even when its command path and version stay the same",
  );
  const linked = JSON.parse(await readFile(receiptPath("0.155.0"), "utf8"));
  assert.equal(linked.harness.command, second.command);
  assert.equal(linked.harness.executable, await realpath(newTarget));
  assert.notEqual(linked.digest, replaced.digest);
  assert.equal(existsSync(first.installAttempt), false);
});

test("an installed Codex failing the phase check does not silently switch harnesses", async (t) => {
  const f = await fixture(t, false);
  const installed = await f.installPathCodex();
  await f.setMode("empty", { version: "0.155.0" });
  const result = await f.run(
    ["challenge", "--workspace", f.workspace, "--api-key-env", "COURSE_ACCESS"],
    { terminal: true, preferInstalled: true, env: installed.env },
  );
  assert.notEqual(result.code, 0, result.stdout);
  const calls = await f.invocations();
  assert.deepEqual(
    calls.map((call) => call.kind),
    ["version", "exec"],
  );
  assert.equal(existsSync(installed.installAttempt), false);
  const receiptFile = (await files(f.projectData)).find(
    (filename) => path.basename(filename) === "preflight.json",
  )!;
  const receipt = JSON.parse(await readFile(receiptFile, "utf8"));
  assert.equal(receipt.status, "failed");
  assert.equal(receipt.harness.source, "installed");
});

test("managed Codex selection bypasses a suitable executable on PATH", async (t) => {
  const f = await fixture(t);
  const installed = await f.installPathCodex();
  await f.setMode("success", { version: "0.155.0" });
  const result = await f.run(
    [
      "challenge",
      "--workspace",
      f.workspace,
      "--check",
      "--api-key-env",
      "COURSE_ACCESS",
    ],
    { env: installed.env },
  );
  assert.equal(result.code, 0, result.stderr + result.stdout);
  const calls = await f.invocations();
  assert.deepEqual(
    calls.map((call) => call.kind),
    ["version", "exec"],
  );
  for (const call of calls)
    assert.equal(call.entry, path.join(f.packageDirectory, "bin", "codex.js"));
  const receiptFile = (await files(f.projectData)).find(
    (filename) => path.basename(filename) === "preflight.json",
  )!;
  const receipt = JSON.parse(await readFile(receiptFile, "utf8"));
  assert.equal(receipt.codex, "0.154.0");
  assert.equal(receipt.harness.source, "managed");
  assert.equal(existsSync(installed.installAttempt), false);
});

test("an older installed Codex falls back to the managed version", async (t) => {
  const f = await fixture(t);
  const installed = await f.installPathCodex();
  await f.setMode("success", { version: "0.99.0" });
  const result = await f.run(
    [
      "challenge",
      "--workspace",
      f.workspace,
      "--check",
      "--api-key-env",
      "COURSE_ACCESS",
    ],
    { preferInstalled: true, env: installed.env },
  );
  assert.equal(result.code, 0, result.stderr + result.stdout);
  const calls = await f.invocations();
  assert.deepEqual(
    calls.map((call) => call.kind),
    ["version", "version", "exec"],
  );
  assert.equal(calls[0].entry, installed.command);
  assert.equal(calls[0].modelKeyPresent, false);
  for (const call of calls.slice(1))
    assert.equal(call.entry, path.join(f.packageDirectory, "bin", "codex.js"));
  const receiptFile = (await files(f.projectData)).find(
    (filename) => path.basename(filename) === "preflight.json",
  )!;
  const receipt = JSON.parse(await readFile(receiptFile, "utf8"));
  assert.equal(receipt.codex, "0.154.0");
  assert.equal(receipt.harness.source, "managed");
  assert.equal(existsSync(installed.installAttempt), false);
});

test("the setup check uses isolated project state, filters credentials, and retains independently checked evidence", async (t) => {
  const f = await fixture(t);
  await mkdir(path.join(f.data, "codex"), { recursive: true });
  const settings = '{"provider":"notebook","port":8788}\n';
  const existingConfig = "Existing read-only teaching profile\n";
  await writeFile(path.join(f.data, "companion-settings.json"), settings);
  await writeFile(path.join(f.data, "codex", "config.toml"), existingConfig);
  // A running book companion holds its own lease; project setup must coexist.
  const releaseBook = lockLearningDirectory(f.data);
  t.after(releaseBook);
  const result = await f.check();
  assert.equal(result.code, 0, result.stderr + result.stdout);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret));
  assert.equal(
    await readFile(path.join(f.data, "companion-settings.json"), "utf8"),
    settings,
  );
  assert.equal(
    await readFile(path.join(f.data, "codex", "config.toml"), "utf8"),
    existingConfig,
  );
  assert.deepEqual((await readdir(f.workspace)).sort(), ["student.txt"]);
  const calls = await f.invocations();
  assert.equal(calls.filter((c) => c.kind === "exec").length, 1);
  assert.equal(calls.filter((c) => c.kind === "launch").length, 0);
  for (const call of calls) {
    assert.equal(call.home, process.env.HOME);
    assert.equal(call.originalKeyPresent, false);
    assert.equal(call.otherSecretPresent, false);
    assert.equal(call.nodeOptionsPresent, false);
    assert.equal(call.modelKeyPresent, call.kind === "exec");
    if (call.kind === "version")
      assert.equal(call.profile, path.join(f.projectData, "harness-probe"));
  }
  const retained = await files(f.projectData);
  assert.ok(
    retained.some((filename) => path.basename(filename) === "preflight.json"),
  );
  assert.ok(
    retained.some((filename) => path.basename(filename) === "summary.json"),
  );
  for (const filename of retained)
    assert.ok(
      !(await readFile(filename, "utf8")).includes(secret),
      `Key leaked to ${filename}`,
    );
});

test("forced checks repeat and changed managed configuration is refused without replacement", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.check()).code, 0);
  assert.equal((await f.check()).code, 0);
  assert.equal(
    (await f.invocations()).filter((c) => c.kind === "exec").length,
    2,
  );
  const config = (await files(f.projectData)).find(
    (filename) => path.basename(filename) === "config.toml",
  )!;
  const changed =
    (await readFile(config, "utf8")) + '\nmodel_provider = "unexpected"\n';
  await writeFile(config, changed);
  const rejected = await f.check();
  assert.notEqual(rejected.code, 0);
  assert.match(rejected.stderr, /config|profile|changed/i);
  assert.equal(await readFile(config, "utf8"), changed);
  assert.equal(
    (await f.invocations()).filter((c) => c.kind === "exec").length,
    2,
  );
});

test("Codex-owned project trust state survives repeated launch while appended model and extra settings are rejected", async (t) => {
  const f = await fixture(t);
  await f.setMode("trust-state");
  const initial = await f.check();
  assert.equal(initial.code, 0, initial.stderr + initial.stdout);
  const config = (await files(f.projectData)).find(
    (filename) => path.basename(filename) === "config.toml",
  )!;
  const trusted = await readFile(config, "utf8");
  assert.match(trusted, /\[projects\."[^\n]+"\]\ntrust_level = "trusted"/);
  const launch = () =>
    f.run(
      [
        "challenge",
        "--workspace",
        f.workspace,
        "--api-key-env",
        "COURSE_ACCESS",
      ],
      { terminal: true },
    );
  const repeated = await launch();
  assert.equal(repeated.code, 0, repeated.stderr + repeated.stdout);
  assert.equal(await readFile(config, "utf8"), trusted);
  assert.equal(
    (await f.invocations()).filter((call) => call.kind === "exec").length,
    1,
  );
  assert.equal(
    (await f.invocations()).filter((call) => call.kind === "launch").length,
    1,
  );

  const untrusted = trusted.replace(
    'trust_level = "trusted"',
    'trust_level = "untrusted"',
  );
  await writeFile(config, untrusted);
  assert.equal((await launch()).code, 0);
  assert.equal(await readFile(config, "utf8"), untrusted);
  for (const addition of [
    'model = "unapproved/model"\n',
    "extra_option = true\n",
    "\n[features]\nmulti_agent = true\n",
  ]) {
    const changed = trusted + addition;
    await writeFile(config, changed);
    const rejected = await launch();
    assert.notEqual(rejected.code, 0, rejected.stdout);
    assert.match(rejected.stderr, /profile.*changed|configuration/i);
    assert.equal(await readFile(config, "utf8"), changed);
  }
  assert.equal(
    (await f.invocations()).filter((call) => call.kind === "exec").length,
    1,
  );
  assert.equal(
    (await f.invocations()).filter((call) => call.kind === "launch").length,
    2,
  );
});

test("failed preflights retain evidence but never create a reusable success receipt", async (t) => {
  for (const mode of [
    "empty",
    "no-command",
    "wrong-output",
    "checker-edit",
    "nonzero",
  ]) {
    await t.test(mode, async (t) => {
      const f = await fixture(t);
      await f.setMode(mode);
      const result = await f.check();
      assert.notEqual(result.code, 0, result.stdout);
      const retained = await files(f.projectData);
      const receipt = retained.find(
        (filename) => path.basename(filename) === "preflight.json",
      );
      assert.ok(receipt);
      assert.equal(
        JSON.parse(await readFile(receipt, "utf8")).status,
        "failed",
      );
      assert.ok(
        retained.some((filename) => path.basename(filename) === "summary.json"),
      );
      assert.equal(
        (await f.invocations()).filter((c) => c.kind === "launch").length,
        0,
      );
      assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret));
    });
  }
});

test("Compare requires two attributed workers, actual child commands, and both closures", async (t) => {
  const good = await fixture(t);
  const passed = await good.check("compare");
  assert.equal(passed.code, 0, passed.stderr + passed.stdout);
  for (const mode of [
    "duplicate-worker",
    "missing-close",
    "idle-workers",
    "wrong-worker-model",
  ]) {
    await t.test(mode, async (t) => {
      const f = await fixture(t);
      await f.setMode(mode);
      const failed = await f.check("compare");
      assert.notEqual(failed.code, 0, failed.stdout);
      const receipt = (await files(f.projectData)).find(
        (filename) => path.basename(filename) === "preflight.json",
      );
      assert.ok(receipt);
      assert.equal(
        JSON.parse(await readFile(receipt, "utf8")).status,
        "failed",
      );
    });
  }
});

test("normal launch reuses only a matching receipt and propagates the harness exit status", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.check()).code, 0);
  const launch = () =>
    f.run(
      [
        "challenge",
        "--workspace",
        f.workspace,
        "--api-key-env",
        "COURSE_ACCESS",
      ],
      { terminal: true },
    );
  const cached = await launch();
  assert.equal(cached.code, 0, cached.stderr + cached.stdout);
  assert.match(cached.stdout, /SYNTHETIC_INTERACTIVE_LAUNCH/);
  assert.equal(
    (await f.invocations()).filter((c) => c.kind === "exec").length,
    1,
  );
  const receipt = (await files(f.projectData)).find(
    (filename) => path.basename(filename) === "preflight.json",
  )!;
  const saved = JSON.parse(await readFile(receipt, "utf8"));
  // A stale/fabricated record must not bypass a real tool-use check.
  await writeFile(
    receipt,
    JSON.stringify({ ...saved, digest: "different-configuration" }),
  );
  const refreshed = await launch();
  assert.equal(refreshed.code, 0, refreshed.stderr + refreshed.stdout);
  assert.equal(
    (await f.invocations()).filter((c) => c.kind === "exec").length,
    2,
  );
  await f.setMode("success", { launchExit: 7 });
  const failedLaunch = await launch();
  assert.equal(failedLaunch.code, 7, failedLaunch.stderr + failedLaunch.stdout);
});

test("a failed forced recheck invalidates an older success before another project launch", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.check()).code, 0);
  await f.setMode("wrong-output");
  assert.notEqual((await f.check()).code, 0);
  await f.setMode("success");
  const next = await f.run(
    ["challenge", "--workspace", f.workspace, "--api-key-env", "COURSE_ACCESS"],
    { terminal: true },
  );
  assert.equal(next.code, 0, next.stderr + next.stdout);
  assert.equal(
    (await f.invocations()).filter((c) => c.kind === "exec").length,
    3,
  );
  assert.equal(
    (await f.invocations()).filter((c) => c.kind === "launch").length,
    1,
  );
});

test("forgetting an absent project key needs no phase, terminal, package, or model call", async (t) => {
  const f = await fixture(t, false);
  const result = await f.run(["--forget-key"]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /No launcher-owned Aalto key/);
  assert.equal(existsSync(f.projectData), false);
  assert.deepEqual(await f.invocations(), []);
});

async function mockedKeychain(directory: string) {
  const storeFile = path.join(directory, "synthetic-system-keychain.json");
  const readLog = path.join(directory, "synthetic-keychain-reads.jsonl");
  const moduleFile = path.join(directory, "synthetic-keychain.mjs");
  const preload = path.join(directory, "keychain-loader.mjs");
  await writeFile(
    moduleFile,
    `
import {existsSync,readFileSync,writeFileSync,appendFileSync} from 'node:fs';
const filename=${JSON.stringify(storeFile)};
const read=()=>existsSync(filename)?JSON.parse(readFileSync(filename,'utf8')):{};
export class AsyncEntry {
  constructor(service,account){this.id=service+':'+account;}
  async getPassword(){appendFileSync(${JSON.stringify(readLog)},JSON.stringify({account:this.id})+'\\n');return read()[this.id]??null;}
  async setPassword(key){writeFileSync(filename,JSON.stringify({...read(),[this.id]:key}));}
  async deleteCredential(){const values=read();const found=this.id in values;delete values[this.id];writeFileSync(filename,JSON.stringify(values));return found;}
}
`,
  );
  await writeFile(
    preload,
    `
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(specifier,context,next){return specifier==='@napi-rs/keyring'?{url:pathToFileURL(${JSON.stringify(moduleFile)}).href,shortCircuit:true}:next(specifier,context);}});
`,
  );
  const read = async (): Promise<Record<string, string>> =>
    existsSync(storeFile) ? JSON.parse(await readFile(storeFile, "utf8")) : {};
  return {
    preload,
    read,
    readLog,
    async seed(directory: string, value: string) {
      await saveLearningApiKey(
        directory,
        "https://llm-gateway.k8s.aalto.fi/api/v1",
        value,
        {
          async get(service, account) {
            return (await read())[service + ":" + account] ?? null;
          },
          async set(service, account, key) {
            await writeFile(
              storeFile,
              JSON.stringify({
                ...(await read()),
                [service + ":" + account]: key,
              }),
            );
          },
          async delete(service, account) {
            const all = await read();
            const found = service + ":" + account in all;
            delete all[service + ":" + account];
            await writeFile(storeFile, JSON.stringify(all));
            return found;
          },
        },
      );
    },
  };
}

test("saved Aalto credentials are reused without changing the book provider, and forgetting removes only the launcher key", async (t) => {
  const f = await fixture(t);
  const store = await mockedKeychain(f.directory);
  const bookKey = "synthetic-book-key-34731";
  await store.seed(f.data, bookKey);
  const originalBookStore = await store.read();
  const options = {
    preload: store.preload,
    env: {
      AALTO_LLM_API_KEY: undefined,
      AALTO_KEY: undefined,
      COURSE_ACCESS: undefined,
    },
  };
  const args = ["challenge", "--workspace", f.workspace, "--check"];
  const fromBook = await f.run(args, options);
  assert.equal(fromBook.code, 0, fromBook.stderr + fromBook.stdout);
  assert.equal(
    (await f.invocations()).find((call) => call.kind === "exec").keyDigest,
    createHash("sha256").update(bookKey).digest("hex"),
  );
  assert.deepEqual(await store.read(), originalBookStore);
  assert.equal(existsSync(path.join(f.data, "companion-settings.json")), false);
  assert.equal(
    existsSync(path.join(f.projectData, "credential-identity.json")),
    false,
  );
  const saved = await f.run([...args, "--with-api-key"], {
    ...options,
    input: secret + "\n",
  });
  assert.equal(saved.code, 0, saved.stderr + saved.stdout);
  assert.deepEqual(
    Object.values(await store.read()).sort(),
    [bookKey, secret].sort(),
  );
  assert.doesNotMatch(saved.stdout + saved.stderr, new RegExp(secret));
  const fromProject = await f.run(args, options);
  assert.equal(fromProject.code, 0, fromProject.stderr + fromProject.stdout);
  assert.equal(
    (await f.invocations()).filter((call) => call.kind === "exec").at(-1)
      .keyDigest,
    createHash("sha256").update(secret).digest("hex"),
  );
  const removed = await f.run(["--forget-key"], options);
  assert.equal(removed.code, 0, removed.stderr);
  assert.deepEqual(await store.read(), originalBookStore);
  for (const filename of await files(f.projectData)) {
    const value = await readFile(filename, "utf8");
    assert.ok(
      !value.includes(secret) && !value.includes(bookKey),
      `Key leaked to ${filename}`,
    );
  }
});

test("an unverified stdin key is not saved when the setup check fails", async (t) => {
  const f = await fixture(t);
  const store = await mockedKeychain(f.directory);
  await f.setMode("empty");
  const result = await f.run(
    ["challenge", "--workspace", f.workspace, "--check", "--with-api-key"],
    {
      preload: store.preload,
      input: secret + "\n",
      env: { AALTO_LLM_API_KEY: undefined },
    },
  );
  assert.notEqual(result.code, 0);
  assert.deepEqual(await store.read(), {});
  assert.equal(
    existsSync(path.join(f.projectData, "credential-identity.json")),
    false,
  );
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret));
});

test("conflicting project settings are preserved and rejected before managed commands or credential access", async (t) => {
  const f = await fixture(t);
  const store = await mockedKeychain(f.directory);
  await store.seed(f.data, "synthetic-book-key-not-to-read");
  const folder = path.join(f.workspace, ".codex");
  await mkdir(folder);
  const filename = path.join(folder, "config.toml");
  const config =
    'model = "unapproved/model"\nmodel_provider = "other-provider"\n';
  await writeFile(filename, config);
  const result = await f.run(
    ["challenge", "--workspace", f.workspace, "--check"],
    {
      preload: store.preload,
      env: {
        AALTO_LLM_API_KEY: undefined,
        AALTO_KEY: undefined,
        COURSE_ACCESS: undefined,
      },
    },
  );
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Project-local Codex configuration/);
  assert.equal(await readFile(filename, "utf8"), config);
  assert.deepEqual(await f.invocations(), []);
  assert.equal(
    existsSync(store.readLog),
    false,
    "A model key must not be retrieved for a rejected project configuration",
  );
  assert.equal(
    (await files(f.projectData)).some(
      (file) => path.basename(file) === "preflight.json",
    ),
    false,
  );
});

test("interrupting harness verification cannot open a coding session even if the child exits successfully", async (t) => {
  const f = await fixture(t);
  const store = await mockedKeychain(f.directory);
  await store.seed(f.data, "synthetic-book-key-not-to-read");
  await f.setMode("version-interrupt");
  const result = await f.run(["challenge", "--workspace", f.workspace], {
    terminal: true,
    preload: store.preload,
    interruptAt: f.versionReady,
    env: {
      AALTO_LLM_API_KEY: undefined,
      AALTO_KEY: undefined,
      COURSE_ACCESS: undefined,
    },
  });
  assert.notEqual(result.code, 0, result.stdout);
  assert.match(result.stderr, /cancel|interrupt|verify/i);
  assert.deepEqual(
    (await f.invocations()).map((call) => call.kind),
    ["version"],
  );
  assert.equal(existsSync(store.readLog), false);
  assert.equal(
    (await files(f.projectData)).some(
      (file) => path.basename(file) === "preflight.json",
    ),
    false,
  );
});
