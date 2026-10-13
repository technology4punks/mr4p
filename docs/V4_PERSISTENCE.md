# Registro anonimo delle visite · control room

La checkbox iniziale è disattivata di default. Prima del consenso non viene inviato alcun record della visita. Con consenso si registrano anche visite parziali; il salvataggio finale esplicito registra una visita conclusa. Il nuovo registro non ricostruisce durate o stati delle esperienze storiche presenti in `future_sessions`.

`POST /api/experience-runs` accetta esclusivamente: ID casuale, capability privata di cancellazione, `consent:true`, revisione crescente, timestamp iniziale, durata in secondi, stato, stato finale/in corso/interrotto, modalità browser/AR/VR, flag guidata, fino a 30 ID interventi distinti del catalogo, frase finale breve e motivo di uscita. Campi aggiuntivi, identificatori, contatti, interventi sconosciuti e tempi invalidi sono rifiutati. Non contiene nome, email, audio o trascrizione. La frase guidata deriva da un template senza testo libero del partecipante.

Il client serializza gli aggiornamenti in background: non interrompono la voce. La UI conferma solo una risposta backend con ID corrispondente. Un errore può essere ritentato esplicitamente, ma non innesca un ciclo automatico. `pagehide` tenta un aggiornamento keepalive senza garantire la consegna quando browser o rete vengono chiusi.

`DELETE /api/experience-runs/:id` usa `Authorization: Bearer <deleteToken>` e origine autorizzata. Elimina i dati della visita e conserva fino alla scadenza soltanto un identificativo casuale, hash della capability e marcatori tecnici di revoca: un invio ritardato non può ricreare il record. Funziona anche prima del primo POST. Ricevuta privata scaricabile; token mai restituito alla control room. Nella modalità libera, il salvataggio educativo precedente è conservato e la cancellazione/ricevuta gestisce entrambi i registri.

`GET /api/control-room/experiences` è protetto: Sites richiede identità ed email iniettate dal proxy ChatGPT e allowlist `CONTROL_ROOM_ALLOWED_EMAILS`; 401 anonimo con link OAuth nativo, 403 account non autorizzato. Node richiede autenticazione reverse proxy con segreto, utente ed email verificati più allowlist, anche se l’esperienza pubblica non richiede login. Il proxy deve eliminare gli header identità del visitatore prima di impostarli. Nessuna password o OAuth personalizzato. Non mettere l’allowlist nel bundle client.

Lettura paginata (20, massimo 50), filtro per stato, no-store; risultati senza capability/hash. CSV e metriche sono della pagina corrente, totale relativo al filtro. “In corso” indica l’ultimo aggiornamento, non presenza live certificata.

Tabella `experience_runs`, SQL condiviso fra SQLite Node e D1 Sites. Migration additiva `0001_experience_runs.sql`: migration 0000 intatta, dati didattici preesistenti conservati. Stessa retention 1–365 giorni, default 30. Scadenza sulle operazioni e purge orario guidato dalle richieste sul worker; senza traffico la rimozione fisica attende una richiesta. Il percorso guidato torna alla realtà anche se il database fallisce.

---

# V4 · persistenza, consenso e API

Prima del consenso tutte le scelte e la riflessione sono in memoria. Il nome transitorio non viene inviato al database e viene rimosso dai testi se conosciuto. Email, numeri di contatto e campi extra sono rifiutati. La riflessione libera non deve contenere altri identificatori: il filtro non può certificare l’anonimato semantico di un testo arbitrario.

Il flusso aggiornato non richiede consenso per ingresso o trasformazioni. Il consenso riguarda solo questo salvataggio. Oltre le prime cinque scelte è possibile continuare l’esplorazione: gli interventi aggiuntivi (`explored`) e la coda sono mantenuti nella pagina e nella conversazione, ma non inclusi nel registro didattico inviato all’API. La città visualizzata considera anche tali interventi; le interdipendenze persistite descrivono soltanto il registro salvato.

## POST /api/future-sessions

JSON massimo 16 KB: `id` (UUID casuale), `deleteToken` (due UUID concatenati), `experienceVersion: "V4"`, `sequence`, `active`, `revision` oppure null, `reflection` (1–2000 caratteri), `message` (1–1000), `consent: true`.

Ogni decisione contiene `slotId` e `optionId`; la revisione contiene soltanto `slotId`, `previousOptionId` e `newOptionId`. Il backend ricostruisce scelte, limite, duplicati e revisione e confronta lo stato attivo. Non accetta risorse o interdipendenze calcolate dal client. Risposta di successo: `{id, expiresAt}`. La UI dichiara salvato soltanto dopo questa risposta. Un retry con lo stesso ID e token è idempotente.

## DELETE /api/future-sessions/:id

Header `Authorization: Bearer <deleteToken>` e origine autorizzata. Risposta `{deleted: true}`. Il token è un segreto di cancellazione del singolo record, non la chiave OpenAI. Il database conserva solo SHA-256 del token. La ricevuta privata scaricabile contiene ID, endpoint e token per una cancellazione futura; nessun testo della riflessione.

Non esiste un endpoint di lettura pubblico. Richieste cross-site sono respinte. Limite 30 operazioni/minuto per backend/isolate; su Sites è in memoria nell’isolate e non è un limite globale distribuito. Il token voce mantiene i limiti già esistenti. Errori di SQL o provider non espongono segreti.

## Schema

`future_sessions`: id, experience_version, decision_sequence, active_interventions, triggered_interdependencies, revised_decision, final_reflection, generated_future_message, consent_to_store, created_at, expires_at, deletion_hash. I JSON delle decisioni sono serializzati; flag e conseguenze sono ricostruiti dal server. Nessun nome, email, audio, transcript completo o punteggio.

Node usa SQLite persistente e purge ogni ora/avvio/operazione. Sites usa D1 e migration Drizzle `0000_outstanding_mulholland_black.sql`; migrazioni distribuite non vanno modificate. Purge sulle operazioni API e richiesta HTTP successiva a ogni ora. In assenza di traffico i record sono scaduti ma la rimozione fisica può essere posticipata fino alla richiesta successiva.

`RETENTION_DAYS`: 1–365, default 30, fallback 30 per valori non numerici. La UI dichiara il valore predefinito; se cambi la durata di produzione, aggiorna anche il testo informativo. Un errore backend lascia il partecipante nella schermata del consenso con retry o prosecuzione senza salvare.
