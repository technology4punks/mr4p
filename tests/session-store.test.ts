import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { DecisionEngine } from "../src/decision/DecisionEngine";
import { validateSession } from "../src/decision/sessionPayload";
import {
  SqliteSessions,
  type SessionRepository,
} from "../server/session-store";
import { createApp } from "../server/app";
const stores: SqliteSessions[] = [],
  folders: string[] = [];
function payload() {
  const engine = new DecisionEngine();
  for (const id of ["GREEN_PARK", "MOB_TRAM", "WATER_REUSE", "ENERGY_ROOFTOP"])
    engine.choose(id);
  engine.finish();
  engine.revise("decision-1", "BIO_CORRIDORS");
  return {
    id: randomUUID(),
    deleteToken: randomUUID() + randomUUID(),
    experienceVersion: "V4",
    sequence: engine.snapshot.sequence,
    active: engine.snapshot.active,
    revision: engine.snapshot.revision,
    reflection: "Serve capire i compromessi e collaborare.",
    message: "Acqua, mobilità ed energia sono connesse.",
    consent: true,
  };
}
afterEach(() => {
  vi.useRealTimers();
  stores.splice(0).forEach((s) => s.close());
  folders.splice(0).forEach((f) => rmSync(f, { recursive: true, force: true }));
});
describe("anonymous persistence", () => {
  it.each(["name", "email", "audio", "transcript", "resources", "flags"])(
    "rejects participant identifiers and client-authored %s",
    (key) => {
      expect(() =>
        validateSession({ ...payload(), [key]: "private" }),
      ).toThrow();
    },
  );
  it("requires separate affirmative consent and reconstructs the revision", () => {
    const p = payload();
    expect(validateSession(p).active[0].optionId).toBe("BIO_CORRIDORS");
    expect(() => validateSession({ ...p, consent: false })).toThrow();
    expect(() => validateSession({ ...p, active: p.sequence })).toThrow();
    expect(() =>
      validateSession({
        ...p,
        revision: { ...p.revision, newOptionId: "bad" },
      }),
    ).toThrow();
  });
  it("rejects contact data and duplicates", () => {
    const p = payload();
    expect(() =>
      validateSession({ ...p, reflection: "Scrivimi a test@example.com" }),
    ).toThrow();
    expect(() =>
      validateSession({ ...p, sequence: [...p.sequence, p.sequence[0]] }),
    ).toThrow();
  });
  it("survives reopening SQLite, stores only hashes, and preserves original choices", async () => {
    const dir = mkdtempSync(join(tmpdir(), "neo-v4-"));
    folders.push(dir);
    const p = payload(),
      path = join(dir, "db.sqlite");
    const first = new SqliteSessions(path);
    await first.save(p);
    first.close();
    const store = new SqliteSessions(path);
    stores.push(store);
    const row = store.db.prepare("SELECT * FROM future_sessions").get()!;
    expect(row.experience_version).toBe("V4");
    expect(JSON.parse(String(row.decision_sequence))[0].optionId).toBe(
      "GREEN_PARK",
    );
    expect(JSON.parse(String(row.active_interventions))[0].optionId).toBe(
      "BIO_CORRIDORS",
    );
    expect(String(row.deletion_hash)).not.toBe(p.deleteToken);
    expect(JSON.stringify(row)).not.toContain(p.deleteToken);
    expect(await store.remove(p.id, "wrong")).toBe(false);
    expect(await store.remove(p.id, p.deleteToken)).toBe(true);
    expect(
      store.db.prepare("SELECT count(*) AS n FROM future_sessions").get()?.n,
    ).toBe(0);
  });
  it("retries idempotently and expires records under configured retention", async () => {
    vi.useFakeTimers();
    const store = new SqliteSessions(":memory:", 1);
    stores.push(store);
    const p = payload();
    const receipt = await store.save(p);
    expect(await store.save(p)).toEqual(receipt);
    expect(
      store.db.prepare("SELECT count(*) AS n FROM future_sessions").get()?.n,
    ).toBe(1);
    vi.advanceTimersByTime(86400001);
    store.purge();
    expect(
      store.db.prepare("SELECT count(*) AS n FROM future_sessions").get()?.n,
    ).toBe(0);
  });
  it("never calls storage for missing consent, invalid state or cross-site requests", async () => {
    const repo: SessionRepository = { save: vi.fn(), remove: vi.fn() };
    const app = createApp({}, fetch, repo);
    for (const body of [
      { ...payload(), consent: false },
      { ...payload(), active: [] },
    ])
      expect(
        (
          await request(app)
            .post("/api/future-sessions")
            .set("Origin", "http://localhost:3000")
            .send(body)
        ).status,
      ).toBe(422);
    expect(
      (
        await request(app)
          .post("/api/future-sessions")
          .set("Origin", "https://evil.example")
          .send(payload())
      ).status,
    ).toBe(403);
    expect(repo.save).not.toHaveBeenCalled();
  });
  it("returns failure without fake acknowledgment and authenticates deletion", async () => {
    const bad: SessionRepository = {
      save: vi.fn().mockRejectedValue(new Error("private SQL details")),
      remove: vi.fn().mockResolvedValue(false),
    };
    const app = createApp({}, fetch, bad);
    const failed = await request(app)
      .post("/api/future-sessions")
      .set("Origin", "http://localhost:3000")
      .send(payload());
    expect(failed.status).toBe(503);
    expect(failed.text).not.toContain("private SQL");
    expect(
      (
        await request(app)
          .delete("/api/future-sessions/" + randomUUID())
          .set("Origin", "http://localhost:3000")
          .set("Authorization", "Bearer wrong")
      ).status,
    ).toBe(403);
  });
  it("saves and deletes through the actual API", async () => {
    const store = new SqliteSessions();
    stores.push(store);
    const app = createApp({}, fetch, store),
      p = payload();
    expect(
      (
        await request(app)
          .post("/api/future-sessions")
          .set("Origin", "http://localhost:3000")
          .send(p)
      ).status,
    ).toBe(201);
    expect(
      (
        await request(app)
          .delete("/api/future-sessions/" + p.id)
          .set("Origin", "http://localhost:3000")
          .set("Authorization", "Bearer " + p.deleteToken)
      ).body.deleted,
    ).toBe(true);
  });
});
