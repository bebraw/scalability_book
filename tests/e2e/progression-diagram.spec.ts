import { expect, test } from "@playwright/test";

test.describe("course progression diagram", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/chapters/introduction/#one-application-three-development-systems",
    );
    await expect(page.locator("[data-progression-diagram]")).toBeVisible();
  });

  test("keeps every label inside its owning box", async ({ page }) => {
    const issues = await page
      .locator("[data-progression-diagram]")
      .evaluate((svg) => {
        const minimumInset = 4;

        return Array.from(
          svg.querySelectorAll<SVGGElement>("[data-progression-container]"),
        ).flatMap((container) => {
          const boundary = container
            .querySelector<SVGRectElement>(":scope > rect")
            ?.getBoundingClientRect();
          if (!boundary) return [];

          return Array.from(
            container.querySelectorAll<SVGTextElement>(":scope > text"),
          ).flatMap((label) => {
            const box = label.getBoundingClientRect();
            const inset = {
              bottom: boundary.bottom - box.bottom,
              left: box.left - boundary.left,
              right: boundary.right - box.right,
              top: box.top - boundary.top,
            };
            const escapes = Object.values(inset).some(
              (value) => value < minimumInset,
            );

            return escapes
              ? [
                  {
                    container: container.dataset.progressionContainer,
                    inset,
                    text: label.textContent?.replace(/\s+/g, " ").trim(),
                  },
                ]
              : [];
          });
        });
      });

    expect(issues).toEqual([]);
  });

  test("keeps build and outcome cards separate", async ({ page }) => {
    const overlaps = await page
      .locator("[data-progression-diagram]")
      .evaluate((svg) => {
        const cards = Array.from(
          svg.querySelectorAll<SVGGElement>(
            ".progression-stage, .progression-outcome",
          ),
        ).map((group) => ({
          id:
            group.dataset.progressionContainer ||
            group.dataset.progressionStage ||
            "unknown",
          rect: group
            .querySelector<SVGRectElement>(":scope > rect")!
            .getBoundingClientRect(),
        }));

        return cards.flatMap((first, firstIndex) =>
          cards.slice(firstIndex + 1).flatMap((second) => {
            const intersects =
              first.rect.left < second.rect.right &&
              first.rect.right > second.rect.left &&
              first.rect.top < second.rect.bottom &&
              first.rect.bottom > second.rect.top;

            return intersects ? [[first.id, second.id]] : [];
          }),
        );
      });

    expect(overlaps).toEqual([]);
  });

  test("gives the caption the full figure width", async ({ page }) => {
    const figure = page.locator(".course-progression-figure");
    const geometry = await figure.evaluate((element) => {
      const canvas = element
        .querySelector<HTMLElement>(".course-progression-canvas")!
        .getBoundingClientRect();
      const caption = element
        .querySelector<HTMLElement>("figcaption")!
        .getBoundingClientRect();

      return {
        captionWidth: caption.width,
        canvasWidth: canvas.width,
      };
    });

    expect(Math.abs(geometry.captionWidth - geometry.canvasWidth)).toBeLessThan(
      1,
    );
  });
});
