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
        <span className="header-note">Una presenza. Una conversazione.</span>
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
            <span className="dot" /> MIXED REALITY COMPANION
          </p>
          <h1>
            Incontra NEO.
            <br />
            <span>Parliamone.</span>
          </h1>
          <p className="description">
            Un avatar 3D con cui conversare in italiano. Nella tua stanza sui
            dispositivi WebXR compatibili, in una scena orbitabile su ogni altro
            browser.
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
          {caps && !caps.topLevel && (
            <p className="error">
              Apri l’URL direttamente in una nuova scheda per usare MR e
              microfono.
            </p>
          )}
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
            <p className="privacy">
              NEO ascolta la tua voce, non vede la stanza. L’audio viene inviato
              a OpenAI durante la conversazione.
            </p>
          </section>
        </section>
        <section className="stage" aria-label="Anteprima avatar">
          <div className="stage-top">
            <span className="stage-label">
              {active ? "REALTÀ MISTA" : "ANTEPRIMA 3D"}
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
      {active && (
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
