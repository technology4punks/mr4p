import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash, timingSafeEqual } from "node:crypto";
import { validateSession } from "../src/decision/sessionPayload.js";
import { deriveCity } from "../src/decision/DecisionEngine.js";
export interface SessionRepository {
  save(input: unknown): Promise<{ id: string; expiresAt: number }>;
  remove(id: string, token: string): Promise<boolean>;
}
export class SqliteSessions implements SessionRepository {
  readonly db: DatabaseSync;
  constructor(
    path = ":memory:",
    private retentionDays = 30,
  ) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS future_sessions (id TEXT PRIMARY KEY, experience_version TEXT NOT NULL, decision_sequence TEXT NOT NULL, active_interventions TEXT NOT NULL, triggered_interdependencies TEXT NOT NULL, revised_decision TEXT, final_reflection TEXT NOT NULL, generated_future_message TEXT NOT NULL, consent_to_store INTEGER NOT NULL CHECK(consent_to_store=1), created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, deletion_hash TEXT NOT NULL); CREATE INDEX IF NOT EXISTS future_sessions_expiry ON future_sessions(expires_at);",
    );
    this.purge();
  }
  purge() {
    this.db
      .prepare("DELETE FROM future_sessions WHERE expires_at <= ?")
      .run(Date.now());
  }
  async save(input: unknown) {
    const p = validateSession(input);
    this.purge();
    const hash = createHash("sha256").update(p.deleteToken).digest("hex");
    const prior = this.db
      .prepare(
        "SELECT deletion_hash, expires_at FROM future_sessions WHERE id=?",
      )
      .get(p.id);
    if (prior) {
      if (prior.deletion_hash !== hash)
        throw new Error("Identificativo già utilizzato.");
      return { id: p.id, expiresAt: Number(prior.expires_at) };
    }
    const now = Date.now(),
      expiresAt =
        now +
        Math.max(
          1,
          Math.min(
            365,
            Number.isFinite(this.retentionDays) ? this.retentionDays : 30,
          ),
        ) *
          86400000;
    this.db
      .prepare(
        "INSERT INTO future_sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)",
      )
      .run(
        p.id,
        "V4",
        JSON.stringify(p.sequence),
        JSON.stringify(p.active),
        JSON.stringify(deriveCity(p.active.map((d) => d.optionId)).flags),
        p.revision ? JSON.stringify(p.revision) : null,
        p.reflection,
        p.message,
        now,
        expiresAt,
        hash,
      );
    return { id: p.id, expiresAt };
  }
  async remove(id: string, token: string) {
    this.purge();
    const row = this.db
      .prepare("SELECT deletion_hash FROM future_sessions WHERE id=?")
      .get(id);
    if (!row) return true;
    const expected = Buffer.from(String(row.deletion_hash)),
      actual = Buffer.from(createHash("sha256").update(token).digest("hex"));
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      return false;
    this.db.prepare("DELETE FROM future_sessions WHERE id=?").run(id);
    return true;
  }
  close() {
    this.db.close();
  }
}
