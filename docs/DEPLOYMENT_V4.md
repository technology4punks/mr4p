# V4 · distribuzione verificata

12 ottobre 2026, Europe/Rome. Site pubblico: **https://neo-mr-avatar-test.sk1kko.chatgpt.site**.

- Sites **versione 17**, deploy `succeeded`.
- Progetto esistente: `appgprj_6aca1a908de48191beaed1a926d7909d`.
- Commit sorgente Sites: `aa0509650b77af27ddeea46ff19c80fc1d8780bb`.
- Codice GitHub V4: `11821db8220f44bb671e325acf8805bfeab21e7d`.
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

La suite browser completa ha passato 15 casi; dopo gli ultimi aggiustamenti al saluto/riavvio sono passati anche i sei casi pertinenti di regressione su tutti e tre i profili. I controlli GitHub Actions vengono attivati dalla branch/PR: il loro stato aggiornato è consultabile nella PR.

## Primo test sul Quest Pro

Apri il link nel Quest Browser, ricarica la pagina se avevi una versione precedente, premi **INIZIA ESPERIENZA** e autorizza microfono/spazio. Attendi il portale, accetta l’invito e prova quattro interventi, una revisione e ritorno alla realtà. La conversazione dovrebbe mantenere il canale mentre la città cambia; usa **Riprendi ascolto** se il dispositivo sospende la traccia. Controlla il menu world-locked con mani/controller.

Per la verifica completa e per il fallback AR/VR: [DEVICE_TESTS.md](DEVICE_TESTS.md). Non sono dichiarati verificati passthrough completo o 72 FPS sul Quest Pro.
