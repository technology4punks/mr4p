import { expect, test } from "@playwright/test";
test("loads safely without requesting microphone, supports touch and starts explicitly", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "microphoneCalls", {
      value: 0,
      writable: true,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: async () => {
          (window as unknown as { microphoneCalls: number }).microphoneCalls++;
          throw new DOMException("denied", "NotAllowedError");
        },
      },
    });
  });
  await page.goto("/");
  await expect(
    page.getByText("ROBOTEXPRESSIVE · CC0", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { microphoneCalls: number }).microphoneCalls,
    ),
  ).toBe(0);
  await page.locator("canvas").scrollIntoViewIfNeeded();
  const box = (await page.locator("canvas").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 40,
    box.y + box.height / 2 + 15,
  );
  await page.mouse.up();
  if (test.info().project.name !== "desktop-chromium")
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.getByRole("button", { name: "INIZIA ESPERIENZA" }).click();
  await expect(page.locator(".voice-message")).toContainText(
    "Permesso microfono negato",
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { microphoneCalls: number }).microphoneCalls,
    ),
  ).toBe(1);
  await expect(
    page.getByRole("button", { name: "Avvia voce", exact: true }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("serves local licensed avatar and refuses unconfigured Realtime keys", async ({
  request,
}) => {
  const asset = await request.get("/models/RobotExpressive.glb");
  expect(asset.status()).toBe(200);
  expect((await asset.body()).subarray(0, 4).toString()).toBe("glTF");
  const token = await request.post("/api/realtime-token", {
    headers: { Origin: "http://127.0.0.1:3000" },
  });
  expect(token.status()).toBe(503);
  expect(token.headers()["cache-control"]).toBe("no-store");
});
