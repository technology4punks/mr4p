import type { DatabaseSync } from "node:sqlite";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  validateRun,
  runColumns,
  runFromRow,
  type RunPage,
} from "../src/recording/payload.js";
import {
  runSchema,
  runInsert,
  runValues,
  expiry,
} from "../src/recording/sql.js";
export class RunStore {
  constructor(
    private db: DatabaseSync,
    private days: number,
  ) {
    db.exec(runSchema);
  }
  purge() {
    this.db
      .prepare("DELETE FROM experience_runs WHERE expires_at<=?")
      .run(Date.now());
  }
  async save(input: unknown) {
    const p = validateRun(input);
    this.purge();
    const hash = createHash("sha256").update(p.deleteToken).digest("hex");
    const old = this.db
      .prepare("SELECT capability_hash,status FROM experience_runs WHERE id=?")
      .get(p.id);
    if (old && (old.capability_hash !== hash || old.status === "deleted"))
      throw new Error("Identificativo non autorizzato.");
    const now = Date.now();
    this.db
      .prepare(runInsert)
      .run(...runValues(p, hash, now, expiry(now, this.days)));
    return { id: p.id };
  }
  async remove(id: string, token: string) {
    if (!/^[a-f0-9-]{36}$/i.test(id) || !/^[a-f0-9-]{72}$/i.test(token))
      return false;
    this.purge();
    const old = this.db
      .prepare("SELECT capability_hash FROM experience_runs WHERE id=?")
      .get(id);
    if (!old) {
      this.db
        .prepare(
          "INSERT INTO experience_runs (id,capability_hash,revision,started_at,elapsed_seconds,state,status,mode,guided,active_interventions,final_message,reason,consent_to_store,updated_at,expires_at) VALUES (?,?,0,0,0,'DELETED','deleted','browser',0,'[]','','closed',1,0,?)",
        )
        .run(
          id,
          createHash("sha256").update(token).digest("hex"),
          expiry(Date.now(), this.days),
        );
      return true;
    }
    const expected = Buffer.from(String(old.capability_hash)),
      actual = Buffer.from(createHash("sha256").update(token).digest("hex"));
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      return false;
    this.db
      .prepare(
        "UPDATE experience_runs SET revision=revision+1,started_at=0,elapsed_seconds=0,state='DELETED',status='deleted',mode='browser',guided=0,active_interventions='[]',final_message='',reason='closed',updated_at=0 WHERE id=?",
      )
      .run(id);
    return true;
  }
  async list(page = 0, pageSize = 20, status = ""): Promise<RunPage> {
    this.purge();
    const where = status ? " WHERE status=?" : " WHERE status != 'deleted'";
    const params = status ? [status] : [];
    const total = Number(
      this.db
        .prepare("SELECT COUNT(*) AS n FROM experience_runs" + where)
        .get(...params)?.n ?? 0,
    );
    const rows = this.db
      .prepare(
        `SELECT ${runColumns} FROM experience_runs${where} ORDER BY updated_at DESC,id LIMIT ? OFFSET ?`,
      )
      .all(...params, pageSize, page * pageSize);
    return { records: rows.map(runFromRow), total, page, pageSize };
  }
}
