# Turni bilanciati · Sites versione 21

Distribuita con successo il 12 ottobre 2026 alle 12:35 UTC sul Site pubblico **https://neo-mr-avatar-test.sk1kko.chatgpt.site**. Sorgente Sites `df2d22078427f25dd56204f31007052d8aa9d97e`; deploy `appgdep_6accd3f0eec0819193e89af3df1763e8`. Ambiente revision 5, segreto OpenAI e D1 preservati.

Il saluto chiede il nome e aspetta. Il prompt richiede una domanda per turno, poi ascolto; nome, silenzio e commenti dell’app non sostituiscono la risposta o l’interesse. Una richiesta su un intervento continua ad applicarlo senza conferma. I commenti non vengono più aggiunti come messaggi utente e non possono usare i tool narrativi. Niente nuovo monologo al termine di ogni trasformazione. La coda lascia priorità a speech/ASR e scarta i commenti arrivati mentre NEO risponde. Pausa VAD condivisa da 850 ms, con interruzioni riconoscibili e recupero del microfono conservati.

Verifiche locali: `npm run check` passato, 191 test Node/shared, 182 test Sites/shared/route, entrambe le build e tutti i 21 casi browser in una sola esecuzione. Sul Site distribuito, una visita anonima ha passato il test dei tre turni e del recupero: ingresso autonomo simulato del saluto respinto, successiva richiesta reale simulata accettata, nome e parole visibili, mute/recovery funzionanti. Audio e WebRTC di questa prova sono mock: non certificano il microfono o il comportamento linguistico sul Quest. Il backend reale ha emesso un token effimero con status 200, senza esporne il valore.

Ricaricare la pagina per chiudere la vecchia sessione Realtime e ottenere il prompt/configurazione aggiornati. Nel Quest: rispondere al nome, attendere la domanda sull’interesse, poi chiedere alberi o tram; provare una breve pausa dentro la frase e interrompere NEO con una parola. La taratura di silenzio, l’eco, l’ASR e il comfort rimangono da verificare fisicamente.

