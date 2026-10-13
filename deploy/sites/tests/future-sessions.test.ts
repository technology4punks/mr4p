import { afterEach, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { sessionsResponse } from "../lib/future-sessions";
import { DecisionEngine } from "../src/decision/DecisionEngine";
const origin = "https://neo.example";
let db: DatabaseSync;
function setup() {
  db = new DatabaseSync(":memory:");
  db.exec(
    readFileSync("drizzle/0000_outstanding_mulholland_black.sql", "utf8"),
  );
  return {
    prepare: (sql: string) => ({
      bind: (...params: (string | number | null)[]) => ({
        run: async () => db.prepare(sql).run(...params),
        first: async () => db.prepare(sql).get(...params) ?? null,
      }),
    }),
  } as unknown as D1Database;
}
function payload() {
  const d = new DecisionEngine();
  for (const id of ["MOB_BIKE", "GREEN_PARK", "WATER_REUSE", "ENERGY_ROOFTOP"])
    d.choose(id);
  return {
    id: randomUUID(),
    deleteToken: randomUUID() + randomUUID(),
    experienceVersion: "V4",
    sequence: d.snapshot.sequence,
    active: d.snapshot.active,
    revision: null,
    reflection: "Serve collaborazione.",
    message: "Le decisioni sono connesse.",
    consent: true,
  };
}
const req = (body: unknown) =>
  new Request(origin + "/api/future-sessions", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
afterEach(() => db?.close());
it("executes the D1 migration and persist/delete SQL through the real route logic", async () => {
  const binding = setup(),
    p = payload();
  expect((await sessionsResponse(req(p), binding, origin)).status).toBe(201);
  const row = db.prepare("SELECT * FROM future_sessions").get()!;
  expect(row.experience_version).toBe("V4");
  expect(row.deletion_hash).not.toBe(p.deleteToken);
  expect(JSON.stringify(row)).not.toContain(p.deleteToken);
  expect((await sessionsResponse(req(p), binding, origin)).status).toBe(200);
  const deletion = new Request(origin + "/api/future-sessions/" + p.id, {
    method: "DELETE",
    headers: { Origin: origin, Authorization: "Bearer wrong" },
  });
  expect(
    (await sessionsResponse(deletion, binding, origin, "30", p.id)).status,
  ).toBe(403);
  deletion.headers.set("Authorization", "Bearer " + p.deleteToken);
  expect(
    (await sessionsResponse(deletion, binding, origin, "30", p.id)).status,
  ).toBe(200);
  expect(db.prepare("SELECT COUNT(*) AS n FROM future_sessions").get()?.n).toBe(
    0,
  );
});
it("rejects denied consent and extra identifying data before any INSERT", async () => {
  const binding = setup(),
    p = payload();
  expect(
    (await sessionsResponse(req({ ...p, consent: false }), binding, origin))
      .status,
  ).toBe(422);
  expect(
    (
      await sessionsResponse(
        req({ ...p, email: "private@example.com" }),
        binding,
        origin,
      )
    ).status,
  ).toBe(422);
  expect(db.prepare("SELECT COUNT(*) AS n FROM future_sessions").get()?.n).toBe(
    0,
  );
});
it("fails safely without a database or with a failed migration", async () => {
  expect(
    (await sessionsResponse(req(payload()), undefined, origin)).status,
  ).toBe(503);
  const binding = setup();
  db.exec("DROP TABLE future_sessions");
  const r = await sessionsResponse(req(payload()), binding, origin);
  expect(r.status).toBe(503);
  expect(await r.text()).not.toContain("no such table");
});
it("rejects cross-origin requests and removes expired records", async () => {
  const binding = setup(),
    p = payload();
  const wrong = req(p);
  wrong.headers.set("Origin", "https://evil.example");
  expect((await sessionsResponse(wrong, binding, origin)).status).toBe(403);
  await sessionsResponse(req(p), binding, origin, "1");
  db.prepare("UPDATE future_sessions SET expires_at=0").run();
  await sessionsResponse(req(payload()), binding, origin);
  expect(db.prepare("SELECT count(*) AS n FROM future_sessions").get()?.n).toBe(
    1,
  );
});
