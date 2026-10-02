import { expect, test } from "@playwright/test";

const diagrams = [
  {
    id: "pressure-evidence",
    route: "/chapters/what-is-scalability/#reason-from-pressure-to-evidence",
  },
  {
    id: "dependency-failure",
    route:
      "/chapters/reality/#field-note-when-caching-complexity-became-an-availability-risk",
  },
  {
    id: "three-connected-loops",
    route: "/chapters/recap/#one-system-three-connected-loops",
  },
  {
    id: "shared-knowledge-boundary",
    route: "/case-studies/kirjolab/#what-i-would-do-differently",
  },
] as const;

for (const { id, route } of diagrams) {
  test(`${id} at ${route} keeps its rendered geometry bounded`, async ({
    page,
  }) => {
    await page.goto(route);
    const diagram = page.locator(`[data-book-diagram="${id}"]`);
    await expect(diagram).toBeVisible();

    const geometry = await diagram.evaluate((svg) => {
      const minimumInset = 4;
      const containmentIssues = Array.from(
        svg.querySelectorAll<SVGGElement>("[data-diagram-container]"),
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

          return Object.values(inset).some((value) => value < minimumInset)
            ? [
                {
                  container: container.dataset.diagramContainer,
                  inset,
                  text: label.textContent?.replace(/\s+/g, " ").trim(),
                },
              ]
            : [];
        });
      });
      const nodes = Array.from(
        svg.querySelectorAll<SVGGElement>("[data-diagram-node]"),
      ).map((node) => ({
        id: node.dataset.diagramNode,
        rect: node
          .querySelector<SVGRectElement>(":scope > rect")!
          .getBoundingClientRect(),
      }));
      const nodeOverlaps = nodes.flatMap((first, firstIndex) =>
        nodes.slice(firstIndex + 1).flatMap((second) => {
          const intersects =
            first.rect.left < second.rect.right &&
            first.rect.right > second.rect.left &&
            first.rect.top < second.rect.bottom &&
            first.rect.bottom > second.rect.top;
          return intersects ? [[first.id, second.id]] : [];
        }),
      );
      const figure = svg.closest("figure")!;
      const canvas = figure
        .querySelector<HTMLElement>(".book-diagram-canvas")!
        .getBoundingClientRect();
      const caption = figure
        .querySelector<HTMLElement>("figcaption")!
        .getBoundingClientRect();

      return {
        captionWidthDifference: Math.abs(caption.width - canvas.width),
        containmentIssues,
        nodeOverlaps,
        pageOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      };
    });

    expect(geometry.containmentIssues).toEqual([]);
    expect(geometry.nodeOverlaps).toEqual([]);
    expect(geometry.captionWidthDifference).toBeLessThan(1);
    expect(geometry.pageOverflow).toBeLessThanOrEqual(1);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobile = await page
      .locator(`[data-book-diagram="${id}"]`)
      .evaluate((svg) => {
        const canvas = svg.closest(".book-diagram-canvas")!;
        return {
          hasInternalOverflow: canvas.scrollWidth > canvas.clientWidth,
          pageOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        };
      });

    expect(mobile.hasInternalOverflow).toBe(true);
    expect(mobile.pageOverflow).toBeLessThanOrEqual(1);
  });
}
