import { expect, test } from "@playwright/test";
test("local GLB renders, touch/resize work, emotes finish and no microphone request on load", async ({
  page,
}) => {
  // Includes a full-page software-rendered screenshot after the interaction checks.
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        throw new DOMException("Microphone test denied", "NotAllowedError");
      },
    });
  });
  await page.goto("/");
  await expect(
    page.getByText("ROBOTEXPRESSIVE · CC0", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Entra in realtà mista" }),
  ).toHaveCount(0);
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "Diagnostica" }).click();
  await expect(
    page.getByText("disponibile, spento", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Approva" }).click();
  await expect(page.getByText("Ottimo!", { exact: true })).toBeVisible();
  await expect(page.getByText("Pronto", { exact: true })).toBeVisible({
    timeout: 7000,
  });
  const canvas = page.locator("canvas");
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 40,
    bounds.y + bounds.height / 2 + 15,
  );
  await page.mouse.up();
  if (test.info().project.name !== "desktop-chromium")
    await page.touchscreen.tap(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
  await page.setViewportSize({ width: 844, height: 390 });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "Parla con l’avatar" }).click();
  await expect(page.getByText(/Permesso microfono negato/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Parla con l’avatar" }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `test-results/preview-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("serves production asset and private token errors with security policy", async ({
  request,
}) => {
  const asset = await request.get("/models/RobotExpressive.glb");
  expect(asset.status()).toBe(200);
  expect((await asset.body()).subarray(0, 4).toString()).toBe("glTF");
  const token = await request.post("/api/realtime-token", {
    headers: { Origin: "http://127.0.0.1:3000" },
  });
  expect(token.status()).toBe(503);
  expect((await token.json()).error).toContain("non configurata");
  expect(token.headers()["cache-control"]).toBe("no-store");
});
