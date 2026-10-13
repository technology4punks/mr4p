import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { SqliteSessions } from "../server/session-store";
import { createApp } from "../server/app";
import { validateRun } from "../src/recording/payload";
const stores: SqliteSessions[] = [];
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
afterEach(() => stores.splice(0).forEach((s) => s.close()));
describe("consented experience records and private control room", () => {
  it("rejects declined consent, identifying fields, unknown choices and unbounded times", () => {
    const p = payload();
    for (const changed of [
      { consent: false },
      { name: "Luca" },
      { audio: "raw" },
      { transcript: "raw" },
      { active: ["invented"] },
      { elapsedSeconds: -1 },
      { message: "email@example.com" },
      { startedAt: Date.now() + 999999 },
    ])
      expect(() => validateRun({ ...p, ...changed })).toThrow();
  });
  it("updates the same run only with its capability and newer revision, protecting terminal states", async () => {
    const s = new SqliteSessions();
    stores.push(s);
    const p = payload();
    await s.saveRun(p);
    await s.saveRun({
      ...p,
      revision: 3,
      status: "completed",
      state: "FAREWELL",
      elapsedSeconds: 190,
      active: ["GREEN_TREES"],
      message: "Il futuro non è scritto.",
    });
    await s.saveRun({ ...p, revision: 2 });
    await s.saveRun({ ...p, revision: 4 });
    const rows = await s.listRuns(0, 20, "");
    expect(rows.total).toBe(1);
    expect(rows.records[0].status).toBe("completed");
    expect(rows.records[0].elapsedSeconds).toBe(190);
    expect(JSON.stringify(rows)).not.toContain(p.deleteToken);
    expect(JSON.stringify(rows)).not.toContain("capability_hash");
    await expect(
      s.saveRun({ ...p, deleteToken: randomUUID() + randomUUID() }),
    ).rejects.toThrow();
  });
  it("deletes visit data and rejects resurrection by delayed writes", async () => {
    const s = new SqliteSessions();
    stores.push(s);
    const p = payload();
    await s.saveRun({
      ...p,
      active: ["GREEN_TREES"],
      message: "Una possibilità diversa.",
    });
    expect(await s.removeRun(p.id, "wrong")).toBe(false);
    expect(await s.removeRun(p.id, p.deleteToken)).toBe(true);
    await expect(s.saveRun({ ...p, revision: 999 })).rejects.toThrow();
    expect((await s.listRuns(0, 20, "")).total).toBe(0);
    const tomb = s.db.prepare("SELECT * FROM experience_runs").get()!;
    expect(tomb.final_message).toBe("");
    expect(tomb.active_interventions).toBe("[]");
    expect(tomb.started_at).toBe(0);
  });
  it("fails closed for anonymous users, spoofed identities, missing allowlist and other operators", async () => {
    const s = new SqliteSessions();
    stores.push(s);
    const config = {
      proxyAuthSecret: "test-proxy",
      controlRoomEmails: "operator@example.com",
    };
    const app = createApp(config, fetch, s);
    await s.saveRun(payload());
    expect(
      (await request(app).get("/api/control-room/experiences")).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get("/api/control-room/experiences")
          .set("oai-authenticated-user-email", "operator@example.com")
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get("/api/control-room/experiences")
          .set("x-neo-proxy-secret", "test-proxy")
          .set("x-neo-user", "123")
          .set("x-neo-email", "other@example.com")
      ).status,
    ).toBe(403);
    const r = await request(app)
      .get("/api/control-room/experiences")
      .set("x-neo-proxy-secret", "test-proxy")
      .set("x-neo-user", "123")
      .set("x-neo-email", "operator@example.com");
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(1);
    expect(r.headers["cache-control"]).toContain("no-store");
  });
  it("records through the public consent endpoint, paginates securely and removes expired visits", async () => {
    const s = new SqliteSessions();
    stores.push(s);
    const app = createApp({}, fetch, s),
      p = payload();
    expect(
      (
        await request(app)
          .post("/api/experience-runs")
          .set("origin", "http://localhost:3000")
          .send(p)
      ).status,
    ).toBe(201);
    expect(
      (
        await request(app)
          .post("/api/experience-runs")
          .set("origin", "https://evil.example")
          .send(p)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post("/api/experience-runs")
          .set("origin", "http://localhost:3000")
          .send({ ...p, consent: false })
      ).status,
    ).toBe(422);
    s.db.prepare("UPDATE experience_runs SET expires_at=0").run();
    expect((await s.listRuns(0, 20, "")).total).toBe(0);
  });
});

it("revokes the capability before a delayed initial write arrives", async () => {
  const s = new SqliteSessions();
  stores.push(s);
  const p = payload();
  expect(await s.removeRun(p.id, p.deleteToken)).toBe(true);
  await expect(s.saveRun(p)).rejects.toThrow();
  expect((await s.listRuns(0, 20, "")).total).toBe(0);
});
