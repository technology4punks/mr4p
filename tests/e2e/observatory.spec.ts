import { expect, test } from "@playwright/test";
import { writeFileSync } from "node:fs";
type TransitionProbe = {
  start: number | null;
  end: number | null;
  visible: boolean;
};
declare global {
  interface Window {
    futureTransitionProbe: TransitionProbe;
    pausedRenderer: {
      original: typeof requestAnimationFrame;
      pending: FrameRequestCallback[];
    };
  }
}
for (const theme of ["environmental", "economic", "social"])
  test(`explores ${theme}, transforms in eight seconds and returns on desktop and touch`, async ({
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
    await page
      .getByRole("combobox", { name: "Tema della visita" })
      .selectOption(theme);
    await page.getByRole("button", { name: "Visita il 2050" }).click();
    await expect(
      page.getByRole("heading", { name: "Futuro critico", exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: /Diagnostica/ }).click();
    await expect(
      page.getByText("Poly Haven · PBR + glTF + HDRI", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByText("Kenney CC0 · 4/4 GLB", { exact: true }),
    ).toBeVisible();
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
      path: `test-results/critical-${theme}-${test.info().project.name}.png`,
      fullPage: true,
    });
    // Observe before dispatch: software rendering can delay the click acknowledgement
    // until a transient progress element is gone. Keep duration/visibility assertions.
    await page.evaluate(() => {
      const probe: TransitionProbe = { start: null, end: null, visible: false };
      window.futureTransitionProbe = probe;
      const observer = new MutationObserver(() => {
        const progress = document.querySelector(
          'progress[aria-label="Trasformazione del futuro"]',
        );
        if (progress && progress.getClientRects().length) {
          probe.visible = true;
          probe.start ??= performance.now();
        }
        const complete = [...document.querySelectorAll("h2")].some(
          (h) => h.textContent === "Futuro sostenibile",
        );
        if (complete && probe.start !== null) {
          probe.end = performance.now();
          observer.disconnect();
        }
      });
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
    });
    await page
      .getByRole("button", { name: "Mostra il futuro sostenibile" })
      .click();
    await expect
      .poll(() => page.evaluate(() => window.futureTransitionProbe.visible))
      .toBe(true);
    // Watch the city during the change, including on a phone where controls
    // and canvas occupy different scroll positions.
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toBeInViewport();
    await expect(
      page.getByRole("heading", { name: "Futuro sostenibile", exact: true }),
    ).toBeVisible({ timeout: 18000 });
    const measured = await page.evaluate(() => window.futureTransitionProbe);
    expect(measured.start).not.toBeNull();
    expect(measured.end).not.toBeNull();
    const transformationMs = measured.end! - measured.start!;
    expect(transformationMs).toBeGreaterThan(6500);
    const diagnostics = await page.locator(".debug dl").innerText();
    writeFileSync(
      `test-results/performance-${theme}-${test.info().project.name}.json`,
      JSON.stringify(
        {
          theme,
          profile: test.info().project.name,
          transformationMs,
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
        transformationMs,
        diagnostics,
        hardware: "headless browser; not Quest Pro",
      }),
      contentType: "application/json",
    });
    await canvas.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `test-results/sustainable-${theme}-${test.info().project.name}.png`,
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

test("acknowledges narrative controls while graphics frames are paused", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Tema della visita" })
    .selectOption("social");
  await page.getByRole("button", { name: "Visita il 2050" }).click();
  await expect(
    page.getByRole("heading", { name: "Futuro critico", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await page.evaluate(() => {
    const original = window.requestAnimationFrame.bind(window);
    const pending: FrameRequestCallback[] = [];
    window.pausedRenderer = { original, pending };
    window.requestAnimationFrame = (callback) => {
      pending.push(callback);
      return 0;
    };
  });
  try {
    await expect
      .poll(() => page.evaluate(() => window.pausedRenderer.pending.length))
      .toBeGreaterThan(0);
    // No actionability wait for animation frames in this deliberate pause.
    await page
      .getByRole("button", { name: "Mostra il futuro sostenibile" })
      .dispatchEvent("click");
    expect(
      await page
        .getByRole("progressbar", { name: "Trasformazione del futuro" })
        .isVisible(),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Mostra il futuro sostenibile" }),
    ).toBeDisabled();
  } finally {
    await page.evaluate(() => {
      const { original, pending } = window.pausedRenderer;
      window.requestAnimationFrame = original;
      pending.forEach((callback) => original(callback));
    });
  }
});
