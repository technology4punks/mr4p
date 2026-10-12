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
