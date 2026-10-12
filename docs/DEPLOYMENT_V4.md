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
