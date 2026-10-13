import { useEffect, useRef, useState } from "react";
import { Experience, type ExperienceSnapshot } from "./Experience";
import { detectCapabilities, type Capabilities } from "./xr/capabilities";
import { levers, optionsFor, interventions } from "./decision/catalog";
import { ControlRoom } from "./admin/ControlRoom";
import { voicePresentation } from "./audio/voicePresentation";
export default function App() {
  return location.pathname.startsWith("/control-room") ? (
    <ControlRoom />
  ) : (
    <ExperienceApp />
  );
}
function ExperienceApp() {
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<Experience | null>(null);
  const [caps, setCaps] = useState<Capabilities>(),
    [snapshot, setSnapshot] = useState<ExperienceSnapshot>(),
    [failure, setFailure] = useState(""),
    [debug, setDebug] = useState(false),
    [guided, setGuided] = useState(true),
    [recordingConsent, setRecordingConsent] = useState(false),
    [menu, setMenu] = useState(false),
    [reflection, setReflection] = useState(""),
    [revisionSlot, setRevisionSlot] = useState(""),
    [deleteStatus, setDeleteStatus] = useState("");
  useEffect(() => {
    let alive = true;
    void detectCapabilities().then((c) => {
      if (alive) setCaps(c);
    });
    try {
      engine.current = new Experience(
        host.current!,
        (s) => {
          if (alive) setSnapshot(s);
        },
        () => {},
      );
    } catch {
      setFailure("Grafica 3D non disponibile. Prova un browser aggiornato.");
    }
    return () => {
      alive = false;
      engine.current?.dispose();
    };
  }, []);
  const s = snapshot?.story,
    voice = snapshot?.voice,
    info = voicePresentation(voice),
    voiceOn = voice?.status === "connected" || voice?.status === "connecting";
  const tool = (name: string, args: Record<string, unknown> = {}) =>
    engine.current?.applyTool(name, args);
  const active = s?.decisions.active ?? [];
  const finished =
    s?.state === "EXPERIENCE_COMPLETED" || s?.state === "USER_EXIT";
  const choices =
    s &&
    [
      "WAITING_FOR_LEVER",
      "WAITING_FOR_CHOICE",
      "PRESENTING_OPTIONS",
      "DECISION_RECAP",
      "SHOWING_CRITICAL_FUTURE",
      "APPLYING_INTERVENTION",
      "REVEALING_CONSEQUENCES",
      "OPTIONAL_FIFTH_DECISION",
      "FINAL_CITY_REFLECTION",
    ].includes(s.state);
  const start = () => {
    setReflection("");
    setRevisionSlot("");
    setDeleteStatus("");
    void engine.current?.startExperience(!!caps?.ar, guided, recordingConsent);
  };
  return (
    <div className="app v4-app">
      <header>
        <a className="brand" href="/" aria-label="NEO home">
          <span className="brand-mark">N</span> NEO
        </a>
        <span className="header-note">THE COMPLEXITY OF CHOICE</span>
        <a className="text-button" href="/control-room">
          Control room
        </a>
        <button
          className="text-button"
          onClick={() => {
            setDebug(!debug);
            engine.current?.setDebug(!debug);
          }}
          aria-pressed={debug}
        >
          Developer {debug ? "−" : "+"}
        </button>
      </header>
      <main>
        <section className="intro">
          <p className="eyebrow">
            <span className="dot" /> FUTURE OBSERVATORY · V4
          </p>
          <h1>
            Il futuro
            <br />
            <span>non è scritto.</span>
          </h1>
          <p className="description">
            Ma ogni scelta ha delle conseguenze. Incontra NEO e trasforma una
            città del 2050, scoprendo come acqua, energia, verde e mobilità
            dipendono gli uni dagli altri.
          </p>
          {(s?.state === "WAITING_FOR_START" || finished) && (
            <>
              <button
                className="primary voice-start"
                onClick={start}
                disabled={!!failure || !snapshot}
              >
                {finished ? "Ricomincia" : "INIZIA ESPERIENZA"}
              </button>
              <label className="visit-setting">
                <input
                  type="checkbox"
                  checked={guided}
                  onChange={(e) => setGuided(e.target.checked)}
                />{" "}
                Visita guidata · 3–4 minuti
              </label>
              <label className="visit-setting">
                <input
                  type="checkbox"
                  checked={recordingConsent}
                  onChange={(e) => setRecordingConsent(e.target.checked)}
                />{" "}
                Acconsento alla registrazione anonima dell’esperienza: durata,
                scelte e frase finale. Nessun nome, audio o trascrizione.
              </label>
              <p className="hint">
                {caps?.ar
                  ? "Realtà mista disponibile. Consenti spazio e microfono dopo l’avvio."
                  : "Esperienza 3D con mouse o touch e conversazione vocale."}{" "}
                Puoi completare la visita da fermo. Rispetta i confini reali del
                visore.
              </p>
            </>
          )}
          {s && s.state !== "WAITING_FOR_START" && !finished && (
            <section className="story-panel" aria-label="Future Observatory">
              <div className="panel-heading">
                <h2>
                  {s.state === "INVITATION"
                    ? "Un invito al 2050"
                    : s.state === "FINAL_CITY_REFLECTION"
                      ? "Il futuro che hai costruito"
                      : s.environment === "observatory"
                        ? "La tua città del 2050"
                        : "L’incontro"}
                </h2>
                <span className="year-tag">2050</span>
              </div>
              <p className="story-message" role="status">
                {s.message}
              </p>
              {s.state === "INVITATION" && (
                <button
                  className="primary"
                  onClick={() => engine.current?.visit()}
                >
                  Entra nell’osservatorio
                </button>
              )}
              {s.state === "SHOWING_CRITICAL_FUTURE" && (
                <button
                  className="primary"
                  onClick={() => tool("continue_decisions")}
                >
                  Da dove cominciamo?
                </button>
              )}
              {choices && (
                <>
                  <p className="story-note">
                    Parla liberamente: NEO mostra gli interventi di cui parli.
                    Puoi usare anche questi comandi, senza un ordine
                    obbligatorio.
                  </p>
                  <div className="lever-grid" aria-label="Ambiti di intervento">
                    {levers.map((l) => (
                      <button
                        key={l.id}
                        aria-pressed={s.lever === l.id}
                        onClick={() => tool("select_lever", { leverId: l.id })}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                  {s.lever && (
                    <div
                      className="option-list"
                      aria-label="Tre interventi disponibili"
                    >
                      {optionsFor(s.lever).map((o) => (
                        <button
                          key={o.id}
                          disabled={
                            s.decisions.city.active.includes(o.id) ||
                            s.pendingInterventions.includes(o.id)
                          }
                          onClick={() => engine.current?.choose(o.id)}
                        >
                          <strong>{o.label}</strong>
                          <span>{o.description}</span>
                          <small>Da considerare: {o.tradeoffs[0]}</small>
                        </button>
                      ))}
                    </div>
                  )}
                  {s.proposal && (
                    <button
                      className="primary"
                      onClick={() =>
                        tool("confirm_intervention", {
                          optionId: s.proposal,
                          consent: true,
                        })
                      }
                    >
                      Conferma{" "}
                      {interventions.find((o) => o.id === s.proposal)?.label}
                    </button>
                  )}
                </>
              )}
              {s.state === "APPLYING_INTERVENTION" && (
                <p className="story-note">
                  Guarda il settore indicato da NEO. Puoi continuare a
                  conversare.
                </p>
              )}
              {s.state === "REVEALING_CONSEQUENCES" && (
                <button onClick={() => tool("continue_decisions")}>
                  {active.length === 5 || s.decisions.revision
                    ? "Osserva la città finale"
                    : "Continua"}
                </button>
              )}
              {s.state === "OPTIONAL_FIFTH_DECISION" && (
                <div className="story-actions">
                  <button onClick={() => tool("continue_decisions")}>
                    Un ultimo intervento
                  </button>
                  <button onClick={() => tool("finish_decisions")}>
                    Concludi con quattro
                  </button>
                </div>
              )}
              {s.state === "FINAL_CITY_REFLECTION" && (
                <>
                  <p className="story-note">
                    {s.decisions.city.benefits.slice(0, 3).join(" ")}{" "}
                    {s.decisions.city.residuals[0]}
                  </p>
                  <div className="story-actions">
                    {!s.decisions.revision && (
                      <button onClick={() => tool("request_revision")}>
                        Ripensa una decisione
                      </button>
                    )}
                    <button onClick={() => tool("complete_reflection")}>
                      Torna al presente
                    </button>
                  </div>
                </>
              )}
              {s.state === "OPTIONAL_REVISION" && (
                <>
                  <label>
                    Decisione da sostituire
                    <select
                      aria-label="Decisione da sostituire"
                      value={revisionSlot}
                      onChange={(e) => setRevisionSlot(e.target.value)}
                    >
                      <option value="">Scegli una decisione</option>
                      {active.map((d) => (
                        <option key={d.slotId} value={d.slotId}>
                          {
                            interventions.find((o) => o.id === d.optionId)
                              ?.label
                          }
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="option-list">
                    {interventions.map((o) => (
                      <button
                        key={o.id}
                        disabled={
                          !revisionSlot ||
                          active.some((d) => d.optionId === o.id)
                        }
                        onClick={() =>
                          tool("revise_intervention", {
                            slotId: revisionSlot,
                            newOptionId: o.id,
                            consent: true,
                          })
                        }
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => tool("complete_reflection")}>
                    Mantieni le decisioni e torna
                  </button>
                </>
              )}
              {s.environment === "observatory" &&
                s.state !== "RETURNING_TO_MR" && (
                  <button
                    className="text-button"
                    onClick={() => engine.current?.returnToReality()}
                  >
                    Ritorna alla realtà
                  </button>
                )}
              <div className="story-actions">
                {s.state !== "SAVING_MESSAGE" && (
                  <button
                    className="text-button"
                    onClick={() => engine.current?.pauseResume()}
                  >
                    {s.state === "PAUSED"
                      ? "Riprendi esperienza"
                      : "Metti in pausa"}
                  </button>
                )}
                <button
                  className="text-button"
                  onClick={() => engine.current?.exitExperience()}
                >
                  Termina esperienza
                </button>
              </div>
              {s.state === "ASKING_FINAL_QUESTION" && (
                <>
                  <label htmlFor="reflection">Messaggio al futuro</label>
                  <textarea
                    id="reflection"
                    maxLength={2000}
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="Una riflessione personale, senza nome o contatti"
                  />
                  <button
                    disabled={!reflection.trim()}
                    onClick={() =>
                      tool("submit_reflection", {
                        text: reflection,
                        message:
                          "Hai scelto " +
                          active
                            .map(
                              (d) =>
                                interventions.find((o) => o.id === d.optionId)
                                  ?.label,
                            )
                            .join(", ") +
                          ". La tua riflessione: " +
                          reflection.slice(0, 500),
                      })
                    }
                  >
                    Condividi la riflessione
                  </button>
                </>
              )}
              {s.state === "WAITING_FOR_CONSENT" && (
                <>
                  <p>{s.generatedMessage}</p>
                  <p className="privacy">
                    Salviamo soltanto il messaggio, le decisioni e la revisione,
                    con un identificativo anonimo. Nessun nome, email, audio o
                    dialogo completo. Conservazione predefinita: 30 giorni. Puoi
                    cancellare i dati con il controllo in questa pagina.
                  </p>
                  <button
                    className="primary"
                    onClick={() =>
                      tool("set_storage_consent", { consent: true })
                    }
                  >
                    Acconsento al salvataggio
                  </button>
                  <button
                    onClick={() =>
                      tool("set_storage_consent", { consent: false })
                    }
                  >
                    Continua senza salvare
                  </button>
                  {!s.guided && (
                    <button onClick={() => engine.current?.editReflection()}>
                      Modifica riflessione
                    </button>
                  )}
                  {s.error && <p className="error">{s.error}</p>}
                </>
              )}
              {snapshot?.recordingStatus && (
                <p className="privacy" role="status">
                  {snapshot.recordingStatus}
                </p>
              )}
              {(s.saved || snapshot?.hasSavedData) && (
                <>
                  <button onClick={() => engine.current?.downloadReceipt()}>
                    Scarica ricevuta privata
                  </button>
                  <button
                    onClick={() =>
                      void engine.current
                        ?.deleteSaved()
                        .then((ok) =>
                          setDeleteStatus(
                            ok
                              ? "Dati cancellati."
                              : "Cancellazione non riuscita.",
                          ),
                        )
                    }
                  >
                    Cancella i dati salvati
                  </button>
                  <p role="status">{deleteStatus}</p>
                </>
              )}
            </section>
          )}
          {finished && (
            <section className="story-panel">
              <h2>Grazie per aver esplorato</h2>
              <p className="story-message">
                Il futuro dipende anche dalla nostra capacità di comprenderne le
                conseguenze.
              </p>
              {s?.saved && (
                <>
                  <button onClick={() => engine.current?.downloadReceipt()}>
                    Scarica ricevuta privata
                  </button>
                  <button
                    onClick={() =>
                      void engine.current
                        ?.deleteSaved()
                        .then((ok) =>
                          setDeleteStatus(
                            ok
                              ? "Dati cancellati."
                              : "Cancellazione non riuscita.",
                          ),
                        )
                    }
                  >
                    Cancella i dati salvati
                  </button>
                </>
              )}
              <p role="status">{deleteStatus}</p>
            </section>
          )}
          {s && s.state !== "WAITING_FOR_START" && !finished && (
            <section className="voice-panel" aria-label="Conversazione">
              <div
                className={`voice-status voice-${info.activity}`}
                role="status"
              >
                <strong>{info.label}</strong>
                <p>{info.detail}</p>
                <div
                  className="voice-meter"
                  role="meter"
                  aria-label="Attività microfono"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(
                    Math.min(1, (snapshot?.input ?? 0) * 8) * 100,
                  )}
                >
                  <span
                    style={{
                      width: `${Math.min(100, (snapshot?.input ?? 0) * 800)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="story-actions">
                <button onClick={() => engine.current?.action("voice")}>
                  {voiceOn ? "Termina conversazione" : "Avvia voce"}
                </button>
                {voiceOn && (
                  <>
                    <button onClick={() => engine.current?.action("talk")}>
                      {info.activity === "speaking" ||
                      info.activity === "processing"
                        ? "Interrompi NEO"
                        : "Riprendi ascolto"}
                    </button>
                    <button onClick={() => engine.current?.action("mute")}>
                      {voice?.muted
                        ? "Riattiva microfono"
                        : "Disattiva microfono"}
                    </button>
                    <button
                      onClick={() => engine.current?.action("voice-mode")}
                    >
                      Interruzioni{" "}
                      {voice?.interruptions ? "intelligenti" : "protette"}
                    </button>
                  </>
                )}
                {voice?.playbackBlocked && (
                  <button onClick={() => engine.current?.action("unlock")}>
                    Riattiva audio
                  </button>
                )}
              </div>
              <p className="voice-message">{voice?.message}</p>
              {voice?.lastHeard && (
                <p className="story-note" aria-label="Ultime parole ricevute">
                  Hai detto: “{voice.lastHeard}”
                </p>
              )}
              {s?.name && (
                <p className="story-note" aria-label="Nome ricordato">
                  Ciao, {s.name}.
                </p>
              )}
            </section>
          )}
        </section>
        <section className="stage" aria-label="Anteprima avatar">
          <div className="stage-top">
            <span className="stage-label">
              {s?.environment === "observatory"
                ? "OSSERVATORIO · 2050"
                : "NEO · MIXED REALITY"}
            </span>
          </div>
          <div className="canvas-host" ref={host} />
          <div className="stage-bottom">
            <p>{snapshot?.message}</p>
            <span className="asset-label">ROBOTEXPRESSIVE · CC0</span>
          </div>
          <details
            className="stage-menu"
            open={menu}
            onToggle={(event) => setMenu(event.currentTarget.open)}
          >
            <summary aria-label="Apri menu">Menu</summary>
            <div className="emotes">
              <button onClick={() => engine.current?.action("talk")}>
                Riprendi ascolto
              </button>
              <button onClick={() => engine.current?.returnToReality()}>
                Torna alla realtà
              </button>
              <button onClick={() => engine.current?.toggleAmbience()}>
                Suoni ambiente
              </button>
              {caps?.ar && (
                <button onClick={() => void engine.current?.enter()}>
                  Entra in realtà mista
                </button>
              )}
              {caps?.vr && (
                <button onClick={() => void engine.current?.enterVR()}>
                  Entra in VR
                </button>
              )}
              <button onClick={() => engine.current?.pauseResume()}>
                Pausa / riprendi
              </button>
            </div>
          </details>
          {failure && <p className="error render-error">{failure}</p>}
        </section>
      </main>
      {snapshot?.xr.active && debug && (
        <section className="placement">
          <button onClick={() => engine.current?.action("confirm")}>
            Conferma posizione
          </button>
          <button onClick={() => engine.current?.action("reposition")}>
            Riposiziona
          </button>
          <button onClick={() => engine.current?.action("lower")}>
            Quota −5 cm
          </button>
          <button onClick={() => engine.current?.action("raise")}>
            Quota +5 cm
          </button>
          <button onClick={() => engine.current?.action("calibrate")}>
            Quota corretta
          </button>
        </section>
      )}
      {debug && (
        <section className="debug" aria-label="Pannello developer">
          <h2>Developer · simulazione qualitativa</h2>
          <div className="story-actions">
            <button onClick={() => engine.current?.restart()}>
              Reset simulazione
            </button>
            <button onClick={() => void engine.current?.startExperience(false)}>
              Start 3D
            </button>
            <button onClick={() => engine.current?.debugEnter()}>
              Ingresso manuale
            </button>
            <button onClick={() => tool("continue_decisions")}>
              Prossima fase
            </button>
          </div>
          <dl>
            {Object.entries({
              Stato: s?.state,
              Decisioni: active.length,
              "Invio microfono": voice?.inputHealth,
              Peer: voice?.peer,
              FPS: snapshot?.fps.toFixed(1),
              "Draw call": snapshot?.drawCalls,
              Geometrie: snapshot?.geometries,
              Texture: snapshot?.textures,
              "Risorse interne": JSON.stringify(s?.decisions.city.resources),
              Interdipendenze: s?.decisions.city.flags.join(", "),
              Salvato: s?.saved,
            }).map(([key, val]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{String(val ?? "—")}</dd>
              </div>
            ))}
          </dl>
          <div className="option-list">
            {interventions.map((o) => (
              <button
                key={o.id}
                onClick={() => engine.current?.debugChoose(o.id)}
              >
                {o.id} · {o.label}
              </button>
            ))}
          </div>
        </section>
      )}
      <footer>
        <span>Quest Pro · Android · iPhone · Desktop</span>
        <span>Scenari ipotetici, senza punteggi morali.</span>
      </footer>
    </div>
  );
}
