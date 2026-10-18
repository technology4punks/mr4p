import SwiftUI
import ARKit
import RealityKit
import AVFoundation

@MainActor
final class NeoSession: ObservableObject {
    @Published var active = false
    @Published private(set) var starting = false
    private var startID = UUID()
    private var perceptionInFlight = false
    private var knownSpatialEpoch: UUID?
    private var knownTrackingNormal: Bool?
    @Published var controlsVisible = false
    @Published var avatar = AvatarProfile(rawValue: UserDefaults.standard.string(forKey:"neo.avatar") ?? "") ?? .woman
    private var observedAt = Date.distantPast
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
    private var work: Task<Void,Never>?
    private var observationID = UUID()
    var calibrationPrompt: String {
        switch calibrationStep { case 1: return "Tocca il centro del LA0, il primo tasto bianco a sinistra (verso il bordo anteriore)."; case 2: return "Tocca il centro del DO8, l’ultimo tasto bianco a destra, alla stessa profondità."; case 3: return "Tocca il bordo posteriore di un tasto bianco centrale, dietro i punti precedenti."; default: return "Tastiera a 88 tasti · tre punti reali, nessuna misura inventata." }
    }
    init() {
        room.changed = { [weak self] in
            guard let self else { return }
            if self.knownSpatialEpoch != self.room.spatialEpoch {
                self.knownSpatialEpoch=self.room.spatialEpoch
                self.objects=[]; self.observedAt = .distantPast
                self.piano=nil; self.pianoReady=false; self.cancelCalibration(); self.stopPerformance()
                self.voice.updateContext(["objects":[],"pianoCalibrated":false,"tracking":self.room.trackingNormal])
            }
            if self.knownTrackingNormal != self.room.trackingNormal {
                self.knownTrackingNormal=self.room.trackingNormal
                self.voice.updateContext(["tracking":self.room.trackingNormal])
            }
            if !self.room.trackingNormal && self.playing { self.stopPerformance(); self.message = "Tracking perso: musica e contatto virtuale sospesi. Riallinea e riavvia." }
            if self.controlsVisible || !self.active {self.objectWillChange.send()}
        }
        room.revealControls = { [weak self] in self?.controlsVisible.toggle() }
        room.tick = { [weak self] delta in self?.tick(delta) }
        voice.changed = { [weak self] in self?.room.rig.talking = self?.voice.state == .speaking; if self?.controlsVisible == true {self?.objectWillChange.send()} }
        voice.onTool = { [weak self] name,args in guard let self else { return ["accepted":false,"reason":"Sessione chiusa."] }; return await self.tool(name,args) }
    }
    func start() async {
        guard !starting, !active else {return}
        starting=true; let id=UUID();startID=id
        defer {if startID == id {starting=false}}
        let allowed = await AVCaptureDevice.requestAccess(for:.video)
        guard startID == id, UIApplication.shared.applicationState != .background else { return }
        guard allowed else { message = "Consenti la fotocamera nelle Impostazioni per avviare la scansione AR."; return }
        // Resolve system permission dialogs before starting the bounded scan. Reading
        // the microphone prompt must not consume the six seconds of floor discovery.
        _ = await withCheckedContinuation { (continuation:CheckedContinuation<Bool,Never>) in
            AVAudioApplication.requestRecordPermission {continuation.resume(returning:$0)}
        }
        guard startID == id, UIApplication.shared.applicationState != .background else {return}
        do {
            let chosenAvatar=avatar
            try await room.start(profile:chosenAvatar)
            guard startID == id, UIApplication.shared.applicationState != .background else {return}
            UserDefaults.standard.set(chosenAvatar.rawValue,forKey:"neo.avatar")
            active = true; controlsVisible = false; message = "Scansiona lentamente il pavimento: NEO apparirà davanti a te."
            voice.updateContext(["avatarKind":chosenAvatar.rawValue,"hasHands":chosenAvatar.isHuman])
            await voice.start(backend:backend)
            if startID == id, active, voice.state == .error { message=voice.message }
        }
        catch { if startID == id, !(error is CancellationError) {message = error.localizedDescription} }
    }
    func suspend() {
        startID=UUID();starting=false
        setAssistedObservation(false)
        work?.cancel(); observationID = UUID(); busy = false; controlsVisible = false; showDetails = false
        stopPerformance(); cancelCalibration(); piano=nil; pianoReady=false; objects=[]; observedAt = .distantPast
        voice.stop(message:"App sospesa. Riprendi scansione e voce quando torni."); room.stop(); active = false
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
                guard self.room.trackingNormal, !self.busy, self.voice.state != .speaking, self.voice.state != .thinking, self.voice.state != .connecting else { continue }
                _ = await self.inspect("Aggiorna gli oggetti utili e ciò che è cambiato. Descrivi solo elementi visibili, senza azioni autonome.", interactive:false)
            }
        }
    }
    private func inspect(_ question: String, interactive: Bool = true) async -> [String:Any] {
        guard !perceptionInFlight else {return ["accepted":false,"reason":"Sto già osservando. Attendi il risultato: non serve una seconda foto."]}
        let id = UUID(); observationID = id; perceptionInFlight=true; busy = true
        message = "Osservo un fotogramma e lo collego alla geometria…"
        defer {perceptionInFlight=false;if observationID == id {busy=false}}
        do {
            let capture = try await room.capture()
            let reply = try await backend.look(question:question,jpeg:capture.jpeg)
            try Task.checkCancellation()
            guard observationID == id, active, room.trackingNormal, capture.epoch == room.spatialEpoch,
                  ProcessInfo.processInfo.systemUptime-capture.capturedAt<30 else {throw NeoFailure("Osservazione superata o tracking cambiato: ripeti l’osservazione.")}
            objects = SceneFusion.locate(reply.objects ?? [],snapshot:capture.snapshot)
            voice.updateContext(["objects":objects.map(\.summary),"pianoCalibrated":pianoReady,"tracking":room.trackingNormal])
            observedAt = Date(timeIntervalSinceNow: -(ProcessInfo.processInfo.systemUptime-capture.capturedAt))
            answer = reply.text; sources = reply.sources;  message = "Osservazione aggiornata · geometria e significato restano distinti"
            return ["accepted":true,"text":reply.text,"objects":objects.map(\.summary),"note":"Posizioni stimate al momento della foto, non garanzia di comprensione completa. Il pianoforte richiede calibrazione tasti."]
        } catch { if observationID == id { message = error.localizedDescription }; return ["accepted":false,"reason":error is CancellationError ? "Osservazione annullata dalla nuova richiesta." : error.localizedDescription] }
    }
    private func research(_ query: String) async -> [String:Any] {
        busy = true; message = "Consulto le istruzioni sul web…"; defer { busy = false }
        do {
            let reply = try await backend.instructions(query:query); try Task.checkCancellation()
            answer = reply.text; sources = reply.sources
            message = reply.searched ? "Fonti consultate · verifica marca e modello" : "Nessuna ricerca verificata disponibile"
            return ["accepted":true,"text":reply.text,"searched":reply.searched,"sources":reply.sources.map {["title":$0.title,"url":$0.url]}]
        } catch { message = error.localizedDescription; return ["accepted":false,"reason":error is CancellationError ? "Ricerca annullata." : error.localizedDescription] }
    }
    func beginPiano() throws {
        guard avatar.isHuman else {throw NeoFailure("Il cane non ha mani: scegli uomo o donna prima dell’esperienza per suonare.")}
        guard active,room.trackingNormal else { throw NeoFailure("Attiva la scansione con tracking stabile.") }
        room.stopWalking(); stopPerformance(); piano = nil; pianoReady = false; calibrationPoints.removeAll(); calibrationStep = 1; selectingSeat = false
        room.tap = { [weak self] point in self?.calibrate(point) }; message = calibrationPrompt
    }
    func beginSeat() throws {
        guard avatar.isHuman else {throw NeoFailure("La seduta su sedia richiede l’avatar umano.")}
        guard active,room.trackingNormal else { throw NeoFailure("Attiva la scansione con tracking stabile.") }
        room.stopWalking(); stopPerformance(); calibrationStep = 0; selectingSeat = true; message = "Tocca una superficie orizzontale misurata all’altezza della seduta."
        room.tap = { [weak self] point in
            guard let self else { return }; self.room.place(at:point-[0,self.room.rig.seatedHipHeight,0]);self.room.rig.seated=true;self.room.tap=nil;self.selectingSeat=false;self.message="Seduta virtuale calibrata · controlla l’allineamento alla sedia reale.";self.voice.announce(self.message)
        }
    }
    func cancelCalibration() { calibrationStep = 0; selectingSeat = false; calibrationPoints.removeAll();room.tap=nil;message="Selezione annullata." }
    private func calibrate(_ point: SIMD3<Float>) {
        guard calibrationStep > 0 else { return }; calibrationPoints.append(point)
        if calibrationPoints.count == 3 {
            do { piano = try PianoCalibration(low:calibrationPoints[0],high:calibrationPoints[1],back:calibrationPoints[2]); pianoReady = true; voice.updateContext(["pianoCalibrated":true,"tracking":room.trackingNormal]); calibrationStep = 0; room.tap = nil; message = "Tastiera calibrata. Puoi chiedere a NEO di sedersi e suonare." }
            catch { calibrationPoints.removeAll();calibrationStep=1;message=error.localizedDescription+" "+calibrationPrompt }
        } else { calibrationStep += 1; message=calibrationPrompt };voice.announce(message)
    }
    func sitAtPiano() throws {
        guard avatar.isHuman else {throw NeoFailure("Il cane non può sedersi o suonare come un avatar umano.")}
        guard let piano,room.trackingNormal else { throw NeoFailure("Prima calibra la tastiera e attendi tracking stabile.") }
        room.place(at:piano.seat-piano.up*room.rig.seatedHipHeight); room.rig.root.orientation=simd_quatf(from:[0,0,1],to:piano.depthAxis);room.rig.seated=true;message="NEO è alla tastiera · dita virtuali e audio sintetico."
    }
    func playPiano(_ piece: String) throws {
        guard piano != nil,let score=PianoScore.notes(piece) else { throw NeoFailure("Calibra una tastiera a 88 tasti e scegli una melodia disponibile.") }
        stopPerformance();try sitAtPiano();notes=score;nextNote=0;playTime=0;playing=true
    }
    func stopPerformance() { playing=false;notes.removeAll();sound.stop();room.rig.target=nil }
    private func tick(_ delta: Float) {
        guard playing,let piano else { return };playTime += Double(delta)
        if nextNote < notes.count,playTime >= notes[nextNote].beat {
            let note=notes[nextNote];sound.note(note.midi);room.rig.rightHand=note.midi>=60;room.rig.target=piano.key(note.midi)
            nextNote+=1
        }
        if let last=notes.last,playTime>last.beat+last.duration+0.5 {stopPerformance();message="Dimostrazione conclusa · il pianoforte reale non è stato azionato."}
    }
    func demo(_ name: String) {guard avatar.isHuman || name == "wave" else {message="Il cane può muoversi e salutare con la coda, non eseguire gesti umani.";return};guard room.rig.root.isEnabled,room.trackingNormal,!room.rig.seated else {message="Tocca prima il pavimento per posizionare NEO in piedi.";return};stopPerformance();room.rig.play(name);message=name.hasPrefix("judo") ? "Illustrazione semplificata: osserva il modello, pratica con un istruttore." : "Dimostrazione sullo scheletro umanoide."}
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
            case "move_near_object":
                guard Date().timeIntervalSince(observedAt)<30,let id=args["objectId"] as? String,let object=objects.first(where:{$0.id==id}),let target=object.position else { throw NeoFailure("Osserva di nuovo l’oggetto per localizzarlo.") }
                stopPerformance();try room.walkNear(target);message="Mi avvicino sul pavimento misurato; mi fermo se il percorso non è libero."
            case "follow_user": room.followUser=true;room.stopWalking();message="Ti resto vicino se il pavimento misurato è libero."
            case "show_controls": controlsVisible=true;message="Controlli aperti. Doppio tocco con due dita per nasconderli."
            case "point_at_object":guard Date().timeIntervalSince(observedAt)<30, room.trackingNormal,let id=args["objectId"] as? String,let object=objects.first(where:{$0.id==id}),let target=object.position,room.rig.root.isEnabled else {throw NeoFailure("Oggetto non localizzato o avatar non posizionato. Osserva di nuovo e tocca il pavimento.")};room.stopWalking();room.followUser=false;if !avatar.isHuman {room.lookToward(target);return ["accepted":true,"reason":"Il cane guarda l’oggetto; non possiede mani."]};let origin=room.rig.root.position+[0,1.15,0],v=target-origin;room.rig.target=origin+simd_normalize(v)*min(0.55,simd_length(v));message="NEO indica "+object.observation.label
            case "demonstrate":guard avatar.isHuman || args["animation"] as? String == "wave" else {throw NeoFailure("Il cane non esegue dimostrazioni umane.")};guard let id=args["animation"] as? String,["wave","explain","judo_rei","judo_tai_sabaki"].contains(id),room.rig.root.isEnabled,room.trackingNormal,!room.rig.seated else {throw NeoFailure("Posiziona NEO e scegli una dimostrazione disponibile.")};demo(id)
            case "stop_demonstration":cancelCalibration();stopPerformance();room.stopWalking();room.followUser=false;room.rig.stop(stand:false)
            default:throw NeoFailure("Azione non disponibile.")
            }
            return ["accepted":true,"reason":message,"calibratedPiano":pianoReady,"tracking":room.trackingNormal]
        } catch {message=error.localizedDescription;return ["accepted":false,"reason":error.localizedDescription]}
    }
}
