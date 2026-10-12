import { validateSession } from "../src/decision/sessionPayload";
import { deriveCity } from "../src/decision/DecisionEngine";
const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
const hash = async (text: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
let since = Date.now(),
  count = 0;
export async function sessionsResponse(
  request: Request,
  db: D1Database | undefined,
  origin: string | undefined,
  retention = "30",
  id?: string,
) {
  if (
    request.headers.get("origin") !== origin ||
    !origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return json(403, { error: "Origine non autorizzata." });
  if (!db)
    return json(503, {
      error: "Persistenza non configurata. Nessun dato salvato.",
    });
  if (Date.now() - since > 60000) {
    since = Date.now();
    count = 0;
  }
  if (++count > 30)
    return json(429, { error: "Troppe richieste. Riprova fra un minuto." });
  if (request.method !== "POST" && request.method !== "DELETE")
    return json(405, { error: "Metodo non consentito." });
  try {
    await db
      .prepare("DELETE FROM future_sessions WHERE expires_at <= ?")
      .bind(Date.now())
      .run();
    if (request.method === "DELETE") {
      const token = (request.headers.get("authorization") ?? "").replace(
        /^Bearer /,
        "",
      );
      if (!id || !token)
        return json(403, { error: "Cancellazione non autorizzata." });
      const row = await db
        .prepare("SELECT deletion_hash FROM future_sessions WHERE id = ?")
        .bind(id)
        .first<{ deletion_hash: string }>();
      if (row && row.deletion_hash !== (await hash(token)))
        return json(403, { error: "Cancellazione non autorizzata." });
      await db
        .prepare("DELETE FROM future_sessions WHERE id = ?")
        .bind(id)
        .run();
      return json(200, { deleted: true });
    }
    if (Number(request.headers.get("content-length") ?? 0) > 16384)
      return json(413, { error: "Messaggio troppo grande." });
    const text = await request.text();
    if (text.length > 16384)
      return json(413, { error: "Messaggio troppo grande." });
    let p;
    try {
      p = validateSession(JSON.parse(text));
    } catch (error) {
      return json(422, {
        error: error instanceof Error ? error.message : "Dati non validi.",
      });
    }
    const deletionHash = await hash(p.deleteToken),
      now = Date.now();
    const days = Number(retention);
    const expiresAt =
      now +
      (Number.isFinite(days) ? Math.min(365, Math.max(1, days)) : 30) *
        86400000;
    const old = await db
      .prepare(
        "SELECT deletion_hash, expires_at FROM future_sessions WHERE id = ?",
      )
      .bind(p.id)
      .first<{ deletion_hash: string; expires_at: number }>();
    if (old)
      return old.deletion_hash === deletionHash
        ? json(200, { id: p.id, expiresAt: old.expires_at })
        : json(409, { error: "Identificativo già utilizzato." });
    await db
      .prepare(
        "INSERT INTO future_sessions (id, experience_version, decision_sequence, active_interventions, triggered_interdependencies, revised_decision, final_reflection, generated_future_message, consent_to_store, created_at, expires_at, deletion_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)",
      )
      .bind(
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
        deletionHash,
      )
      .run();
    return json(201, { id: p.id, expiresAt });
  } catch {
    return json(503, {
      error:
        "Salvataggio o cancellazione non riusciti. Nessun esito confermato.",
    });
  }
}
