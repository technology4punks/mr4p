import { useEffect, useRef, useState } from "react";
import { Experience, type ExperienceSnapshot } from "./Experience";
import { detectCapabilities, type Capabilities } from "./xr/capabilities";
import type { AvatarState } from "./avatar/animations";
const labels: Record<AvatarState, string> = {
  idle: "Pronto",
  greeting: "Ciao!",
  listening: "Ascolto",
  thinking: "Attendi…",
  speaking: "Rispondo",
  positive: "Ottimo!",
  negative: "No",
  error: "Errore voce",
};
export default function App() {
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<Experience | null>(null);
  const [caps, setCaps] = useState<Capabilities>();
  const [snapshot, setSnapshot] = useState<ExperienceSnapshot>();
  const [failure, setFailure] = useState("");
  const [debug, setDebug] = useState(false);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [height, setHeight] = useState(1.6);
  useEffect(() => {
    let alive = true;
    void detectCapabilities().then((value) => {
      if (alive) setCaps(value);
    });
    try {
      engine.current = new Experience(
        host.current!,
        (value) => {
          if (alive) setSnapshot(value);
        },
        (role, text) =>
          setTranscripts((current) => [
            ...current.slice(-19),
            `${role}: ${text.slice(0, 2000)}`,
          ]),
      );
    } catch {
      setFailure(
        "Grafica 3D non disponibile. Abilita WebGL o prova un browser aggiornato.",
      );
    }
    return () => {
      alive = false;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);
  const active = snapshot?.xr.active ?? false;
  const voiceOn =
    snapshot?.voice.status === "connected" ||
    snapshot?.voice.status === "connecting";
  const state = snapshot?.state ?? "idle";
  const story = snapshot?.story;
  const inObservatory = story?.environment === "observatory";
  const storyLabels: Record<string, string> = {
    INTRODUCTION: "L’incontro",
    DISCOVER_INTEREST: "Le tue scelte",
    INVITATION: "Un invito al 2050",
    ENTER_OBSERVATORY: "Verso il futuro",
    CRITICAL_FUTURE: "Futuro critico",
    REFLECTION: "Decisioni diverse",
    SUSTAINABLE_FUTURE: "Futuro sostenibile",
    RETURN_TO_REALITY: "Ritorno al presente",
    CONCLUSION: "Portalo nel presente",
  };
  const toggleDebug = () => {
    const next = !debug;
    setDebug(next);
    setTranscripts([]);
    engine.current?.setDebug(next);
  };
  return (
    <div className="app">
      <header>
        <a className="brand" href="/" aria-label="NEO home">
          <span className="brand-mark">N</span> NEO{" "}
          <span className="badge">LAB / MVP</span>
        </a>
        <span className="header-note">FUTURE OBSERVATORY · 2050</span>
        <button
          className="text-button"
          onClick={toggleDebug}
          aria-pressed={debug}
        >
          Diagnostica {debug ? "−" : "+"}
        </button>
      </header>
      <main>
        <section className="intro">
          <p className="eyebrow">
            <span className="dot" /> FUTURE OBSERVATORY
          </p>
          <h1>
            Il futuro ha
            <br />
            <span>una finestra.</span>
          </h1>
          <p className="description">
            Incontra NEO, raccontagli cosa ti interessa e visita una città del
            2050. Dalla stessa finestra, guarda come decisioni diverse possono
            cambiare il futuro.
          </p>
          <div className="capabilities">
            <span>
              {caps
                ? caps.ar
                  ? "◉ WebXR AR disponibile"
                  : "◉ Modalità 3D"
                : "Verifica browser…"}
            </span>
            <span>Voce · OpenAI Realtime</span>
          </div>
          <div className="mode-actions">
            {caps?.ar && (
              <button
                className="primary"
                disabled={!!failure || !snapshot || active}
                onClick={() => void engine.current?.enter()}
              >
                Entra in realtà mista ↗
              </button>
            )}
            <button
              className="secondary"
              disabled={!!failure}
              onClick={() => engine.current?.preview()}
            >
              Anteprima 3D ↻
            </button>
          </div>
          <p className="hint">
            {caps?.ar
              ? "MR richiede il permesso di tracciamento della stanza. Il microfono si attiva solo quando avvii la voce."
              : "Trascina per ruotare. Pizzica o usa la rotella per avvicinarti. Il microfono si attiva solo quando avvii la voce."}
          </p>
          {caps && !caps.secure && (
            <p className="error">
              Apri l’app su HTTPS per attivare microfono e WebXR.
            </p>
          )}
          {caps?.ar && (
            <p className="hint">
              Nel visore: A/X o presa apre e chiude il menu. Punta e premi il
              grilletto, oppure usa il joystick per scegliere. Con le mani:
              punta e fai pinch. Il pannello si chiude dopo il posizionamento.
            </p>
          )}
          {caps && !caps.topLevel && (
            <p className="error">
              Apri l’URL direttamente in una nuova scheda per usare MR e
              microfono.
            </p>
          )}
          <section className="story-panel" aria-label="Future Observatory">
            <div className="panel-heading">
              <h2>{storyLabels[story?.state ?? "INTRODUCTION"]}</h2>
              <span className="year-tag">2050</span>
            </div>
            <p className="story-message" role="status">
              {story?.message ?? "Un incontro, poi una finestra sul 2050."}
            </p>
            <div className="story-actions">
              {!inObservatory && (
                <button
                  className="primary"
                  disabled={!snapshot || !!failure || story?.transitioning}
                  onClick={() => engine.current?.visit()}
                >
                  Visita il 2050
                </button>
              )}
              {inObservatory && (
                <>
                  <button
                    className="primary"
                    disabled={
                      story?.transitioning || story?.future === "sustainable"
                    }
                    onClick={() => engine.current?.alternative()}
                  >
                    Mostra il futuro sostenibile
                  </button>
                  <button
                    className="secondary"
                    disabled={story?.state === "RETURN_TO_REALITY"}
                    onClick={() => engine.current?.returnToReality()}
                  >
                    Torna alla realtà
                  </button>
                </>
              )}
              <button
                className="secondary"
                disabled={!snapshot}
                onClick={() => engine.current?.toggleAmbience()}
              >
                Suoni ambiente on / off
              </button>
              {caps?.vr && !active && (
                <button
                  className="secondary"
                  disabled={!snapshot}
                  onClick={() => void engine.current?.enterVR()}
                >
                  Entra in VR
                </button>
              )}
              {caps?.vr && active && (
                <button
                  className="secondary"
                  onClick={() => void engine.current?.prepareVR()}
                >
                  Prepara sessione VR separata
                </button>
              )}
            </div>
            {story?.transitioning && (
              <progress
                aria-label={
                  story.state === "REFLECTION"
                    ? "Trasformazione del futuro"
                    : "Transizione della stanza"
                }
                max="1"
                value={
                  story.state === "REFLECTION"
                    ? snapshot?.transformation
                    : story.state === "RETURN_TO_REALITY"
                      ? 1 - (snapshot?.immersion ?? 1)
                      : snapshot?.immersion
                }
              />
            )}
            <p className="story-note">
              Scenario ambientale ipotetico, non una previsione scientifica.
              Visita da fermo; rispetta sempre i confini reali del visore.
            </p>
            {inObservatory && (
              <p className="story-note">
                I tre oggetti sul davanzale aprono riflessioni su energia, acqua
                e mobilità. Tocca o seleziona con il controller.
              </p>
            )}
          </section>
          <section className="voice-panel" aria-label="Conversazione">
            <div className="panel-heading">
              <h2>Conversazione</h2>
              <span className={`status-pill ${voiceOn ? "live" : ""}`}>
                {snapshot?.voice.status === "connecting"
                  ? "Connessione"
                  : voiceOn
                    ? "Attiva"
                    : "Spenta"}
              </span>
            </div>
            <p
              className={
                snapshot?.voice.status === "error" ? "error" : "voice-message"
              }
              role="status"
            >
              {snapshot?.voice.message ?? "Avvia quando sei pronto."}
            </p>
            <button
              className="primary voice-start"
              disabled={
                !!failure ||
                !snapshot ||
                (caps && (!caps.microphone || !caps.webRTC || !caps.secure))
              }
              onClick={() => engine.current?.action("voice")}
            >
              {voiceOn ? "■ Termina conversazione" : "◎ Parla con l’avatar"}
            </button>
            {voiceOn && (
              <button
                className="secondary"
                onClick={() => engine.current?.action("talk")}
              >
                Parla / interrompi NEO
              </button>
            )}
            {voiceOn && (
              <button
                className="secondary"
                onClick={() => engine.current?.action("mute")}
              >
                {snapshot?.voice.muted
                  ? "Riattiva microfono"
                  : "Disattiva microfono"}
              </button>
            )}
            {snapshot?.voice.playbackBlocked && (
              <button
                className="secondary"
                onClick={() => engine.current?.action("unlock")}
              >
                Riattiva audio
              </button>
            )}
            <button
              className="text-button"
              aria-pressed={snapshot?.voice.interruptions ?? false}
              disabled={!snapshot}
              onClick={() => engine.current?.action("voice-mode")}
            >
              Interruzioni vocali:{" "}
              {snapshot?.voice.interruptions ? "attive" : "disattivate"}
            </button>
            <p className="hint">
              {snapshot?.voice.interruptions
                ? "Puoi interrompere NEO parlando. Se l’ambiente è rumoroso, disattiva le interruzioni vocali."
                : "NEO finisce la risposta senza interruzioni da rumori. Per prendere la parola, premi Parla / interrompi."}
            </p>
            <p className="privacy">
              NEO ascolta la tua voce, non vede la stanza. L’audio viene inviato
              a OpenAI durante la conversazione.
            </p>
          </section>
        </section>
        <section className="stage" aria-label="Anteprima avatar">
          <div className="stage-top">
            <span className="stage-label">
              {inObservatory
                ? "FUTURE OBSERVATORY · 2050"
                : active
                  ? "REALTÀ MISTA"
                  : "ANTEPRIMA 3D"}
            </span>
            <span className="status-pill">
              <span className="dot" />
              {labels[state]}
            </span>
          </div>
          <div className="canvas-host" ref={host} />
          {failure && (
            <div className="render-error" role="alert">
              {failure}
              <button onClick={() => location.reload()}>Riprova</button>
            </div>
          )}
          <div className="stage-bottom">
            <p role="status">{snapshot?.message ?? "Preparazione scena…"}</p>
            <span className="asset-label">
              {snapshot?.asset === "loaded"
                ? "ROBOTEXPRESSIVE · CC0"
                : snapshot?.asset === "fallback"
                  ? "AVATAR DI RISERVA"
                  : "CARICAMENTO MODELLO"}
            </span>
          </div>
          <div className="emotes" aria-label="Reazioni avatar">
            <button
              onClick={() => engine.current?.emote("greeting")}
              disabled={!snapshot}
            >
              Saluta 👋
            </button>
            <button
              onClick={() => engine.current?.emote("positive")}
              disabled={!snapshot}
            >
              Approva 👍
            </button>
            <button
              onClick={() => engine.current?.emote("negative")}
              disabled={!snapshot}
            >
              Dissenti ↔
            </button>
          </div>
        </section>
      </main>
      {active && !inObservatory && (
        <section className="placement" aria-label="Posizionamento MR">
          <strong>
            {snapshot?.xr.placed
              ? "Posizione confermata"
              : "Posiziona i piedi sul pavimento"}
          </strong>
          <button
            onClick={() => engine.current?.action("confirm")}
            disabled={snapshot?.xr.placed}
          >
            Conferma
          </button>
          <button onClick={() => engine.current?.action("reposition")}>
            Riposiziona
          </button>
          <button onClick={() => engine.current?.action("lower")}>−5 cm</button>
          <button onClick={() => engine.current?.action("raise")}>+5 cm</button>
          <button onClick={() => engine.current?.action("calibrate")}>
            Quota corretta
          </button>
          <button onClick={() => engine.current?.action("reset")}>
            Reset posizione
          </button>
          <button onClick={() => engine.current?.action("exit")}>
            Esci da MR
          </button>
          <p>
            Nel visore usa il pannello 3D e il grilletto del controller. Su
            Android tocca il pannello o il pavimento.
          </p>
        </section>
      )}
      <footer>
        <span>Quest Pro · Android WebXR · iPhone 3D</span>
        <label>
          Statura avatar{" "}
          <select
            value={height}
            onChange={(event) => {
              const value = Number(event.target.value);
              setHeight(value);
              engine.current?.setHeight(value);
            }}
          >
            <option value="1.5">1,5 m</option>
            <option value="1.6">1,6 m</option>
            <option value="1.7">1,7 m</option>
          </select>
        </label>
        <span>Prove fisiche su dispositivi: da eseguire</span>
      </footer>
      {debug && (
        <section className="debug" aria-label="Diagnostica">
          <h2>Diagnostica</h2>
          <dl>
            {Object.entries({
              HTTPS: caps?.secure ? "sì" : "no",
              "WebXR AR": caps?.ar ? "supportato" : "non disponibile",
              Microfono: caps?.microphone
                ? snapshot?.voice.muted
                  ? "mutato"
                  : voiceOn
                    ? "attivo"
                    : "disponibile, spento"
                : "non disponibile",
              Asset: snapshot?.asset,
              Clip: snapshot?.clips.join(", "),
              Riferimento: snapshot?.xr.reference,
              Piani: snapshot?.xr.planes,
              Pavimento: snapshot?.xr.floor,
              "Quota piedi": `${snapshot?.xr.feetY.toFixed(2)} m`,
              Calibrato: snapshot?.xr.calibrated ? "sì" : "no",
              Anchors: snapshot?.xr.anchors,
              Anchor: snapshot?.xr.anchor,
              Persistenza: snapshot?.xr.persistent,
              Tracking: snapshot?.xr.tracking,
              "Hit test": snapshot?.xr.hitTest,
              Peer: snapshot?.voice.peer,
              "Livello microfono": snapshot?.input.toFixed(3),
              "Livello uscita": snapshot?.output.toFixed(3),
              FPS: snapshot?.fps,
              "Draw call": snapshot?.drawCalls,
              Triangoli: snapshot?.triangles,
              "Geometrie GPU": snapshot?.geometries,
              "Texture GPU": snapshot?.textures,
              "Qualità adattiva": snapshot?.quality,
              "Asset osservatorio": snapshot?.observatoryAssets,
              "Compositing XR": snapshot?.compositor,
              "Stato storia": story?.state,
              Tema: story?.theme ?? "da scoprire",
              Trasformazione: `${Math.round((snapshot?.transformation ?? 0) * 100)}%`,
            }).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{String(value ?? "attesa")}</dd>
              </div>
            ))}
          </dl>
          <p>
            Trascrizioni solo in questa vista, in memoria temporanea; nessun
            token nei log.
          </p>
          <div className="transcript">
            {transcripts.map((text, index) => (
              <p key={index}>{text}</p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