Dettagli: [VOICE_UX.md](VOICE_UX.md), [VALIDATION.md](VALIDATION.md), [DEVICE_TESTS.md](DEVICE_TESTS.md). [PR #3](https://github.com/technology4punks/mr4p/pull/3) sulla branch dedicata `codex/future-observatory-v4`.

---

# Dialogo libero · aggiornamento pubblico del 12 ottobre 2026

Versione Sites **20**, distribuzione `succeeded` alle 11:55 UTC. URL pubblico invariato: **https://neo-mr-avatar-test.sk1kko.chatgpt.site**. Sorgente Sites: `27614a9c034ff32489c08abd0697d7bd45ac3649`; deploy `appgdep_6acccaaaef808191b18b2cd39df0ae25`. Ambiente revision 5 preservato, chiave OpenAI solo backend e D1 invariato.

NEO può mostrare direttamente un intervento del catalogo senza leva preliminare o conferma. Le richieste nelle transizioni vengono ricordate. Nome, scelte e ulteriori interventi esplorati restano in memoria durante la sessione e vengono risincronizzati alla riconnessione della voce. La pagina mostra le ultime parole ricevute. Il percorso di quattro/cinque scelte è facoltativo per l’esplorazione; il consenso separato al salvataggio è conservato.

Il recupero voce usa l’audio già ricevuto quando manca/fallisce la trascrizione, senza duplicare la risposta. Una vera interruzione riconosciuta da un delta mantiene il turno anche se la trascrizione finale fallisce. Non si interrompe il robot sul solo rumore durante il suo parlato. Non sono modificati avatar, asset o geometria degli scenari.

Verifiche: lint/typecheck/build e bundle scan, **185 test Node/shared**, **176 test Sites/shared/D1**; tutti i 21 casi browser passati fra suite e ritest mirati. Audio/WebRTC sono simulati; riconoscimento, eco e dialogo su Quest Pro richiedono prova fisica. Lo smoke pubblico della versione 19 ha verificato ingresso, parco e tram richiesto durante la trasformazione, senza login o errori JavaScript; il backend voce ha restituito 200 e token effimero senza esporlo. La 20 aggiunge il recupero dell’interruzione con ASR finale fallito, verificato nei test. Anche lo smoke browser pubblico della versione 20 è passato: ingresso senza comando preliminare, parco e tram in coda, zero errori JavaScript.

Per il primo test, ricarica il Site nel Quest Browser, premi **INIZIA ESPERIENZA** e autorizza il microfono. Prova “Mi chiamo Luca”, poi “Come funzionerebbe un tram?” e “Mostrami degli alberi”, anche durante la trasformazione. Non occorre rispondere sì per cambiare la città. Controlla le parole ricevute e usa Riprendi ascolto se il dispositivo sospende la traccia. Il nome resta nella pagina, non nel database.

[PR #3 verso main](https://github.com/technology4punks/mr4p/pull/3) sulla branch `codex/future-observatory-v4`. Dettagli e limiti: [VOICE_UX.md](VOICE_UX.md), [VALIDATION.md](VALIDATION.md), [DEVICE_TESTS.md](DEVICE_TESTS.md).

---

## Distribuzione iniziale V4 e correzione del clock (versione 18)

# V4 · distribuzione verificata

12 ottobre 2026, Europe/Rome. Site pubblico: **https://neo-mr-avatar-test.sk1kko.chatgpt.site**.

- Sites **versione 18**, deploy `succeeded`.
- Progetto esistente: `appgprj_6aca1a908de48191beaed1a926d7909d`.
- Commit sorgente Sites: `cd678d979815f4f7fe7afe6832088b75b357614f`.
- Codice GitHub V4: `1b559d894c1a8996b084263efdcb4c09f119bf25`.
- Branch dedicata `codex/future-observatory-v4`; [PR #3 verso main](https://github.com/technology4punks/mr4p/pull/3), in bozza per verifica hardware. Le branch precedenti e PR #2 sono conservate.
- Ambiente runtime revision 5 preservato. Nessuna chiave è stata inserita nel client o nei file del repository.
- D1 `DB` e migration Drizzle distribuiti insieme alla versione. Asset e bundle provengono dall’esatta build del commit Sites.

## Controlli sul Site distribuito

Visita browser anonima, senza cookie/login: Start, portale, ingresso nell’osservatorio, selezione GREEN_PARK, trasformazione; zero errori console. La pagina usa il client 3D caricato dopo il shell iniziale, pertanto una semplice lettura del solo HTML non verifica la presenza dei controlli.

API pubblica verificata con dati tecnici fittizi e consenso esplicito:

| Richiesta | Esito |
|---|---|
| Pagina, senza redirect di autenticazione | 200 |
| `/api/health` | 200, configurazione voce presente |
| POST `/api/future-sessions` | 201, ID restituito corretto |
| DELETE con token errato | 403 |
| DELETE con token privato corretto | 200, record di test eliminato |
| POST `/api/realtime-token` | 200, token effimero emesso; valore non esposto |

Il test del token verifica configurazione/backend OpenAI, non acquisizione audio, conversazione live, eco o latenza sul visore. Queste prove restano nella checklist hardware.

Sono passati i 18 casi browser definiti, compresi quelli che fermano i frame del canvas. Un caso Android del percorso completo di riavvio ha esaurito il precedente budget complessivo di 30 secondi, con il pulsante finale già presente: il budget è ora 60 secondi e il caso è passato al ritest; i limiti delle singole transizioni restano verificati. I controlli GitHub Actions vengono attivati dalla branch/PR: il loro stato aggiornato è consultabile nella PR.

## Primo test sul Quest Pro

Apri il link nel Quest Browser, ricarica la pagina se avevi una versione precedente, premi **INIZIA ESPERIENZA** e autorizza microfono/spazio. Attendi il portale, accetta l’invito e prova quattro interventi, una revisione e ritorno alla realtà. La conversazione dovrebbe mantenere il canale mentre la città cambia; usa **Riprendi ascolto** se il dispositivo sospende la traccia. Controlla il menu world-locked con mani/controller.

Per la verifica completa e per il fallback AR/VR: [DEVICE_TESTS.md](DEVICE_TESTS.md). Non sono dichiarati verificati passthrough completo o 72 FPS sul Quest Pro.

## Correzione del clock e continuità D1

Una prima esecuzione CI aveva segnalato l’ingresso Android bloccato quando il canvas era fuori viewport e il browser sospendeva RAF. La versione 18 usa un clock narrativo separato dal rendering: lo stato avanza mentre il partecipante legge i controlli; la grafica riprende dal tempo monotono corretto. Il clock è rilasciato alla chiusura e non aggiunge movimento della camera. Tre nuove prove fermano intenzionalmente i frame e verificano ingresso e trasformazione di sette secondi.

In produzione un record tecnico creato sulla versione 17 è rimasto presente dopo il deploy della 18: token errato rifiutato con 403, token valido accettato con 200 e record eliminato. Anche lo smoke browser anonimo sulla versione 18 ha passato portale, ingresso e GREEN_PARK, senza errori di console.

Il secondo errore CI Android avveniva dopo un click già eseguito: Playwright restava in attesa di una navigazione, mentre il controllo aggiorna soltanto lo stato locale. Il test ora mantiene le verifiche di visibilità e interazione, evita quell’attesa (`noWaitAfter`) e controlla esplicitamente la comparsa delle leve. Il percorso Android completo è passato al ritest.
