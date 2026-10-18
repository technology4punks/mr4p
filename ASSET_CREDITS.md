> Visita guidata/control room, 13 ottobre 2026: nessun nuovo asset 3D o texture; riusati gli asset e le licenze documentati sotto. Interfaccia control room realizzata con CSS originale, senza immagini esterne.

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

## V4 · geometrie e suoni originali

Portale, trenta strati d’intervento, connessioni fra settori, persone a distanza, traffico, cargo bike, furgoni, skyline, cielo e UI sono geometrie/shader originali del progetto. Geometrie statiche ripetute sono instanziate; nessun asset AI viene generato durante la conversazione. Suoni sintetici Web Audio, senza registrazioni di terzi. Three.js è MIT.

## Risorse precedenti conservate, non precaricate nella V4

I quattro GLB Kenney in `public/scenarios/kenney/` sono **CC0**, autore Kenney; licenze e manifest originali sono conservati. Fonti: [City Kit Industrial](https://kenney.nl/assets/city-kit-industrial), [City Kit Commercial](https://kenney.nl/assets/city-kit-commercial), [Furniture Kit](https://kenney.nl/assets/furniture-kit). Le precedenti città separate non sono parte del percorso V4, pertanto questi modelli non vengono caricati dal renderer attuale.

“Rigged robot” di **joney_lol**, via [Poly Pizza](https://poly.pizza/m/BwjA6Thdzd), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), resta un candidato umanoide opzionale in `public/models/humanoid/`, con attribuzione, checksum, modifiche e licenza. Non è caricato automaticamente e non sostituisce RobotExpressive. [Valutazione tecnica](docs/HUMANOID_CANDIDATE.md).

Non sono stati scaricati nuovi asset esterni per la V4: avatar e materiali/modello/HDRI Poly Haven già verificati sono riutilizzati. Le texture 1k sono JPEG e l’HDRI è 1k; non si dichiara compressione GPU KTX2 o Draco che non è stata applicata.

## Riordino spaziale · 13 ottobre 2026

Nessun asset esterno aggiunto. Pianta, lotti e percorsi sono originali e deterministici; le geometrie instanziate, i materiali PBR e gli asset locali già attribuiti sono riutilizzati. [Documentazione della pianta](docs/CITY_LAYOUT.md).

## My Personal Neo iPhone · 18 ottobre 2026
La prima revisione usava il robot joney_lol; la revisione 2 lo rimuove dal bundle iOS. Il web Robot Buddy conserva i propri avatar.

Tre avatar realistici **Microsoft Rocketbox**, Copyright (c) 2020 Microsoft, **MIT**. Originali `Female_Adult_01`, `Male_Adult_01`, `Female_Adult_02` da [fonte ufficiale](https://github.com/microsoft/Microsoft-Rocketbox), revisione `0943055db6ec570bcef9f2c8b41c9e5467c808f9`. Acquisiti il 18 ottobre 2026: FBX, diffuse/normal TGA e preview PNG. [Licenza upstream](https://github.com/microsoft/Microsoft-Rocketbox/blob/master/LICENSE.md), copia in `ios/MyPersonalNeo/Resources/Rocketbox-MIT.txt` e `public/models/personal-neo/LICENSE.txt`. Conversione automatica senza DCC: Assimp→OpenUSD, texture PNG 1k, joint ordinati, assi/scala e pesi rimappati. Modelli USDZ e manifest/hash nel bundle, preview JPG nel portale; nessun download a runtime. 80 joint ciascuno, 7.440–8.940 triangoli, 5,6–6,6 MB per modello. Pose/IK/camminata e bocca semplificata originali, non animazioni scaricate. Dettagli e riproduzione nella [guida iOS](ios/README.md).

MakeHuman valutato come generatore gratuito con asset core/output CC0, non integrato. Non sono usati servizi generativi, account Mixamo o modelli di licenza incerta. WebRTC iOS da stasel/WebRTC, package binario upstream con avvisi/licenza propri.
