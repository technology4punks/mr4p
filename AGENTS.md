# Istruzioni per Codex — NEO MR Avatar MVP

## Missione
Implementa l'MVP completo descritto in `SPEC.md`. Quest Pro è il device primario, Android e iPhone sono fallback secondo capabilities.

## Avvio immediato
1. Leggi tutto `SPEC.md` prima di cambiare codice.
2. Nel repository/branch corrente sviluppa una applicazione funzionante con frontend e backend.
3. Usa React, TypeScript, Vite, Three.js/WebXR, OpenAI Realtime tramite WebRTC, un backend Node sicuro.
4. Avatar RobotExpressive (Three.js) come placeholder con animazioni coerenti; fallback se asset unavailable.
5. Visualizzazione MR del passthrough Quest Pro, posizionamento manuale a livello pavimento e anchoring locale stabile, hit-test/anchors opzionali se supportati. Non promettere persistenza cross-session senza prova hardware.
6. Modalità WebXR AR su Android solo se supportata. Modalità 3D con conversazione vocale su iPhone o browser senza immersive-ar.
7. OpenAI API key sempre e solo server-side; token/session ephemeral al client. Non scrivere credenziali nel repo.
8. Configura hosting HTTPS con supporto WebSockets/WebRTC se necessario, documenta test reali su device.
9. Esegui test, build, typecheck e risolvi gli errori. Produci una pull request con checklist e limiti di piattaforma.

## Priorità
P0: render avatar 3D + pagina 3D non-XR + backend sessione OpenAI + audio.
P1: entering immersive-ar su Quest Pro + world-lock con local-floor + placement calibrabile.
P2: UX mobile + animazioni/listening/talking + supporto opzionale hit-test.
P3: spatial anchors persistent e floor detection, soltanto se supportati/verificati.

Non fermarti per domande non bloccanti: scegli la soluzione più pragmatica. Non fare affermazioni non verificate sui supporti WebXR o Sites.