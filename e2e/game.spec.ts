import { expect, test } from "@playwright/test";

test("renders a non-empty cube canvas", async ({ page }) => {
  await page.goto("/");

  const canvas = page.locator(".cube-scene canvas");
  await expect(canvas).toBeVisible();

  await expect
    .poll(
      async () =>
        canvas.evaluate((canvasElement) => {
          const target = document.createElement("canvas");
          target.width = canvasElement.width;
          target.height = canvasElement.height;
          const context = target.getContext("2d");

          if (!context) {
            return 0;
          }

          context.drawImage(canvasElement, 0, 0);
          const data = context.getImageData(0, 0, target.width, target.height).data;
          let count = 0;

          for (let index = 0; index < data.length; index += 16) {
            const red = data[index];
            const green = data[index + 1];
            const blue = data[index + 2];
            const alpha = data[index + 3];

            if (alpha > 0 && (red < 245 || green < 245 || blue < 245)) {
              count += 1;
            }
          }

          return count;
        }),
      { timeout: 5000 },
    )
    .toBeGreaterThan(1000);
});

test("allows placing a mark and starting a new game", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("status")).toContainText("Rotate a layer or place X");
  await page.getByLabel("Place on row 1, column 1").click();
  await expect(page.getByRole("status")).toContainText("Rotate a layer or place O");

  await page.getByRole("button", { name: "New game" }).click();
  await expect(page.getByRole("status")).toContainText("Rotate a layer or place X");
});

test("arms rotate mode and keeps it armed after an ambiguous drag", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Rotate layer" }).click();
  await expect(page.getByRole("status")).toContainText("Drag a layer to rotate");

  const box = await page.locator(".cube-interaction-layer").boundingBox();
  if (!box) {
    throw new Error("Missing interaction layer");
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 4, box.y + box.height / 2 + 4);
  await page.mouse.up();

  await expect(page.getByRole("status")).toContainText("Drag a layer to rotate");
});
