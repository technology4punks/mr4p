# My Personal Neo · iPhone

SwiftUI, RealityKit e ARKit nativi, iOS 17+. Progetto separato dalla visita V4. Non modificare il flusso web di Robot Buddy. Chiavi solo backend; il client riceve token effimeri. Consenso esplicito prima di fotocamera/microfono, nessuna registrazione persistente di immagini o conversazioni. Trasmettere un fotogramma solo su richiesta; rendere visibili stato del tracking, microfono e ricerca.

LiDAR opzionale, feature detection per scene reconstruction/depth/occlusion. La mesh non è comprensione semantica universale. Il pianoforte richiede calibrazione geometrica esplicita e tracking normale. Le dita virtuali non muovono fisicamente i tasti: il suono iniziale è sintetizzato nell'app. Nessuna promessa di azionamento meccanico o riconoscimento perfetto. Le animazioni sono locali sul rig, non eseguite da codice web o output del modello. Fermare interazione spaziale se il tracking è limitato.

Consegnare progetto Xcode senza team o certificati incorporati. Verificare build/test simulator con CI macOS se disponibile. Documentare separatamente test automatici, simulatore e test fisici; camera ARKit, LiDAR, allineamento dita/tasti e audio full duplex richiedono iPhone reale. Non dichiarare pubblicazione App Store/TestFlight senza upload e verifica effettivi.
