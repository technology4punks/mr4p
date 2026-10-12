import { expect, test } from "@playwright/test";
import { writeFileSync } from "node:fs";
const chosen = [
  ["Verde urbano", "Grande parco"],
  ["Acqua", "Riutilizzo di acque reflue trattate"],
  ["Mobilità urbana", "Tram elettrici"],
  ["Energia", "Fotovoltaico sui tetti"],
];
test("V4: four cumulative decisions, one revision, reflection, consent, persistence and deletion", async ({
  page,
}) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: async () => {
          throw new DOMException("Test denies audio", "NotAllowedError");
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "INIZIA ESPERIENZA" }).click();
  await page
    .getByRole("button", { name: "Entra nell’osservatorio", exact: true })
    .click({ timeout: 20000 });
  await page
    .getByRole("button", { name: "Da dove cominciamo?", exact: true })
    .click({ timeout: 15000 });
  await expect(
    page.getByRole("combobox", { name: "Tema della visita" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Developer +", exact: true }).click();
  const canvas = page.locator("canvas");
  for (const [lever, label] of chosen) {
    await page.getByRole("button", { name: lever, exact: true }).click();
    await page
      .locator('[aria-label="Tre interventi disponibili"] button')
      .filter({ has: page.getByText(label, { exact: true }) })
      .click();
    await expect(page.locator(".story-message")).toContainText(
      "la città si trasforma",
    );
    await canvas.scrollIntoViewIfNeeded();
    await page
      .getByRole("button", { name: "Continua", exact: true })
      .click({ timeout: 17000 });
  }
  await expect(
    page.getByRole("button", { name: "Concludi con quattro" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Concludi con quattro" }).click();
  await page.getByRole("button", { name: "Ripensa una decisione" }).click();
  await page
    .getByRole("combobox", { name: "Decisione da sostituire" })
    .selectOption("decision-1");
  await page
    .locator(".story-panel .option-list button")
    .filter({ hasText: "Corridoi ecologici" })
    .click();
  await canvas.scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: "Osserva la città finale" })
    .click({ timeout: 17000 });
  await expect(
    page.getByRole("heading", { name: "Il futuro che hai costruito" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ripensa una decisione" }),
  ).toHaveCount(0);
  const diagnostics = await page.locator(".debug dl").innerText();
  writeFileSync(
    `test-results/v4-performance-${test.info().project.name}.json`,
    JSON.stringify(
      {
        profile: test.info().project.name,
        diagnostics,
        hardware: "headless software renderer; not Quest Pro",
      },
      null,
      2,
    ),
  );
  await canvas.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `test-results/v4-city-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Torna al presente" }).click();
  await page
    .getByLabel("Messaggio al futuro")
    .fill("Serve collaborazione per comprendere i compromessi.");
  await page.getByRole("button", { name: "Condividi la riflessione" }).click();
  await expect(
    page.getByRole("button", { name: "Scarica ricevuta privata" }),
  ).toHaveCount(0);
  const saved = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/future-sessions") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Acconsento al salvataggio" }).click();
  const response = await saved;
  expect(response.status()).toBe(201);
  const body = response.request().postDataJSON();
  expect(body.sequence[0].optionId).toBe("GREEN_PARK");
  expect(body.active[0].optionId).toBe("BIO_CORRIDORS");
  expect(body.consent).toBe(true);
  expect(body).not.toHaveProperty("name");
  await expect(
    page.getByRole("button", { name: "Scarica ricevuta privata" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancella i dati salvati" }).click();
  await expect(
    page.getByText("Dati cancellati.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ricomincia", exact: true }),
  ).toBeVisible({ timeout: 10000 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("returns while entering, declines storage, then restarts cleanly", async ({
  page,
}) => {
  // Two portal sequences plus return/farewell and software-rendered actionability.
  // Keep the phase assertions bounded; allow the entire multi-phase visit to finish.
  test.setTimeout(60000);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: async () => {
          throw new Error("No device");
        },
      },
    }),
  );
  let writes = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/future-sessions") && r.method() === "POST")
      writes++;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "INIZIA ESPERIENZA" }).click();
  await page
    .getByRole("button", { name: "Entra nell’osservatorio", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ritorna alla realtà", exact: true })
    .click();
  await page
    .getByLabel("Messaggio al futuro")
    .fill("Le scelte richiedono attenzione.");
  await page.getByRole("button", { name: "Condividi la riflessione" }).click();
  await page
    .getByRole("button", { name: "Continua senza salvare", exact: true })
    .click();
  await page.getByRole("button", { name: "Ricomincia", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Entra nell’osservatorio", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  expect(writes).toBe(0);
});

test("completes entry and a seven-second choice when canvas frame callbacks are suspended", async ({
  page,
}) => {
  test.setTimeout(45000);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: async () => {
          throw new Error("No device");
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "INIZIA ESPERIENZA" }).click();
  const entry = page.getByRole("button", {
    name: "Entra nell’osservatorio",
    exact: true,
  });
  await expect(entry).toBeVisible({ timeout: 15000 });
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
  });
  await entry.dispatchEvent("click");
  const begin = page.getByRole("button", {
    name: "Da dove cominciamo?",
    exact: true,
  });
  await expect(begin).toBeVisible({ timeout: 8000 });
  await begin.dispatchEvent("click");
  await page
    .getByRole("button", { name: "Verde urbano", exact: true })
    .dispatchEvent("click");
  const started = Date.now();
  await page
    .locator('[aria-label="Tre interventi disponibili"] button')
    .filter({ has: page.getByText("Grande parco", { exact: true }) })
    .dispatchEvent("click");
  await expect(
    page.getByRole("button", { name: "Continua", exact: true }),
  ).toBeVisible({ timeout: 12000 });
  expect(Date.now() - started).toBeGreaterThan(6000);
  expect(Date.now() - started).toBeLessThan(11000);
});
