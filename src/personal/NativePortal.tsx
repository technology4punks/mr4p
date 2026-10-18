"use client";
import "./nativePortal.css";
export function NativePortal() {
  const repo="https://github.com/technology4punks/mr4p/tree/codex/my-personal-neo/ios";
  return <main className="pn-root">
    <header><a className="pn-brand" href="/">N<span>NEO / PERSONAL</span></a><a href="/">Torna a Robot Buddy ↗</a></header>
    <section className="pn-hero"><div>
      <p className="pn-eyebrow">APP NATIVA IPHONE · AVATAR UMANI</p>
      <h1>Il mondo reale.<br/>In buona<br/><em>compagnia.</em></h1>
      <p className="pn-lead">Un compagno umanoide che unisce ciò che vede a ciò che lo spazio misura. Parla con NEO, esplora gli oggetti, scopri come funzionano.</p>
      <div className="pn-actions"><a className="pn-primary" href={repo}>Apri il progetto iPhone ↗</a><a href="https://github.com/technology4punks/mr4p/blob/codex/my-personal-neo/ios/README.md">Come provarlo sul tuo iPhone →</a></div>
      <p className="pn-note">Installazione da Xcode con il tuo account Apple Developer. Non è ancora una distribuzione App Store o TestFlight.</p>
    </div><figure><img src="/models/personal-neo/NeoSofia.jpg" alt="Sofia, uno dei tre avatar umani realistici di My Personal Neo"/><figcaption><span>3 avatar · 80 articolazioni</span><span>ARKit + LiDAR + LLM</span></figcaption></figure></section>
    <p className="pn-note" style={{maxWidth:1100,margin:"0 auto 32px",padding:"0 24px"}}>Camera e avatar, senza HUD. Conversazione full duplex, controlli nascosti e movimento prudente sulla geometria rilevata.</p>
    <section className="pn-grid" aria-label="Come comprende l’ambiente">
      <article><span>01 / MISURA</span><h2>Uno spazio vero.</h2><p>Tracking e superfici con ARKit. Sugli iPhone con LiDAR, profondità, mesh e occlusione degli oggetti reali.</p></article>
      <article><span>02 / COMPRENDE</span><h2>Oltre la forma.</h2><p>Su richiesta, NEO osserva un fotogramma, riconosce oggetti e collega il risultato alle misure. Le istruzioni web hanno fonti consultabili.</p></article>
      <article><span>03 / INTERAGISCE</span><h2>Un gesto, nello spazio.</h2><p>Cammina sul pavimento misurato, indica un oggetto, si siede su una superficie calibrata o illustra una melodia sulla tastiera reale. Il pianoforte è il primo esempio, non l’unico obiettivo.</p></article>
    </section>
    <section className="pn-test"><p className="pn-eyebrow">IL PRIMO TEST</p><h2>Portalo nella tua stanza.</h2><ol><li>Apri <code>ios/MyPersonalNeo.xcodeproj</code> su Mac con Xcode e seleziona il tuo team.</li><li>Collega l’iPhone, abilita Developer Mode e avvia la build sul dispositivo.</li><li>Scegli Sofia, Luca o Elena e avvia l’esperienza: NEO appare sul pavimento rilevato e ascolta anche mentre parla. Doppio tocco a due dita per i controlli.</li></ol><p>Il riconoscimento non è una misura precisa: i contatti, come dita su tasti, richiedono calibrazione. L’avatar non aziona oggetti fisici; la musica iniziale è sintetizzata nell’app. Tracking, allineamento e voce vanno verificati su iPhone reale.</p></section>
    <footer><p>Fotocamera e microfono solo dopo attivazione. Un fotogramma viene inviato a OpenAI quando chiedi di osservare; nessuna chiave API nell’app.</p><p>Tre avatar umani <a href="https://github.com/microsoft/Microsoft-Rocketbox">Microsoft Rocketbox</a> · <a href="https://github.com/microsoft/Microsoft-Rocketbox/blob/master/LICENSE.md">MIT</a>. Texture ottimizzate, rig USD Skel; animazioni e IK locali.</p></footer>
  </main>;
}
