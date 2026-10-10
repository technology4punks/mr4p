import { expect, test } from "@playwright/test";
import { writeFileSync } from "node:fs";
test("explores the same window, transforms in eight seconds and returns on desktop and touch", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        throw new Error("Unexpected microphone request");
      },
    });
  });
  await page.goto("/");
  await expect(
    page.getByText("ROBOTEXPRESSIVE · CC0", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Visita il 2050" }).click();
  await expect(
    page.getByRole("heading", { name: "Futuro critico", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: /Diagnostica/ }).click();
  await expect(
    page.getByText("Poly Haven · PBR + glTF + HDRI", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 60,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.up();
  if (test.info().project.name !== "desktop-chromium")
    await page.touchscreen.tap(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
  await page.screenshot({
    path: `test-results/critical-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Mostra il futuro sostenibile" })
    .click();
  const start = Date.now();
  await expect(
    page.getByRole("progressbar", { name: "Trasformazione del futuro" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Futuro sostenibile", exact: true }),
  ).toBeVisible({ timeout: 18000 });
  expect(Date.now() - start).toBeGreaterThan(6500);
  const diagnostics = await page.locator(".debug dl").innerText();
  writeFileSync(
    `test-results/performance-${test.info().project.name}.json`,
    JSON.stringify(
      {
        profile: test.info().project.name,
        transformationMs: Date.now() - start,
        diagnostics,
        hardware: "headless browser; not Quest Pro",
      },
      null,
      2,
    ),
  );
  await test.info().attach("browser-performance", {
    body: JSON.stringify({
      profile: test.info().project.name,
      transformationMs: Date.now() - start,
      diagnostics,
      hardware: "headless browser; not Quest Pro",
    }),
    contentType: "application/json",
  });
  await canvas.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `test-results/sustainable-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Torna alla realtà" }).click();
  await expect(
    page.getByRole("button", { name: "Visita il 2050" }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole("heading", { name: "Portalo nel presente", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Parla con l’avatar" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("returns before entry finishes without exposing a stale future", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Visita il 2050" }).click();
  await page.getByRole("button", { name: "Torna alla realtà" }).click();
  await expect(
    page.getByRole("heading", { name: "Portalo nel presente", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole("button", { name: "Visita il 2050" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Mostra il futuro sostenibile" }),
  ).toHaveCount(0);
});
