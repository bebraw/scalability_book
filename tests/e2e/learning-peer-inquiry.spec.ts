import {
  activeLearningPanel,
  selectReading,
  chooseNotebookTool,
} from "./learning-notebook.helpers.ts";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import type { Course, Envelope } from "../../shared/course.ts";
test("students save private initial work before group replies, reflect individually and deliberately offer public text for editorial review", async ({
  browser,
  request,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const headers = { Origin: new URL(baseURL!).origin };
  const created = await request.post("/api/courses", {
    headers,
    data: { name: `Synthetic peer inquiry ${Date.now()}` },
  });
  expect(created.ok()).toBe(true);
  const record = (await created.json()) as Envelope<Course>;
  const course = record.value;
  course.students = [2, 3, 4, 5, 6, 7].map((id) => ({
    id: `github:${id}`,
    login: `synthetic-${id}`,
    name: `Synthetic student ${id}`,
    number: `INQUIRY-${id}`,
  }));
  for (const phase of ["establish", "challenge", "compare"] as const) {
    course.phases[phase].groups = [
      { id: "group-a", members: ["github:2", "github:3", "github:4"] },
      { id: "group-b", members: ["github:5", "github:6", "github:7"] },
    ];
    course.phases[phase].audits = [
      { from: "group-a", to: "group-b" },
      { from: "group-b", to: "group-a" },
    ];
  }
  const configured = await request.put(`/api/courses/${course.id}/setup`, {
    headers,
    data: {
      ...course,
      expected: record.revision,
      reason: "Synthetic group inquiry verification",
    },
  });
  expect(configured.ok(), await configured.text()).toBe(true);
  const cleanups: (() => Promise<void>)[] = [];
  async function reader(id: number, port: number) {
    const context = await browser.newContext();
    cleanups.push(() => context.close());
    await context.route("**/api/courses**", (route) =>
      route.continue({
        headers: {
          ...route.request().headers(),
          "x-course-test-user": String(id),
        },
      }),
    );
    const directory = await mkdtemp(path.join(tmpdir(), "book-peer-notebook-"));
    const child = spawn(
      process.execPath,
      [
        "scripts/learning-companion.ts",
        "--directory",
        directory,
        "--port",
        String(port),
        "--origin",
        new URL(baseURL!).origin,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    cleanups.push(async () => {
      if (child.exitCode === null) {
        const exited = once(child, "exit");
        child.kill("SIGTERM");
        await exited;
      }
      await rm(directory, { recursive: true, force: true });
    });
    await new Promise<void>((resolve, reject) => {
      let output = "";
      const timeout = setTimeout(
        () => reject(new Error("Synthetic companion did not start")),
        8000,
      );
      child.once("exit", () => {
        clearTimeout(timeout);
        reject(new Error("Synthetic companion exited"));
      });
      child.stdout!.on("data", (data) => {
        output += String(data);
        const match = output.match(
          /Learning companion: http:\/\/127\.0\.0\.1:/,
        );
        if (match) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}/chapters/benchmarking/`);
    await page
      .locator(".site-header")
      .getByRole("button", { name: "Notebook", exact: true })
      .click();
    const panel = activeLearningPanel(page);
    await panel
      .getByLabel("Companion address")
      .fill(`http://127.0.0.1:${port}`);
    await panel
      .getByRole("button", { name: "Connect companion", exact: true })
      .click();
    await selectReading(page);
    await panel.getByRole("button", { name: "Use selected text" }).click();
    return { page, panel };
  }
  async function peers(page: Page) {
    const panel = activeLearningPanel(page);
    await chooseNotebookTool(panel, "Peer discussion");
    await panel.getByLabel("Course for this inquiry").selectOption(course.id);
    return panel;
  }
  try {
    const alice = await reader(2, 18891),
      bob = await reader(3, 18892);
    await peers(alice.page);
    await expect(
      alice.panel.getByText("Save initial thinking for this source first.", {
        exact: false,
      }),
    ).toBeVisible();
    await alice.panel
      .getByRole("button", { name: "Write my initial thinking" })
      .click();
    await alice.panel
      .getByLabel("Your thinking")
      .fill(
        "Private Alice initial thinking: I expect a common stable interval.",
      );
    await alice.panel
      .getByRole("button", { name: "Save note", exact: true })
      .click();
    await expect(alice.panel.getByRole("status")).toContainText(
      "Saved in your private notebook.",
    );
    await peers(alice.page);
    await alice.panel
      .getByRole("button", { name: "Reveal peer inquiry" })
      .click();
    const prompts = alice.panel.locator("details").filter({
      has: alice.page.getByText("Optional reasoning and session prompts", {
        exact: true,
      }),
    });
    await prompts.locator(":scope > summary").click();
    await expect(prompts).toContainText("someone other than the operator");
    await expect(prompts).toContainText("An absent member has not endorsed");
    await prompts.getByRole("button", { name: "Use inquiry outline" }).click();
    await expect(
      alice.panel.getByLabel("Review the text I want to share"),
    ).toHaveValue(/Competing explanations:[\s\S]*Remaining uncertainty:/);
    await alice.panel
      .getByLabel("Review the text I want to share")
      .fill("Which interval and population are common to both averages?");
    await alice.panel
      .getByRole("button", {
        name: "Share reviewed text with the chosen audience",
      })
      .click();
    await expect(
      alice.panel.getByText(
        "Which interval and population are common to both averages?",
        { exact: true },
      ),
    ).toBeVisible();
    await peers(bob.page);
    await expect(
      bob.panel.getByText(
        "Which interval and population are common to both averages?",
        { exact: true },
      ),
    ).toHaveCount(0);
    await bob.panel
      .getByRole("button", { name: "Write my initial thinking" })
      .click();
    await bob.panel
      .getByLabel("Your thinking")
      .fill(
        "Private Bob initial thinking: I am unsure how to establish stability.",
      );
    await bob.panel
      .getByRole("button", { name: "Save note", exact: true })
      .click();
    await expect(bob.panel.getByRole("status")).toContainText(
      "Saved in your private notebook.",
    );
    await peers(bob.page);
    await bob.panel
      .getByRole("button", { name: "Reveal peer inquiry" })
      .click();
    await expect(
      bob.panel.getByText(
        "Which interval and population are common to both averages?",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      bob.panel.getByText(/Private Alice initial thinking/),
    ).toHaveCount(0);
    await bob.panel
      .getByLabel("My reply", { exact: true })
      .fill(
        "I still question whether the interval is stable; I would check queue growth first.",
      );
    await bob.panel.getByLabel("Reply kind").selectOption("disagreement");
    await bob.panel
      .getByRole("button", { name: "Share reply with this audience" })
      .click();
    await alice.panel.getByRole("button", { name: "Reload inquiry" }).click();
    await expect(
      alice.panel.getByText(/I still question whether the interval is stable/),
    ).toBeVisible();
    // Student 4 is absent: a checked result and disagreement can still be discussed.
    const observation = await alice.page.evaluate(async () => {
      const bridge = (
        window as unknown as {
          BookLearningWorkspace: typeof import("../../site/scripts/learning-demos.ts");
        }
      ).BookLearningWorkspace;
      const before = bridge.observeLearningDemo("demo-queue-balance-lab");
      const control = before.controls.find(
        (control) => control.type === "range" || control.type === "number",
      )!;
      const value =
        Number(control.value) + Number(control.step ?? 1) <= Number(control.max)
          ? Number(control.value) + Number(control.step ?? 1)
          : Number(control.min);
      return bridge.changeLearningDemo("demo-queue-balance-lab", {
        controlId: control.id,
        value,
      });
    });
    expect(observation.visibleText).toMatch(/\d+\s*=\s*\d+\s*×/);
    await alice.panel
      .getByLabel("My reply", { exact: true })
      .fill(
        `I changed a browser model input and checked the displayed relation. This does not prove our project is stable.\n${observation.visibleText.slice(0, 1500)}`,
      );
    await alice.panel.getByLabel("Reply kind").selectOption("check");
    await alice.panel
      .getByLabel("Reply tool or observation provenance")
      .fill("Student-operated browser model; no production measurement.");
    await alice.panel
      .getByRole("button", { name: "Share reply with this audience" })
      .click();
    await expect(
      alice.panel.getByRole("heading", {
        name: "Synthetic student 2 · check",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      alice.panel.getByRole("button", {
        name: "Prepare summary from selected contributions",
      }),
    ).toBeDisabled();
    await alice.panel
      .getByLabel("Select Synthetic student 3 · disagreement for my draft", {
        exact: true,
      })
      .check();
    await alice.panel
      .getByLabel("Select Synthetic student 2 · check for my draft", {
        exact: true,
      })
      .check();
    await alice.panel
      .getByRole("button", {
        name: "Prepare summary from selected contributions",
      })
      .click();
    const summary = alice.panel.getByLabel("My reply", { exact: true });
    await expect(summary).toHaveValue(
      /Synthetic student 3 \[github:3\][\s\S]*still question whether[\s\S]*Student-operated browser model/,
    );
    await expect(
      alice.panel.getByRole("heading", {
        name: "Synthetic student 2 · summary",
        exact: true,
      }),
    ).toHaveCount(0);
    await summary.fill(
      `${await summary.inputValue()}\nDecision by student 2: the model relation is consistent. Student 3 still questions stability. Student 4 did not contribute or endorse this. We still need evidence for a stable project interval.`,
    );
    await alice.panel
      .getByRole("button", { name: "Share reply with this audience" })
      .click();
    await expect(
      alice.panel.getByRole("heading", {
        name: "Synthetic student 2 · summary",
        exact: true,
      }),
    ).toBeVisible();
    await alice.panel
      .getByRole("button", { name: "Reflect privately on this inquiry" })
      .click();
    await expect(alice.panel.getByLabel("Your thinking")).toHaveValue(
      /Discussion reference:/,
    );
    await expect(alice.panel.getByLabel("Your thinking")).not.toHaveValue(
      /I still question whether|I changed a browser model input/,
    );
    await alice.panel
      .getByLabel("Your thinking")
      .fill(
        "Alice private takeaway: I can justify the modeled relation, but I cannot establish a stable project interval yet.",
      );
    await alice.panel
      .getByRole("button", { name: "Save note", exact: true })
      .click();
    await expect(alice.panel.getByRole("status")).toContainText(
      "Saved in your private notebook.",
    );
    await peers(alice.page);
    await alice.panel
      .getByRole("button", { name: "Reveal peer inquiry" })
      .click();
    const relatedCase = alice.panel.locator("details").filter({
      has: alice.page.getByText("Try a related case privately", {
        exact: true,
      }),
    });
    await relatedCase.locator(":scope > summary").click();
    await relatedCase
      .getByRole("button", { name: "Ask for help with this case" })
      .click();
    await expect(
      alice.panel.getByLabel("Message to the teaching assistant"),
    ).toHaveValue(/six changes\/hour/);
    await expect(
      alice.panel.getByLabel("Message to the teaching assistant"),
    ).not.toHaveValue(
      /I still question whether|I changed a browser model input/,
    );
    await peers(alice.page);
    await alice.panel
      .getByRole("button", { name: "Reveal peer inquiry" })
      .click();
    await relatedCase.locator(":scope > summary").click();
    await relatedCase
      .getByLabel("My explanation of the changed case")
      .fill(
        "At six submissions and four acceptances per hour, unfinished changes accumulate. The earlier stable calculation cannot hold indefinitely.",
      );
    await relatedCase
      .getByRole("button", { name: "Save my independent attempt" })
      .click();
    await expect(relatedCase.getByRole("status")).toContainText(
      "Independent attempt saved separately",
    );
    await chooseNotebookTool(alice.panel, "Concepts");
    await expect(
      alice.panel.getByLabel("Studied", { exact: true }),
    ).not.toBeChecked();
    await peers(alice.page);
    await alice.panel
      .getByRole("button", { name: "Reveal peer inquiry" })
      .click();
    await bob.panel.getByRole("button", { name: "Reload inquiry" }).click();
    await bob.panel
      .getByLabel("Select Synthetic student 2 · check for my draft", {
        exact: true,
      })
      .check();
    await bob.panel
      .getByRole("button", { name: "Reflect privately on this inquiry" })
      .click();
    await expect(bob.panel.getByLabel("Your thinking")).toHaveValue(
      /Student-operated browser model/,
    );
    await expect(bob.panel.getByLabel("Your thinking")).not.toHaveValue(
      /Private Alice initial thinking|Alice private takeaway/,
    );
    await bob.panel
      .getByLabel("Your thinking")
      .fill(
        "I will now check stability before using the relation. The shared question helped me separate the population from the time window; uncertainty about growth remains.",
      );
    await bob.panel
      .getByRole("button", { name: "Save note", exact: true })
      .click();
    await expect(bob.panel.getByRole("status")).toContainText(
      "Saved in your private notebook.",
    );
    alice.page.on(
      "dialog",
      (dialog) =>
        void (dialog.type() === "prompt"
          ? dialog.accept(
              "A public explanation should name the common interval and population.",
            )
          : dialog.accept()),
    );
    await alice.panel
      .getByRole("button", { name: "Offer my text for public review" })
      .first()
      .click();
    await expect(alice.panel.getByRole("status")).toContainText(
      "offered for editorial review",
    );
    const teacher = await reader(1, 18893);
    await peers(teacher.page);
    await teacher.panel
      .getByRole("button", { name: "Open inquiry as course staff" })
      .click();
    await expect(
      teacher.panel.getByText(/offered: A public explanation/),
    ).toBeVisible();
    await teacher.panel
      .getByLabel("Curated text for editorial review")
      .fill(
        "Use averages from a common observation boundary and check stability.",
      );
    await teacher.panel
      .getByRole("button", { name: "Mark reviewed for the book editor" })
      .click();
    const download = teacher.page.waitForEvent("download");
    await teacher.panel
      .getByRole("button", { name: "Download for book-editor review" })
      .click();
    expect((await download).suggestedFilename()).toBe(
      "reader-note-proposal.md",
    );
    expect(
      (
        await new AxeBuilder({ page: teacher.page })
          .include(".learning-workspace")
          .analyze()
      ).violations,
    ).toEqual([]);
  } finally {
    for (const cleanup of cleanups.reverse()) await cleanup();
  }
});
