"use client";
import { useCallback, useEffect, useState } from "react";
import { optionById } from "../decision/catalog";
import type { RunPage, RunRecord } from "../recording/payload";
import "./controlRoom.css";
const labels = {
  active: "In corso",
  completed: "Completata",
  interrupted: "Interrotta",
};
const duration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const date = (time: number) =>
  new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(time);
export function ControlRoom() {
  const [data, setData] = useState<RunPage>(),
    [error, setError] = useState(""),
    [signin, setSignin] = useState(""),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(0),
    [status, setStatus] = useState(""),
    [selected, setSelected] = useState<RunRecord>(),
    [last, setLast] = useState(0);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(
          `/api/control-room/experiences?page=${page}&pageSize=20&status=${status}`,
          { cache: "no-store", signal },
        );
        const result = (await response.json()) as RunPage & {
          signin?: string;
          error?: string;
        };
        if (!response.ok) {
          setData(undefined);
          setSignin(response.status === 401 ? (result.signin ?? "") : "");
          throw new Error(result.error ?? "Archivio non disponibile.");
        }
        setData(result);
        setError("");
        setSignin("");
        setLast(Date.now());
      } catch (e) {
        if (signal?.aborted) return;
        setError(
          e instanceof Error ? e.message : "Connessione non disponibile.",
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, status],
  );
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void load(controller.signal);
    const interval = setInterval(() => void load(controller.signal), 20_000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [load]);
  const records = data?.records ?? [];
  const distribution = new Map<string, number>();
  records.forEach((r) =>
    r.active.forEach((id) =>
      distribution.set(id, (distribution.get(id) ?? 0) + 1),
    ),
  );
  const exportCsv = () => {
    const escape = (v: unknown) =>
      `"${String(v)
        .replace(/^([=+@-])/, "\u0027$1")
        .replaceAll('"', '""')}"`;
    const rows = [
      [
        "id",
        "inizio",
        "durata_secondi",
        "stato",
        "modalita",
        "guidata",
        "interventi",
        "frase_finale",
      ],
      ...records.map((r) => [
        r.id,
        new Date(r.startedAt).toISOString(),
        r.elapsedSeconds,
        labels[r.status],
        r.mode,
        r.guided ? "si" : "no",
        r.active.map((id) => optionById.get(id)?.label ?? id).join(" | "),
        r.message,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((row) => row.map(escape).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "neo-esperienze-pagina.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="control-room">
      <header className="cr-header">
        <a href="/" className="cr-brand">
          N<span>NEO / CONTROL ROOM</span>
        </a>
        <a href="/">Apri esperienza ↗</a>
      </header>
      <main className="cr-main">
        <div className="cr-heading">
          <div>
            <p className="cr-eyebrow">FUTURE OBSERVATORY · OPERATORE</p>
            <h1>
              Le esperienze,
              <br />
              <em>in un solo luogo.</em>
            </h1>
            <p>
              Durata, scelte e idee da portare nella realtà. Solo visite con
              consenso alla registrazione.
            </p>
          </div>
          <div className="cr-refresh">
            <span className="cr-dot" /> Aggiornamento ogni 20 secondi
            {last > 0 && <small>Ultima lettura {date(last)}</small>}
          </div>
        </div>
        {error && (
          <section role="alert" className="cr-access">
            <h2>{signin ? "Accesso riservato" : "Archivio non disponibile"}</h2>
            <p>{error}</p>
            {signin && (
              <a href={signin} target="_top" className="cr-primary">
                Accedi con ChatGPT
              </a>
            )}
            <button onClick={() => void load()}>Riprova</button>
          </section>
        )}
        {data && (
          <>
            <section className="cr-metrics" aria-label="Indicatori esperienze">
              <article>
                <span>Visite nel filtro</span>
                <strong>{data.total}</strong>
              </article>
              <article>
                <span>Completate in questa pagina</span>
                <strong>
                  {records.filter((r) => r.status === "completed").length}
                </strong>
              </article>
              <article>
                <span>Durata media della pagina</span>
                <strong>
                  {duration(
                    Math.round(
                      records.reduce((n, r) => n + r.elapsedSeconds, 0) /
                        Math.max(1, records.length),
                    ),
                  )}
                </strong>
              </article>
              <article>
                <span>Interventi osservati</span>
                <strong>{distribution.size}</strong>
              </article>
            </section>
            <section className="cr-panel">
              <div className="cr-toolbar">
                <div>
                  <h2>Registro delle visite</h2>
                  <p>
                    Dati anonimi · conservazione 30 giorni salvo configurazione
                    del server
                  </p>
                </div>
                <div>
                  <label>
                    Stato{" "}
                    <select
                      aria-label="Filtra per stato"
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value);
                        setPage(0);
                        setSelected(undefined);
                      }}
                    >
                      <option value="">Tutte</option>
                      <option value="active">In corso</option>
                      <option value="completed">Completate</option>
                      <option value="interrupted">Interrotte</option>
                    </select>
                  </label>
                  <button onClick={() => void load()}>Aggiorna</button>
                  <button disabled={!records.length} onClick={exportCsv}>
                    Esporta questa pagina CSV
                  </button>
                </div>
              </div>
              {!records.length ? (
                <div className="cr-empty">
                  <h3>Il prossimo futuro comincia qui.</h3>
                  <p>
                    Nessuna esperienza nel filtro. Sul visore, seleziona il
                    consenso prima di avviare una visita; i dati compariranno
                    dopo la conferma del backend.
                  </p>
                </div>
              ) : (
                <div className="cr-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Visita</th>
                        <th>Inizio</th>
                        <th>Durata</th>
                        <th>Stato</th>
                        <th>Scelte</th>
                        <th>Frase finale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <button
                              className="cr-session"
                              onClick={() => setSelected(r)}
                              aria-label={`Dettagli visita ${r.id.slice(0, 8)}`}
                            >
                              #{r.id.slice(0, 8)} ↗
                            </button>
                            <small>
                              {r.guided ? "Guidata" : "Libera"} ·{" "}
                              {r.mode === "browser"
                                ? "Browser"
                                : r.mode === "immersive-ar"
                                  ? "MR"
                                  : "VR"}
                            </small>
                          </td>
                          <td>{date(r.startedAt)}</td>
                          <td>{duration(r.elapsedSeconds)}</td>
                          <td>
                            <span className={`cr-badge ${r.status}`}>
                              {labels[r.status]}
                            </span>
                          </td>
                          <td>{r.active.length}</td>
                          <td className="cr-quote">
                            {r.message || "In attesa della conclusione"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="cr-pagination">
                <span>
                  Pagina {page + 1} · {data.total} visite
                </span>
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Precedente
                </button>
                <button
                  disabled={(page + 1) * 20 >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Successiva
                </button>
              </div>
            </section>
            {selected && (
              <section
                className="cr-panel cr-detail"
                aria-label="Dettagli esperienza"
              >
                <div className="cr-toolbar">
                  <h2>Visita #{selected.id.slice(0, 8)}</h2>
                  <button onClick={() => setSelected(undefined)}>
                    Chiudi dettagli
                  </button>
                </div>
                <blockquote>
                  {selected.message ||
                    "Questa visita non ha ancora una frase finale."}
                </blockquote>
                <p>
                  Ultimo aggiornamento: {date(selected.updatedAt)} · Fine:{" "}
                  {selected.reason === "deadline"
                    ? "tempo della visita"
                    : selected.reason === "choices"
                      ? "scelte esplorate"
                      : selected.reason === "exit"
                        ? "uscita anticipata"
                        : "richiesta / percorso"}{" "}
                  · Scadenza: {date(selected.expiresAt)}
                </p>
                <div className="cr-tags">
                  {selected.active.map((id) => (
                    <span key={id}>{optionById.get(id)?.label ?? id}</span>
                  ))}
                </div>
                <p className="cr-muted">
                  Lo stato “in corso” indica l’ultimo aggiornamento ricevuto,
                  non la presenza in tempo reale del partecipante. Non vengono
                  registrati nome, email, audio o trascrizioni.
                </p>
              </section>
            )}
          </>
        )}
        {loading && !data && !error && (
          <p role="status">Caricamento archivio…</p>
        )}
        <footer className="cr-footer">
          Accesso riservato agli operatori autorizzati. Le visite sul visore
          rimangono pubbliche.
        </footer>
      </main>
    </div>
  );
}
