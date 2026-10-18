import { expect, test } from "@playwright/test";
test.describe.configure({ timeout: 80000 });
test("guided visit enters after optional greeting, returns by the deadline and leaves a thought without storage consent", async ({
  page,
}) => {
  test.setTimeout(80000);
  const writes: object[] = [];
  await page.route("**/api/experience-runs", async (route) => {
    writes.push(route.request().postDataJSON());
    await route.fulfill({
      status: 201,
      json: { id: route.request().postDataJSON().id },
    });
  });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: async () => {
          throw new DOMException("denied", "NotAllowedError");
        },
      },
    }),
  );
  await page.clock.install();
  await page.goto("/");
  await expect(
    page.getByRole("checkbox", { name: "Visita guidata · 3–4 minuti" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "INIZIA ESPERIENZA" }).click();
  await page
    .getByRole("button", { name: "Entra nell’osservatorio", exact: true })
    .waitFor({ timeout: 20000 });
  await expect(
    page.getByRole("button", { name: "Saluta", exact: true }),
  ).toHaveCount(0);
  // Rendered invitation precedes the next narrative interval; let its clock begin.
  await page.clock.runFor(250);
  await page.clock.fastForward(18000);
  await page.clock.fastForward(2000);
  await page.clock.fastForward(4000);
  await expect(
    page.getByRole("button", { name: "Verde urbano", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Verde urbano", exact: true }).click();
  await page
    .locator('[aria-label="Tre interventi disponibili"] button')
    .filter({ has: page.getByText("Grande parco", { exact: true }) })
    .click();
  await page.clock.fastForward(8000);
  await page.clock.fastForward(220000);
  await page.clock.fastForward(3000);
  await expect(
    page.getByRole("button", {
      name: "Acconsento al salvataggio",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".story-message")).toContainText("Il futuro");
  expect(writes).toHaveLength(0);
  await page
    .getByRole("button", { name: "Acconsento al salvataggio", exact: true })
    .click();
  await expect
    .poll(() =>
      writes.some(
        (r: unknown) => (r as { status?: string }).status === "completed",
      ),
    )
    .toBe(true);
  // Wait for the actual acknowledgement/FAREWELL before advancing its clock.
  await expect(page.locator(".story-message")).toContainText("Il futuro");
  await expect(
    page.getByRole("button", { name: "Scarica ricevuta privata", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(10000);
  await expect(
    page.getByRole("button", { name: "Ricomincia", exact: true }),
  ).toBeVisible();
  const data = JSON.stringify(writes);
  expect(data).not.toContain('"name"');
  expect(data).not.toContain('"transcript"');
});

test("PC control room shows its access gate and renders only sanitized operator results", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.route("**/api/control-room/experiences**", (route) =>
    route.fulfill({
      status: 401,
      json: {
        error: "Accedi con ChatGPT per aprire la control room.",
        signin: "/signin-with-chatgpt?return_to=%2Fcontrol-room",
      },
    }),
  );
  await page.goto("/control-room");
  await expect(
    page.getByRole("link", { name: "Accedi con ChatGPT" }),
  ).toHaveAttribute("href", "/signin-with-chatgpt?return_to=%2Fcontrol-room");
  await expect(page.locator("table")).toHaveCount(0);
  await page.unroute("**/api/control-room/experiences**");
  await page.route("**/api/control-room/experiences**", (route) =>
    route.fulfill({
      json: {
        total: 1,
        page: 0,
        pageSize: 20,
        records: [
          {
            id: "12345678-1234-1234-1234-123456789012",
            revision: 10,
            startedAt: Date.now() - 180000,
            elapsedSeconds: 180,
            state: "FAREWELL",
            status: "completed",
            mode: "browser",
            guided: true,
            active: ["GREEN_TREES", "MOB_TRAM"],
            message:
              "Il futuro prende forma quando pensiamo insieme a verde e mobilità.",
            reason: "choices",
            updatedAt: Date.now(),
            expiresAt: Date.now() + 86400000,
          },
        ],
      },
    }),
  );
  await page.getByRole("button", { name: "Riprova", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Completata", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Dettagli visita 12345678", exact: true })
    .click();
  await expect(page.locator(".cr-tags")).toContainText("Alberi");
  await expect(
    page.getByRole("button", { name: "Esporta questa pagina CSV" }),
  ).toBeEnabled();
  await page.screenshot({
    path: `test-results/control-room-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("a failed recording backend does not block the timed return or goodbye", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: async () => {
          throw new DOMException("denied", "NotAllowedError");
        },
      },
    }),
  );
  await page.route("**/api/experience-runs", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Archivio non disponibile." },
    }),
  );
  await page.clock.install();
  await page.goto("/");
  await page
    .getByRole("checkbox", { name: /Acconsento alla registrazione anonima/ })
    .check();
  await page.getByRole("button", { name: "INIZIA ESPERIENZA" }).click();
  await page
    .getByRole("button", { name: "Entra nell’osservatorio", exact: true })
    .waitFor({ timeout: 20000 });
  // Rendered invitation precedes the next narrative interval; let its clock begin.
  await page.clock.runFor(250);
  await page.clock.fastForward(18000);
  await page.clock.fastForward(2000);
  await page.clock.fastForward(4000);
  await page.clock.fastForward(220000);
  await page.clock.fastForward(3000);
  await expect(page.locator(".story-message")).toContainText(
    "Salvataggio non riuscito",
    { timeout: 10000 },
  );
  await page.clock.fastForward(16000);
  await page.clock.fastForward(10000);
  await expect(
    page.getByRole("button", { name: "Ricomincia", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".story-panel")).toContainText("Il futuro");
});
