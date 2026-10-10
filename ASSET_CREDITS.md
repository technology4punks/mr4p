# Asset credits

## RobotExpressive

- File: `public/models/RobotExpressive.glb` (copiato in `dist/models` dalla build).
- Autore: **Tomás Laulhé / Quaternius**.
- Modifiche: **Don McCurdy** (morph target, conversione FBX2GLTF, ottimizzazione materiali).
- Licenza: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
- [README originale](https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/RobotExpressive/README.md).
- [Download ufficiale](https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb), acquisito il 10 ottobre 2026, incluso una sola volta nel repository; nessun download GitHub a runtime.
- SHA-256: `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319`.
- Clip presenti: Dance, Death, Idle, Jump, No, Punch, Running, Sitting, Standing, ThumbsUp, Walking, WalkJump, Wave, Yes.
- Morph facciali: Angry, Surprised, Sad. La bocca emissiva aggiunta dall'app è una geometria procedurale; non si presume un morph `mouthOpen`.

La UI e la città sono procedurali. Nessun font, immagine o script da CDN a runtime.

## Future Observatory — Poly Haven

Acquisiti e verificati il 10 ottobre 2026. Tutti **CC0 1.0 Universal**, come dichiarato dalla [licenza ufficiale Poly Haven](https://polyhaven.com/license): non sono richiesti account, pagamento o attribuzione. Le attribuzioni sono comunque mantenute. File serviti localmente, nessuna richiesta Poly Haven durante la conversazione.

| Asset | Autore (API ufficiale) | File e uso | Fonte |
|---|---|---|---|
| Wood Floor Deck | Dimitrios Savva | Tre JPG 1k: diffuse, normal OpenGL, roughness; pavimento e panca | https://polyhaven.com/a/wood_floor_deck |
| Concrete Floor 02 | Rob Tuytel | Tre JPG 1k PBR; davanzale e base parete | https://polyhaven.com/a/concrete_floor_02 |
| Modern Coffee Table 01 | Amin | glTF 2.0 + buffer binario + tre JPG 1k, 4.504 triangoli; tavolino minimalista | https://polyhaven.com/a/modern_coffee_table_01 |
| Venice Sunset | Greg Zaal | HDRI 1k per riflessioni PBR/PMREM; non sostituisce la geometria della città | https://polyhaven.com/a/venice_sunset |

**6.308.432 byte** complessivi dei 12 file asset. Manifest con URL effettivi, licenza, dimensioni e SHA-256: `public/observatory/assets-manifest.json`. Download riproducibile: `python3 scripts/fetch-observatory-assets.py`; richiede rete e verifica anche gli MD5 ufficiali prima di scrivere. Nessun file `.blend` scaricato, nessuno strumento di modellazione usato. Le normali OpenGL e le risorse relative glTF sono compatibili con GLTFLoader Three.js; la suite controlla checksum, buffer e immagini e il browser carica effettivamente il modello. La scala del tavolino è adattata a 0,9 m; le texture sono ripetute e gli shader/materiali sono configurati dall’app.

### Fonti valutate senza integrazione

- [Quaternius Downtown City MegaKit](https://quaternius.com/packs/downtowncitymegakit.html): pagina consultata, licenza CC0 e sezione gratuita distinte dall’intero kit a pagamento. Nessun elemento non gratuito acquisito; per la prima città si usano istanze procedurali per controllare il carico e conservare una resa coerente fra stati.
- Per la stanza è stato conservato il tavolino realistico Poly Haven. I quattro asset Kenney acquisiti successivamente sono elencati sotto.

La città, il cielo a gradiente, gli oggetti narrativi, il tram e la vegetazione sono generati deterministicamente da geometrie Three.js. I suoni ambiente sono sintetizzati dall’app e non contengono registrazioni di terzi.

## Revisione ambientale e controlli Quest

Auto, ruote, colonnine, pensilina, turbine, fumo, macerie, canale, arbusti e chiome stratificate sono geometrie procedurali originali del progetto (EnvironmentalDistrict.ts e FutureObservatory.ts). I pulsanti e i cursori XR sono generati dall’app. Nessun nuovo modello, texture o suono di terzi è stato aggiunto; le licenze e il manifest degli asset CC0 precedenti restano invariati.


## Sei scenari — Kenney CC0

Acquisiti il 10 ottobre 2026 da download ufficiali gratuiti; licenze originali incluse in ogni directory. Autore **Kenney**, licenza [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Quattro GLB e due texture PNG 512 × 512, **241.590 byte** inclusi i file di licenza. Nessun CDN o account richiesto a runtime.

| Asset / fonte | Uso effettivo | Triangoli sorgente |
|---|---|---:|
| `industrial/building-h.glb` — [Industrial 2.0](https://kenney.nl/assets/city-kit-industrial) | Fabbrica/officina nello scenario economico | 698 |
| `industrial/solar-panel-flat.glb` — Industrial 2.0 | Due moduli fotovoltaici condivisi | 164 |
| `commercial/building-e.glb` — [Commercial 2.1](https://kenney.nl/assets/city-kit-commercial) | Due edifici di servizi nello scenario sociale | 1.509 |
| `furniture/bench.glb` — [Furniture Kit 2.0](https://kenney.nl/assets/furniture-kit) | Panchine dello spazio pubblico sociale | 170 |

Manifest: `public/scenarios/kenney/manifest.json`, URL download, SHA-256, dipendenze, bounding box e assi verificati con GLTFLoader nel browser. I GLB industriali/commerciali referenziano `Textures/colormap.png`: file preservati. Supporto Three.js a KHR_texture_transform; il materiale unlit della panca è sostituito con MeshStandardMaterial. Normalizzazione delle dimensioni e rotazione degli ingressi verso la finestra; istanze per primitiva, materiali PBR ruvidi e illuminazione statica. Questi piccoli modelli hanno un dettaglio stilizzato: non sono presentati come asset fotorealistici. Quaternius non è stato acquisito.

Cancelli, rampe, percorsi tattili, tavoli, sagome a distanza, materiali scartati/ordinati e banchi di riparazione sono geometrie procedurali originali; nessuna modellazione manuale. Non si generano ambienti AI durante il dialogo. Se un modello non carica, il quartiere conserva edifici procedurali e narrazione funzionanti.
