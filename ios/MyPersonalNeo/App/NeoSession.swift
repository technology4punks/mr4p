import SwiftUI
import ARKit
import RealityKit
import AVFoundation

@MainActor
final class NeoSession: ObservableObject {
    @Published var active = false
    @Published var busy = false
    @Published private(set) var assistedObservation = false
    private var observationLoop: Task<Void,Never>?
    @Published var message = "Un compagno che osserva, comprende e impara con te."
    @Published var answer = ""
    @Published var sources: [NeoSource] = []
    @Published var objects: [SpatialObject] = []
    @Published var calibrationStep = 0
    @Published var selectingSeat = false
    @Published var pianoReady = false
    @Published var playing = false
    @Published var showDetails = false
    let room = RoomUnderstanding()
    let voice = NeoVoice()
    private let backend = NeoBackend()
    private let sound = PianoSound()
    private var calibrationPoints: [SIMD3<Float>] = []
    private var piano: PianoCalibration?
    private var notes: [PianoNote] = []
    private var playTime: Double = 0
    private var nextNote = 0
    private var marker: ModelEntity?
    private var markers: [Entity] = []
    private var work: Task<Void,Never>?
    private var observationID = UUID()
    var calibrationPrompt: String {
        switch calibrationStep { case 1: return "Tocca il centro del LA0, il primo tasto bianco a sinistra (verso il bordo anteriore)."; case 2: return "Tocca il centro del DO8, l’ultimo tasto bianco a destra, alla stessa profondità."; case 3: return "Tocca il bordo posteriore di un tasto bianco centrale, dietro i punti precedenti."; default: return "Tastiera a 88 tasti · tre punti reali, nessuna misura inventata." }
    }
    init() {
        room.changed = { [weak self] in
            guard let self else { return }
            if !self.room.trackingNormal && self.playing { self.stopPerformance(); self.message = "Tracking perso: musica e contatto virtuale sospesi. Riallinea e riavvia." }
            self.objectWillChange.send()
        }
        room.tick = { [weak self] delta in self?.tick(delta) }
        voice.changed = { [weak self] in self?.room.rig.talking = self?.voice.state == .speaking; self?.objectWillChange.send() }
        voice.onTool = { [weak self] name,args in guard let self else { return ["accepted":false,"reason":"Sessione chiusa."] }; return await self.tool(name,args) }
    }
    func start() async {
        let allowed = await AVCaptureDevice.requestAccess(for:.video)
        guard allowed else { message = "Consenti la fotocamera nelle Impostazioni per avviare la scansione AR."; return }
        do { try room.start(); active = true; message = "Scansiona lentamente la stanza, poi tocca il pavimento per posizionare NEO." }
        catch { message = error.localizedDescription }
    }
    func suspend() {
        setAssistedObservation(false)
        work?.cancel(); observationID = UUID(); busy = false
        stopPerformance(); voice.stop(message:"App sospesa. Riprendi scansione e voce quando torni."); room.stop(); active = false
    }
    func startVoice() { Task { await voice.start(backend:backend) } }
    func look() { work?.cancel(); work = Task { _ = await inspect("Descrivi l’ambiente e gli oggetti con cui possiamo interagire.") } }
    func search(_ query: String) { work?.cancel(); work = Task { _ = await research(query) } }
    func setAssistedObservation(_ enabled: Bool) {
        observationLoop?.cancel(); observationLoop = nil; assistedObservation = enabled && active
        guard assistedObservation else { return }
        message = "Osservazione assistita attiva · un fotogramma ogni 15 secondi con tracking stabile."
        observationLoop = Task { [weak self] in
            while !Task.isCancelled {
                do { try await Task.sleep(for: .seconds(15)) } catch { return }
                guard let self, self.active, self.assistedObservation else { return }
                guard self.room.trackingNormal, !self.busy, self.voice.state != .speaking, self.voice.state != .thinking else { continue }
                _ = await self.inspect("Aggiorna gli oggetti utili e ciò che è cambiato. Descrivi solo elementi visibili, senza azioni autonome.", interactive:false)
            }
        }
    }
    private func inspect(_ question: String, interactive: Bool = true) async -> [String:Any] {
        let id = UUID(); observationID = id; busy = true; message = "Osservo un fotogramma e lo collego alla geometria…"
        defer { if observationID == id { busy = false } }
        do {
            let capture = try room.capture()
            let reply = try await backend.look(question:question,jpeg:capture.jpeg)
            try Task.checkCancellation(); guard observationID == id, active, room.trackingNormal else { throw NeoFailure("Scansione cambiata: ripeti l’osservazione con tracking stabile.") }
            objects = SceneFusion.locate(reply.objects ?? [],frame:capture.frame,orientation:capture.orientation,session:room.view.session)
            voice.updateContext(["objects":objects.map(\.summary),"pianoCalibrated":pianoReady,"tracking":room.trackingNormal])
            markers.forEach { $0.removeFromParent() }; markers.removeAll()
            for object in objects { if let p = object.position { let dot = ModelEntity(mesh:.generateSphere(radius:0.012),materials:[UnlitMaterial(color:.cyan)]);dot.position=p;room.world.addChild(dot);markers.append(dot) } }
            answer = reply.text; sources = reply.sources; if interactive { showDetails = true }; message = "Osservazione aggiornata · geometria e significato restano distinti"
            return ["accepted":true,"text":reply.text,"objects":objects.map(\.summary),"note":"Posizioni stimate al momento della foto, non garanzia di comprensione completa. Il pianoforte richiede calibrazione tasti."]
        } catch { if observationID == id { message = error.localizedDescription }; return ["accepted":false,"reason":error is CancellationError ? "Osservazione annullata dalla nuova richiesta." : error.localizedDescription] }
    }
    private func research(_ query: String) async -> [String:Any] {
        busy = true; message = "Consulto le istruzioni sul web…"; defer { busy = false }
        do {
            let reply = try await backend.instructions(query:query); try Task.checkCancellation()
            answer = reply.text; sources = reply.sources; showDetails = true
            message = reply.searched ? "Fonti consultate · verifica marca e modello" : "Nessuna ricerca verificata disponibile"
            return ["accepted":true,"text":reply.text,"searched":reply.searched,"sources":reply.sources.map {["title":$0.title,"url":$0.url]}]
        } catch { message = error.localizedDescription; return ["accepted":false,"reason":error is CancellationError ? "Ricerca annullata." : error.localizedDescription] }
    }
    func beginPiano() throws {
        guard active,room.trackingNormal else { throw NeoFailure("Attiva la scansione con tracking stabile.") }
        stopPerformance(); piano = nil; pianoReady = false; calibrationPoints.removeAll(); calibrationStep = 1; selectingSeat = false
        room.tap = { [weak self] point in self?.calibrate(point) }; message = calibrationPrompt
    }
    func beginSeat() throws {
        guard active,room.trackingNormal else { throw NeoFailure("Attiva la scansione con tracking stabile.") }
        stopPerformance(); calibrationStep = 0; selectingSeat = true; message = "Tocca una superficie orizzontale misurata all’altezza della seduta."
        room.tap = { [weak self] point in
            guard let self else { return }; self.room.place(at:point-[0,self.room.rig.seatedHipHeight,0]);self.room.rig.seated=true;self.room.tap=nil;self.selectingSeat=false;self.message="Seduta virtuale calibrata · controlla l’allineamento alla sedia reale."
        }
    }
    func cancelCalibration() { calibrationStep = 0; selectingSeat = false; calibrationPoints.removeAll();room.tap=nil;message="Selezione annullata." }
    private func calibrate(_ point: SIMD3<Float>) {
        guard calibrationStep > 0 else { return }; calibrationPoints.append(point)
        if calibrationPoints.count == 3 {
            do { piano = try PianoCalibration(low:calibrationPoints[0],high:calibrationPoints[1],back:calibrationPoints[2]); pianoReady = true; voice.updateContext(["pianoCalibrated":true,"tracking":room.trackingNormal]); calibrationStep = 0; room.tap = nil; message = "Tastiera calibrata. Puoi chiedere a NEO di sedersi e suonare." }
            catch { calibrationPoints.removeAll();calibrationStep=1;message=error.localizedDescription+" "+calibrationPrompt }
        } else { calibrationStep += 1; message=calibrationPrompt }
    }
    func sitAtPiano() throws {
        guard let piano,room.trackingNormal else { throw NeoFailure("Prima calibra la tastiera e attendi tracking stabile.") }
        room.place(at:piano.seat-piano.up*room.rig.seatedHipHeight); room.rig.root.orientation=simd_quatf(from:[0,0,1],to:piano.depthAxis);room.rig.seated=true;message="NEO è alla tastiera · dita virtuali e audio sintetico."
    }
    func playPiano(_ piece: String) throws {
        guard piano != nil,let score=PianoScore.notes(piece) else { throw NeoFailure("Calibra una tastiera a 88 tasti e scegli una melodia disponibile.") }
        stopPerformance();try sitAtPiano();notes=score;nextNote=0;playTime=0;playing=true
    }
    func stopPerformance() { playing=false;notes.removeAll();sound.stop();marker?.removeFromParent();marker=nil;room.rig.target=nil }
    private func tick(_ delta: Float) {
        guard playing,let piano else { return };playTime += Double(delta)
        if nextNote < notes.count,playTime >= notes[nextNote].beat {
            let note=notes[nextNote];sound.note(note.midi);room.rig.rightHand=note.midi>=60;room.rig.target=piano.key(note.midi)
            if marker == nil {let dot=ModelEntity(mesh:.generateSphere(radius:0.008),materials:[UnlitMaterial(color:.cyan)]);room.world.addChild(dot);marker=dot}
            marker?.position=piano.key(note.midi) ?? piano.middle;nextNote+=1
        }
        if let last=notes.last,playTime>last.beat+last.duration+0.5 {stopPerformance();message="Dimostrazione conclusa · il pianoforte reale non è stato azionato."}
    }
    func demo(_ name: String) {stopPerformance();room.rig.play(name);message=name.hasPrefix("judo") ? "Illustrazione semplificata: osserva il modello, pratica con un istruttore." : "Dimostrazione sullo scheletro umanoide."}
    private func tool(_ name: String,_ raw: String) async -> [String:Any] {
        guard let data=raw.data(using:.utf8),let args=try? JSONSerialization.jsonObject(with:data) as? [String:Any] else {return ["accepted":false,"reason":"Argomenti non validi."]}
        do {
            switch name {
            case "look_at_environment": guard let q=args["question"] as? String,!q.isEmpty else {throw NeoFailure("Domanda mancante.")}; return await inspect(String(q.prefix(500)))
            case "find_instructions": guard let q=args["query"] as? String,!q.isEmpty else {throw NeoFailure("Ricerca mancante.")}; return await research(String(q.prefix(500)))
            case "calibrate_piano": try beginPiano();return ["accepted":true,"pending":true,"reason":calibrationPrompt]
            case "calibrate_seat":try beginSeat();return ["accepted":true,"pending":true,"reason":message]
            case "sit_at_piano": try sitAtPiano()
            case "play_piano":guard let piece=args["piece"] as? String else {throw NeoFailure("Melodia mancante.")};try playPiano(piece)
            case "point_at_object":guard room.trackingNormal,let id=args["objectId"] as? String,let object=objects.first(where:{$0.id==id}),let target=object.position,room.rig.root.isEnabled else {throw NeoFailure("Oggetto non localizzato o avatar non posizionato. Osserva di nuovo e tocca il pavimento.")};let origin=room.rig.root.position+[0,1.15,0],v=target-origin;room.rig.target=origin+simd_normalize(v)*min(0.55,simd_length(v));message="NEO indica "+object.observation.label
            case "demonstrate":guard let id=args["animation"] as? String,["wave","explain","judo_rei","judo_tai_sabaki"].contains(id),room.rig.root.isEnabled,room.trackingNormal else {throw NeoFailure("Posiziona NEO e scegli una dimostrazione disponibile.")};demo(id)
            case "stop_demonstration":stopPerformance();room.rig.stop()
            default:throw NeoFailure("Azione non disponibile.")
            }
            return ["accepted":true,"reason":message,"calibratedPiano":pianoReady,"tracking":room.trackingNormal]
        } catch {message=error.localizedDescription;return ["accepted":false,"reason":error.localizedDescription]}
    }
}
