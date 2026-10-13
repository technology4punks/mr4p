import { afterEach, it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { runsResponse, controlRoomResponse } from "../lib/experience-runs";
let db: DatabaseSync;
function setup() {
  db = new DatabaseSync(":memory:");
  db.exec(
    readFileSync("drizzle/0000_outstanding_mulholland_black.sql", "utf8"),
  );
  db.exec(readFileSync("drizzle/0001_experience_runs.sql", "utf8"));
  return {
    prepare: (sql: string) => {
      let params: (string | number | null)[] = [];
      const query = {
        bind: (...p: (string | number | null)[]) => {
          params = p;
          return query;
        },
        run: async () => db.prepare(sql).run(...params),
        first: async () => db.prepare(sql).get(...params) ?? null,
        all: async () => ({ results: db.prepare(sql).all(...params) }),
      };
      return query;
    },
  } as unknown as D1Database;
}
const origin = "https://neo.example";
const payload = () => ({
  id: randomUUID(),
  deleteToken: randomUUID() + randomUUID(),
  consent: true,
  revision: 1,
  startedAt: Date.now(),
  elapsedSeconds: 0,
  state: "INITIALIZING_MR",
  status: "active",
  mode: "browser",
  guided: true,
  active: [],
  message: "",
  reason: "requested",
});
const req = (p: unknown) =>
  new Request(origin + "/api/experience-runs", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
afterEach(() => db?.close());
it("applies an additive D1 migration and authorizes each operator read server-side", async () => {
  const binding = setup(),
    p = payload();
  expect((await runsResponse(req(p), binding, origin)).status).toBe(201);
  const r = new Request(origin + "/api/control-room/experiences");
  expect(
    (await controlRoomResponse(r, binding, "operator@example.com")).status,
  ).toBe(401);
  r.headers.set("oai-authenticated-user-id", "test-id");
  r.headers.set("oai-authenticated-user-email", "other@example.com");
  expect(
    (await controlRoomResponse(r, binding, "operator@example.com")).status,
  ).toBe(403);
  r.headers.set("oai-authenticated-user-email", "operator@example.com");
  expect((await controlRoomResponse(r, binding, undefined)).status).toBe(403);
  const good = await controlRoomResponse(r, binding, "operator@example.com");
  expect(good.status).toBe(200);
  const text = await good.text();
  expect(text).not.toContain("capability_hash");
  expect(text).not.toContain(p.deleteToken);
  expect(JSON.parse(text).total).toBe(1);
  expect(db.prepare("SELECT COUNT(*) AS n FROM future_sessions").get()?.n).toBe(
    0,
  );
});
it("preserves revisions and terminal visits, rejects wrong capabilities and wipes revoked records", async () => {
  const binding = setup(),
    p = payload();
  await runsResponse(req(p), binding, origin);
  await runsResponse(
    req({
      ...p,
      revision: 3,
      elapsedSeconds: 180,
      status: "completed",
      state: "FAREWELL",
      active: ["MOB_TRAM"],
      message: "Una scelta apre possibilità.",
    }),
    binding,
    origin,
  );
  await runsResponse(req({ ...p, revision: 2 }), binding, origin);
  expect(db.prepare("SELECT status FROM experience_runs").get()?.status).toBe(
    "completed",
  );
  expect(
    (
      await runsResponse(
        req({ ...p, deleteToken: randomUUID() + randomUUID() }),
        binding,
        origin,
      )
    ).status,
  ).toBe(409);
  const del = new Request(origin + "/api/experience-runs/" + p.id, {
    method: "DELETE",
    headers: { origin, authorization: "Bearer " + p.deleteToken },
  });
  expect((await runsResponse(del, binding, origin, "30", p.id)).status).toBe(
    200,
  );
  await runsResponse(req({ ...p, revision: 999 }), binding, origin);
  const row = db.prepare("SELECT * FROM experience_runs").get()!;
  expect(row.status).toBe("deleted");
  expect(row.final_message).toBe("");
  expect(row.started_at).toBe(0);
});
it("requires affirmative consent, rejects participant details and validates bounded filters", async () => {
  const binding = setup(),
    p = payload();
  expect(
    (await runsResponse(req({ ...p, consent: false }), binding, origin)).status,
  ).toBe(422);
  expect(
    (await runsResponse(req({ ...p, name: "Luca" }), binding, origin)).status,
  ).toBe(422);
  const r = new Request(origin + "/api/control-room/experiences?pageSize=999", {
    headers: {
      "oai-authenticated-user-id": "id",
      "oai-authenticated-user-email": "operator@example.com",
    },
  });
  expect(
    (await controlRoomResponse(r, binding, "operator@example.com")).status,
  ).toBe(422);
  expect((await runsResponse(req(p), undefined, origin)).status).toBe(503);
});
it("blocks a delayed first write after revocation even before an acknowledgement", async () => {
  const binding = setup(),
    p = payload();
  const del = new Request(origin + "/api/experience-runs/" + p.id, {
    method: "DELETE",
    headers: { origin, authorization: "Bearer " + p.deleteToken },
  });
  expect((await runsResponse(del, binding, origin, "30", p.id)).status).toBe(
    200,
  );
  expect((await runsResponse(req(p), binding, origin)).status).toBe(409);
  expect(db.prepare("SELECT status FROM experience_runs").get()?.status).toBe(
    "deleted",
  );
});
