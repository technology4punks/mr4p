import { optionById } from "../decision/catalog.js";
export type RunPayload = {
  id: string;
  deleteToken: string;
  consent: true;
  revision: number;
  startedAt: number;
  elapsedSeconds: number;
  state: string;
  status: "active" | "completed" | "interrupted";
  mode: "browser" | "immersive-ar" | "immersive-vr";
  guided: boolean;
  active: string[];
  message: string;
  reason: "choices" | "deadline" | "requested" | "exit" | "closed";
};
export function validateRun(input: unknown): RunPayload {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Esperienza non valida.");
  const p = input as Record<string, unknown>;
  const keys = [
    "id",
    "deleteToken",
    "consent",
    "revision",
    "startedAt",
    "elapsedSeconds",
    "state",
    "status",
    "mode",
    "guided",
    "active",
    "message",
    "reason",
  ];
  if (
    Object.keys(p).length !== keys.length ||
    Object.keys(p).some((k) => !keys.includes(k)) ||
    p.consent !== true
  )
    throw new Error("Consenso esplicito e soli dati anonimi richiesti.");
  if (
    typeof p.id !== "string" ||
    !/^[a-f0-9-]{36}$/i.test(p.id) ||
    typeof p.deleteToken !== "string" ||
    !/^[a-f0-9-]{72}$/i.test(p.deleteToken)
  )
    throw new Error("Identificativo non valido.");
  if (
    !Number.isSafeInteger(p.revision) ||
    Number(p.revision) < 0 ||
    !Number.isSafeInteger(p.startedAt) ||
    Number(p.startedAt) < 0 ||
    Number(p.startedAt) > Date.now() + 60_000 ||
    !Number.isInteger(p.elapsedSeconds) ||
    Number(p.elapsedSeconds) < 0 ||
    Number(p.elapsedSeconds) > 86400
  )
    throw new Error("Tempi non validi.");
  if (
    typeof p.state !== "string" ||
    !/^[A-Z_]{3,40}$/.test(p.state) ||
    !["active", "completed", "interrupted"].includes(String(p.status)) ||
    !["browser", "immersive-ar", "immersive-vr"].includes(String(p.mode)) ||
    typeof p.guided !== "boolean" ||
    !["choices", "deadline", "requested", "exit", "closed"].includes(
      String(p.reason),
    )
  )
    throw new Error("Stato non valido.");
  if (
    !Array.isArray(p.active) ||
    p.active.length > 30 ||
    new Set(p.active).size !== p.active.length ||
    p.active.some((id) => typeof id !== "string" || !optionById.has(id))
  )
    throw new Error("Scelte non valide.");
  if (
    typeof p.message !== "string" ||
    p.message.length > 300 ||
    /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|\b(?:mi chiamo|il mio nome|la mia email)\b|\b(?:\+?\d[\d ().-]{6,}\d)\b/i.test(
      p.message,
    )
  )
    throw new Error("Frase non anonima.");
  return structuredClone(p) as RunPayload;
}
export type RunRecord = Omit<RunPayload, "deleteToken" | "consent"> & {
  updatedAt: number;
  expiresAt: number;
};
export type RunPage = {
  records: RunRecord[];
  total: number;
  page: number;
  pageSize: number;
};
export function controlRoomAuthorized(
  email: string | null | undefined,
  allowed: string | undefined,
) {
  return (
    !!email &&
    (allowed ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .includes(email.toLowerCase())
  );
}
export const runColumns =
  "id, revision, started_at, elapsed_seconds, state, status, mode, guided, active_interventions, final_message, reason, updated_at, expires_at";
export function runFromRow(row: Record<string, unknown>): RunRecord {
  return {
    id: String(row.id),
    revision: Number(row.revision),
    startedAt: Number(row.started_at),
    elapsedSeconds: Number(row.elapsed_seconds),
    state: String(row.state),
    status: row.status as RunRecord["status"],
    mode: row.mode as RunRecord["mode"],
    guided: !!row.guided,
    active: JSON.parse(String(row.active_interventions)),
    message: String(row.final_message),
    reason: row.reason as RunRecord["reason"],
    updatedAt: Number(row.updated_at),
    expiresAt: Number(row.expires_at),
  };
}

/** A yes to the story/teleport is not permission to retain participant data. */
export function explicitStorageRequest(text: string) {
  const t = text.toLowerCase();
  if (/\b(?:non|no|rifiuto|senza)\b/u.test(t)) return false;
  return (
    /\b(?:acconsento|consento)\b/u.test(t) ||
    (/\b(?:salva\p{L}*|registr\p{L}*)\b/u.test(t) &&
      /\b(?:dati|esperienza|decisioni|scelte|frase|messaggio)\b/u.test(t))
  );
}
