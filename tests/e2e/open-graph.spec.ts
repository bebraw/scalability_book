import { expect, test } from "@playwright/test";
import sharp from "sharp";

test("publishes page-specific Open Graph graphics and social metadata", async ({
  page,
}) => {
  const routes = [
    {
      path: "/",
      image: "/assets/og/home.png",
      imageAlt: "Social preview for Elements of Scalable Web Development",
    },
    {
      path: "/chapters/introduction/",
      image: "/assets/og/chapters--introduction.png",
      imageAlt: "Social preview for Elements of Scalable Web Development",
    },
  ];
  const images: Buffer[] = [];

  for (const route of routes) {
    await page.goto(route.path);

    const imageUrl = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    expect(imageUrl).toBe(`https://scalableweb.dev${route.image}`);
    await expect(
      page.locator('meta[property="og:image:width"]'),
    ).toHaveAttribute("content", "1200");
    await expect(
      page.locator('meta[property="og:image:height"]'),
    ).toHaveAttribute("content", "630");
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      "content",
      route.imageAlt,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      "content",
      imageUrl || "",
    );

    const response = await page.request.get(route.image);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toBe("image/png");
    const image = await response.body();
    const metadata = await sharp(image).metadata();
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);
    images.push(image);
  }

  expect(images[0]?.equals(images[1] || Buffer.alloc(0))).toBe(false);
});
