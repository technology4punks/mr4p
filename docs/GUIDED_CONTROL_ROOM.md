# Visita guidata e control room

La visita normale dura circa 3–4 minuti: saluto e nome facoltativo, annuncio del viaggio, futuro critico, poche scelte guidate dagli interessi espressi, ritorno alla realtà e frase da ricordare. La città ordinata della V4, avatar, scene, audio Realtime e trenta interventi rimangono gli stessi. Nessun nuovo asset 3D o post-processing.

Il controller puro `GuidedVisit` limita il tempo attivo a 210 secondi dall’invito. Quattro decisioni completate, oppure tre dopo due minuti, anticipano la fine; una pausa esplicita sospende il timer. Il timer non inventa scelte. Transizioni e chiusura aggiungono alcuni secondi; un turno vocale in corso può ritardare la chiusura del microfono. Disattivando “Visita guidata” prima dello Start si usa il percorso libero precedente.

Il menu XR è chiuso e privo dei tre vecchi comandi persistenti. Si richiama con A/X, stick o gesto mani. Nel browser c’è un piccolo menu a scomparsa. I controlli di riposizionamento restano disponibili quando necessari per il tracking.

## Accesso operatore

Apri https://neo-mr-avatar-test.sk1kko.chatgpt.site/control-room da PC e usa “Accedi con ChatGPT”. Il backend confronta l’email verificata con `CONTROL_ROOM_ALLOWED_EMAILS`, configurata solo nelle variabili runtime. Il visore continua a usare il sito pubblico senza login. Un account assente dall’allowlist riceve accesso negato; il client non contiene l’elenco degli operatori.

Per il backend Node usa un reverse proxy autenticato che rimuove gli header identità del visitatore e imposta `X-NEO-USER`, `X-NEO-EMAIL` e il segreto previsto; configura la stessa allowlist. In assenza di questo collegamento l’API nega la lettura. Non inventare header di autenticazione dal frontend.

## Raccolta dati

Prima dello Start, il partecipante può selezionare “Registra dati anonimi”; default disattivato. In alternativa può salvare esplicitamente alla fine. Nessun consenso per scene o risposte verbali generiche vale come consenso ai dati.

Il nuovo registro contiene ID casuale, inizio, durata, stato, modalità XR/browser, interventi osservati, frase conclusiva e motivo di uscita. Nessun nome, email, audio o trascrizione dei partecipanti. La registrazione è asincrona e non blocca voce o ritorno. Il timestamp “ultimo aggiornamento” non certifica presenza live; la chiusura improvvisa può perdere l’ultimo invio.

La control room offre filtro, paginazione, dettagli e CSV della pagina corrente. Le metriche sono etichettate per pagina; il totale conta il filtro. Retention predefinita 30 giorni e cancellazione con ricevuta privata. La nuova tabella non ricostruisce dati assenti dalle visite storiche. API, limiti e revoca: [V4_PERSISTENCE.md](V4_PERSISTENCE.md).

## Verifica

Test di prompt, timer, consenso, serializzazione, revoca e accesso backend; browser desktop, Android emulato e WebKit/iPhone con audio simulato. L’accesso dell’account operatore reale, l’ascolto su Quest e il comfort vanno verificati con dispositivo e sessione autenticata effettivi. Nessun nuovo benchmark hardware: la geometria urbana è invariata.
