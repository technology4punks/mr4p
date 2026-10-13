import type { RunPayload } from "./payload.js";
export const runSchema = `CREATE TABLE IF NOT EXISTS experience_runs (
 id TEXT PRIMARY KEY, capability_hash TEXT NOT NULL, revision INTEGER NOT NULL,
 started_at INTEGER NOT NULL, elapsed_seconds INTEGER NOT NULL, state TEXT NOT NULL,
 status TEXT NOT NULL, mode TEXT NOT NULL, guided INTEGER NOT NULL,
 active_interventions TEXT NOT NULL, final_message TEXT NOT NULL, reason TEXT NOT NULL,
 consent_to_store INTEGER NOT NULL CHECK(consent_to_store=1), updated_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
); CREATE INDEX IF NOT EXISTS experience_runs_updated ON experience_runs(updated_at DESC);
CREATE INDEX IF NOT EXISTS experience_runs_expiry ON experience_runs(expires_at);`;
export const runInsert = `INSERT INTO experience_runs
(id, capability_hash, revision, started_at, elapsed_seconds, state, status, mode, guided, active_interventions, final_message, reason, consent_to_store, updated_at, expires_at)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?,?) ON CONFLICT(id) DO UPDATE SET
revision=excluded.revision, elapsed_seconds=excluded.elapsed_seconds, state=excluded.state, status=excluded.status,
mode=excluded.mode, active_interventions=excluded.active_interventions, final_message=excluded.final_message,
reason=excluded.reason, updated_at=excluded.updated_at
WHERE experience_runs.capability_hash=excluded.capability_hash AND experience_runs.revision<excluded.revision
AND (experience_runs.status='active' OR experience_runs.status=excluded.status);`;
export function runValues(
  p: RunPayload,
  hash: string,
  now: number,
  expiresAt: number,
) {
  return [
    p.id,
    hash,
    p.revision,
    p.startedAt,
    p.elapsedSeconds,
    p.state,
    p.status,
    p.mode,
    Number(p.guided),
    JSON.stringify(p.active),
    p.message,
    p.reason,
    now,
    expiresAt,
  ];
}
export function expiry(now: number, days: number) {
  return (
    now +
    (Number.isFinite(days) ? Math.min(365, Math.max(1, days)) : 30) * 86400000
  );
}
