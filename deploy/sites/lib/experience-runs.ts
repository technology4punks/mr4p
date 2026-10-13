import {
  validateRun,
  runColumns,
  runFromRow,
  controlRoomAuthorized,
} from "../src/recording/payload";
import { runInsert, runValues, expiry } from "../src/recording/sql";
const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    },
  });
const hash = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
let since = 0,
  count = 0;
export async function runsResponse(
  request: Request,
  db: D1Database | undefined,
  origin: string | undefined,
  retention = "30",
  id?: string,
) {
  if (
    !origin ||
    request.headers.get("origin") !== origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return json(403, { error: "Origine non autorizzata." });
  if (!db) return json(503, { error: "Archivio non disponibile." });
  if (Date.now() - since > 60000) {
    since = Date.now();
    count = 0;
  }
  if (++count > 60) return json(429, { error: "Troppe richieste." });
  try {
    await db
      .prepare("DELETE FROM experience_runs WHERE expires_at<=?")
      .bind(Date.now())
      .run();
    if (request.method === "DELETE") {
      const token = (request.headers.get("authorization") ?? "").replace(
        /^Bearer /,
        "",
      );
      if (
        !id ||
        !token ||
        !/^[a-f0-9-]{36}$/i.test(id) ||
        !/^[a-f0-9-]{72}$/i.test(token)
      )
        return json(403, { error: "Cancellazione non autorizzata." });
      const old = await db
        .prepare("SELECT capability_hash FROM experience_runs WHERE id=?")
        .bind(id)
        .first<{ capability_hash: string }>();
      if (!old) {
        await db
          .prepare(
            "INSERT INTO experience_runs (id,capability_hash,revision,started_at,elapsed_seconds,state,status,mode,guided,active_interventions,final_message,reason,consent_to_store,updated_at,expires_at) VALUES (?,?,0,0,0,'DELETED','deleted','browser',0,'[]','','closed',1,0,?)",
          )
          .bind(id, await hash(token), expiry(Date.now(), Number(retention)))
          .run();
        return json(200, { deleted: true });
      }
      if (old && old.capability_hash !== (await hash(token)))
        return json(403, { error: "Cancellazione non autorizzata." });
      await db
        .prepare(
          "UPDATE experience_runs SET revision=revision+1,started_at=0,elapsed_seconds=0,state='DELETED',status='deleted',mode='browser',guided=0,active_interventions='[]',final_message='',reason='closed',updated_at=0 WHERE id=?",
        )
        .bind(id)
        .run();
      return json(200, { deleted: true });
    }
    if (request.method !== "POST")
      return json(405, { error: "Metodo non consentito." });
    if (Number(request.headers.get("content-length") ?? 0) > 16384)
      return json(413, { error: "Messaggio troppo grande." });
    const body = await request.text();
    if (body.length > 16384)
      return json(413, { error: "Messaggio troppo grande." });
    let p;
    try {
      p = validateRun(JSON.parse(body));
    } catch {
      return json(422, { error: "Dati o consenso non validi." });
    }
    const h = await hash(p.deleteToken),
      now = Date.now();
    const old = await db
      .prepare("SELECT capability_hash,status FROM experience_runs WHERE id=?")
      .bind(p.id)
      .first<{ capability_hash: string; status: string }>();
    if (old && (old.capability_hash !== h || old.status === "deleted"))
      return json(409, { error: "Identificativo non autorizzato." });
    await db
      .prepare(runInsert)
      .bind(...runValues(p, h, now, expiry(now, Number(retention))))
      .run();
    return json(201, { id: p.id });
  } catch {
    return json(503, {
      error: "Registrazione non confermata. L’esperienza può continuare.",
    });
  }
}
export async function controlRoomResponse(
  request: Request,
  db: D1Database | undefined,
  emails: string | undefined,
) {
  if (!request.headers.get("oai-authenticated-user-id"))
    return json(401, {
      error: "Accedi con ChatGPT per aprire la control room.",
      signin: "/signin-with-chatgpt?return_to=%2Fcontrol-room",
    });
  if (
    !controlRoomAuthorized(
      request.headers.get("oai-authenticated-user-email"),
      emails,
    )
  )
    return json(403, { error: "Account non autorizzato alla control room." });
  if (!db) return json(503, { error: "Archivio non disponibile." });
  const u = new URL(request.url),
    page = Number(u.searchParams.get("page") ?? 0),
    size = Number(u.searchParams.get("pageSize") ?? 20),
    status = u.searchParams.get("status") ?? "";
  if (
    !Number.isInteger(page) ||
    page < 0 ||
    page > 10000 ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 50 ||
    !["", "active", "completed", "interrupted"].includes(status)
  )
    return json(422, { error: "Filtri non validi." });
  try {
    await db
      .prepare("DELETE FROM experience_runs WHERE expires_at<=?")
      .bind(Date.now())
      .run();
    const where = status ? " WHERE status=?" : " WHERE status != 'deleted'",
      params = status ? [status] : [];
    const total = await db
      .prepare("SELECT COUNT(*) AS n FROM experience_runs" + where)
      .bind(...params)
      .first<{ n: number }>();
    const rows = await db
      .prepare(
        `SELECT ${runColumns} FROM experience_runs${where} ORDER BY updated_at DESC,id LIMIT ? OFFSET ?`,
      )
      .bind(...params, size, page * size)
      .all<Record<string, unknown>>();
    return json(200, {
      records: rows.results.map(runFromRow),
      total: total?.n ?? 0,
      page,
      pageSize: size,
    });
  } catch {
    return json(503, { error: "Archivio non disponibile." });
  }
}
