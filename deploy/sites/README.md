# Overlay Sites V4

Questo overlay è destinato al checkout **già esistente** del Site NEO, aperto tramite il workflow Sites. Non crea un nuovo Site e non contiene chiavi. Da repository principale:

```sh
node scripts/sync-sites.mjs /path/to/site-source
cd /path/to/site-source
npm ci
npm run typecheck
npm test
npm run build
```

Il checkout Sites conserva i file bootstrap standard (`build/sites-vite-plugin.ts`, script runtime, App Router, route Realtime) già installati. L’overlay aggiunge D1/Drizzle, le route anonime e il worker con purge. Lo script copia frontend, catalogo, prompt e test condivisi senza duplicarli nel repository GitHub; preserva il project ID e abilita il binding `DB` nel manifest ufficiale.

Le migration generate in `drizzle/` vengono incluse dalla build standard in `dist/.openai/drizzle` e applicate dall’hosting. Non modificare migration già pubblicate. Per il test locale, eseguire una sola volta la migration sul binding locale di Wrangler, poi avviare il worker con `npm start`. Il placeholder UUID nella config Vite è quello del template Sites per lo sviluppo; l’hosting configura il database effettivo.

Per pubblicare: commit/push sul repository sorgente ufficiale, salvare l’archivio dell’esatta build con `.openai/hosting.json` e `dist`, quindi distribuire quella versione con l’ambiente runtime esistente. L’overlay non include `.env`, database locali o cache `.wrangler`.
