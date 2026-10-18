import Foundation
import AVFoundation
@preconcurrency import WebRTC

@MainActor
final class NeoVoice: NSObject, RTCPeerConnectionDelegate, RTCDataChannelDelegate {
    enum State: String { case off = "Voce spenta", connecting = "Connessione…", ready = "Ti ascolto", thinking = "Sto pensando", speaking = "NEO parla", muted = "Microfono disattivato", error = "Voce da riattivare" }
    var changed: (() -> Void)?
    var onTool: ((String, String) async -> [String: Any])?
    private(set) var state: State = .off
    private(set) var message = "Avvia la voce quando vuoi."
    private(set) var heard = ""
    private(set) var said = ""
    private(set) var muted = false
    private var pc: RTCPeerConnection?, channel: RTCDataChannel?, track: RTCAudioTrack?
    private static let sharedFactory: RTCPeerConnectionFactory = {
        _ = RTCInitializeSSL()
        return RTCPeerConnectionFactory()
    }()
    private let factory = NeoVoice.sharedFactory
    private var gate = VoiceTurnGate()
    private var generation = UUID()
    private var calls = Set<String>()
    private var answered = Set<String>()
    private var pendingAnnouncement: String?
    private var context: [String:Any] = [:]
    private var jobs: [String: Task<Void, Never>] = [:]
    private var pendingUser = false, pendingTool = false, speaking = false, greeted = false
    private var timeout: Task<Void, Never>?
    private var health: Task<Void,Never>?
    private var evidence: [String:SpeechEvidence] = [:]
    private var transcriptTimers: [String:Task<Void,Never>] = [:]
    private var backend: NeoBackend?
    private var desiredRunning = false
    private var starting = false
    private var interruptedBySystem = false
    private var recovery: Task<Void,Never>?
    private var retryCount = 0
    private var recent: [(String,String)] = []
    private var lastBytes: UInt64?
    private var stalledSince: Date?
    private var lastEvent = Date()
    private var responseID: String?
    private var cancelled = Set<String>()
    private var observer: NSObjectProtocol?
    private var routeObserver: NSObjectProtocol?
    override init() {
        super.init()
        observer = NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] notification in
            let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt
            Task { @MainActor in
                guard let self, self.desiredRunning else { return }
                if raw == AVAudioSession.InterruptionType.began.rawValue {
                    self.interruptedBySystem = true; self.recovery?.cancel(); self.recovery=nil; self.closeTransport()
                    self.state = .connecting; self.message = "Audio sospeso da iOS"; self.changed?()
                } else if raw == AVAudioSession.InterruptionType.ended.rawValue {
                    self.interruptedBySystem = false; self.recover()
                }
            }
        }
        routeObserver = NotificationCenter.default.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in
                guard let self, self.desiredRunning, !self.interruptedBySystem else { return }
                do { try self.configureAudio(); self.track?.isEnabled = !self.muted }
                catch { self.recover() }
            }
        }
    }
    private func configureAudio() throws {
        let audio = AVAudioSession.sharedInstance()
        try audio.setCategory(.playAndRecord,mode:.voiceChat,options:[.defaultToSpeaker,.allowBluetooth])
        try audio.setActive(true)
    }
    private func recover() {
        guard desiredRunning, !interruptedBySystem, let backend, recovery == nil else { return }
        closeTransport(); state = .connecting; message = "Ricollego l’ascolto…"; changed?()
        let delay = min(12, 1 << min(3,retryCount)); retryCount += 1
        recovery = Task { [weak self] in
            do { try await Task.sleep(for:.seconds(delay)) } catch { return }
            guard let self, self.desiredRunning, !self.interruptedBySystem else { return }
            // An interrupted SDP/permission operation can still be unwinding. Do not
            // lose the recovery request to start()'s concurrent-connection guard.
            while self.starting {
                do { try await Task.sleep(for:.milliseconds(200)) } catch { return }
                guard self.desiredRunning, !self.interruptedBySystem else { return }
            }
            self.recovery=nil; await self.start(backend:backend)
        }
    }
    func start(backend: NeoBackend) async {
        guard pc == nil, !starting else { return }
        starting=true; defer { starting=false }
        self.backend=backend; desiredRunning=true
        generation = UUID(); let run = generation
        let allowed = await withCheckedContinuation { continuation in AVAudioSession.sharedInstance().requestRecordPermission { continuation.resume(returning: $0) } }
        guard generation == run, desiredRunning else { return }
        guard allowed else { desiredRunning=false; state = .error; message = "Consenti il microfono nelle Impostazioni dell’iPhone."; changed?(); return }
        state = .connecting; message = "Collego la conversazione…"; changed?()
        do {
            try configureAudio()
            let token = try await backend.token()
            guard generation == run else { return }
            guard token.expires_at > Date().timeIntervalSince1970 else { throw NeoFailure("Token voce scaduto, ricollego.") }
            let configuration = RTCConfiguration(); configuration.sdpSemantics = .unifiedPlan
            let constraints = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: ["googEchoCancellation":"true", "googNoiseSuppression":"true", "googAutoGainControl":"true"])
            guard let peer = factory.peerConnection(with: configuration, constraints: constraints, delegate: self) else { throw NeoFailure("WebRTC non disponibile.") }
            pc = peer
            let source = factory.audioSource(with: constraints), audioTrack = factory.audioTrack(with: source, trackId: "neo-microphone")
            track = audioTrack; audioTrack.isEnabled = !muted; peer.add(audioTrack, streamIds: ["neo-audio"])
            channel = peer.dataChannel(forLabel: "oai-events", configuration: RTCDataChannelConfiguration()); channel?.delegate = self
            let offer: RTCSessionDescription = try await withCheckedThrowingContinuation { c in peer.offer(for: RTCMediaConstraints(mandatoryConstraints: ["OfferToReceiveAudio":"true"], optionalConstraints: nil)) { sdp,error in if let sdp { c.resume(returning: sdp) } else { c.resume(throwing: error ?? NeoFailure("Offerta audio non disponibile.")) } } }
            try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, Error>) in peer.setLocalDescription(offer) { error in if let error { c.resume(throwing: error) } else { c.resume() } } }
            var request = URLRequest(url: URL(string: "https://api.openai.com/v1/realtime/calls")!); request.httpMethod = "POST"; request.timeoutInterval = 25
            request.setValue("Bearer " + token.value, forHTTPHeaderField: "Authorization"); request.setValue("application/sdp", forHTTPHeaderField: "Content-Type"); request.httpBody = offer.sdp.data(using: .utf8)
            let (data,response) = try await URLSession.shared.data(for: request)
            guard generation == run else { return }
            guard (response as? HTTPURLResponse)?.statusCode == 201 || (response as? HTTPURLResponse)?.statusCode == 200, let answer = String(data: data, encoding: .utf8) else { throw NeoFailure("Connessione voce non riuscita. Controlla rete o credito API.") }
            try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void,Error>) in peer.setRemoteDescription(RTCSessionDescription(type: .answer,sdp: answer)) { error in if let error { c.resume(throwing: error) } else { c.resume() } } }
            if channel?.readyState == .open { startHealthMonitor() }
            else { timeout = Task { [weak self] in
                try? await Task.sleep(for: .seconds(30))
                guard let self, !Task.isCancelled, self.generation == run else { return }
                if self.channel?.readyState != .open { self.recover() }
                else { self.startHealthMonitor() }
            } }
        } catch { if generation == run { closeTransport(); state = .error; message = error.localizedDescription; changed?(); if retryCount < 5 { recover() } } }
    }
    private func startHealthMonitor() {
        timeout?.cancel();timeout=nil
        guard health == nil else { return }
        let run=generation;health=Task { [weak self] in await self?.watchdog(run) }
    }
    private func watchdog(_ run: UUID) async {
        while generation == run && !Task.isCancelled {
            try? await Task.sleep(for: .seconds(3))
            guard generation == run, !Task.isCancelled else { return }
            if let peer=pc, !muted {
                peer.statistics { [weak self] report in
                    let bytes = report.statistics.values.filter { $0.type == "outbound-rtp" && ($0.values["kind"] as? String ?? $0.values["mediaType"] as? String) == "audio" }.reduce(UInt64(0)) { $0 + (($1.values["bytesSent"] as? NSNumber)?.uint64Value ?? 0) }
                    Task { @MainActor in self?.checkUplink(bytes,run:run) }
                }
            }
            if gate.responseActive && Date().timeIntervalSince(lastEvent) > 35 {
                send(["type":"response.cancel"]); gate.complete(); speaking = false; flush(); state = muted ? .muted : .ready; message = "Risposta interrotta. Puoi ripetere la domanda."; changed?()
            }
        }
    }
    private func checkUplink(_ bytes: UInt64, run: UUID) {
        guard generation == run, desiredRunning, !muted, channel?.readyState == .open else { return }
        defer { if generation == run { lastBytes = bytes } }
        if let lastBytes, bytes <= lastBytes {
            if stalledSince == nil { stalledSince=Date(); track?.isEnabled=false; track?.isEnabled=true }
            else if Date().timeIntervalSince(stalledSince!) > 12 { recover() }
        } else { stalledSince=nil }
    }
    func announce(_ text: String) {
        guard channel?.readyState == .open else { return }
        guard !gate.responseActive, !speaking else { pendingAnnouncement=text;return }
        gate.begin(comment:true)
        send(["type":"response.create","response":["tool_choice":"none","max_output_tokens":140,"instructions":"Pronuncia solo questa indicazione dell’app, poi ascolta: " + text]])
    }
    func updateContext(_ context: [String:Any]) {
        self.context = context
        guard let data = try? JSONSerialization.data(withJSONObject:context), let text=String(data:data,encoding:.utf8) else { return }
        send(["type":"conversation.item.create","item":["type":"message","role":"system","content":[["type":"input_text","text":"Stato spaziale corrente dell'app: "+text+". Non è un turno utente e non autorizza iniziative o tool. Aspetta la richiesta."]]]])
    }
    private func send(_ event: [String: Any]) {
        guard channel?.readyState == .open, let data = try? JSONSerialization.data(withJSONObject: event) else { return }
        channel?.sendData(RTCDataBuffer(data: data,isBinary: false))
    }
    private func flush() {
        guard !gate.responseActive, !speaking, !muted else { return }
        guard pendingUser || pendingTool else {
            if let next=pendingAnnouncement {pendingAnnouncement=nil;announce(next)}
            return
        }
        pendingUser = false; pendingTool = false; gate.begin(); lastEvent = Date(); state = .thinking
        send(["type":"response.create"]); changed?()
    }
    private func interrupt() {
        if let id = responseID { cancelled.insert(id) }
        if gate.responseActive { send(["type":"response.cancel"]) }
        if speaking { send(["type":"output_audio_buffer.clear"]) }
        // Wait for response.done before creating the next response; watchdog repairs loss.
        speaking = false; pendingTool = false
    }
    func receive(_ data: Data) {
        guard let event = try? JSONSerialization.jsonObject(with: data) as? [String:Any], let type = event["type"] as? String else { return }
        if type.hasPrefix("response.") || type.hasPrefix("output_audio_buffer.") { lastEvent = Date() }
        if let id = event["response_id"] as? String, cancelled.contains(id), type != "response.done" { return }
        switch type {
        case "input_audio_buffer.speech_started":
            guard !muted, let item=event["item_id"] as? String else { return }
            evidence[item]=SpeechEvidence(started:Date(),overlapping:speaking || gate.responseActive,audioStartMS:event["audio_start_ms"] as? Double)
            message = "Ti ascolto anche mentre parlo"; changed?()
        case "input_audio_buffer.speech_stopped":
            guard !muted, let item=event["item_id"] as? String, var proof=evidence[item] else { return }
            if let end=event["audio_end_ms"] as? Double, let start=proof.audioStartMS { proof.duration=max(0,(end-start)/1000-1.0) }
            else { proof.duration=Date().timeIntervalSince(proof.started) }
            evidence[item]=proof; let run=generation, turn=gate.turn
            transcriptTimers[item]?.cancel()
            transcriptTimers[item]=Task { [weak self] in
                do { try await Task.sleep(for:.seconds(4)) } catch { return }
                guard let self, self.generation==run, self.gate.turn==turn, !self.muted, !self.answered.contains(item), !proof.overlapping, proof.seconds()>=0.7 else { return }
                self.answered.insert(item); self.evidence.removeValue(forKey:item)
                // Clarify instead of silently locking the turn when ASR fails. No tools.
                if !self.gate.responseActive && !self.speaking {
                    self.gate.begin(comment:true)
                    self.send(["type":"response.create","response":["tool_choice":"none","max_output_tokens":100,"instructions":"Hai ricevuto audio ma la trascrizione manca. Chiedi brevemente di ripetere, senza indovinare o usare strumenti, poi ascolta."]])
                }
                self.transcriptTimers.removeValue(forKey:item)
            }
        case "conversation.item.input_audio_transcription.delta":
            guard !muted, let item=event["item_id"] as? String, var proof=evidence[item] else { return }
            proof.partial += event["delta"] as? String ?? ""
            if !proof.interrupted, proof.overlapping, VoiceTurnGate.meaningful(proof.partial,duration:proof.seconds(),overlapping:true), speaking || gate.responseActive {
                interrupt(); proof.interrupted=true
            }
            evidence[item]=proof
        case "conversation.item.input_audio_transcription.completed":
            guard !muted, let item=event["item_id"] as? String else { return }
            transcriptTimers.removeValue(forKey:item)?.cancel()
            let proof=evidence.removeValue(forKey:item)
            if answered.contains(item) { return }
            let overlapping=proof?.overlapping ?? (speaking || gate.responseActive)
            guard let text=event["transcript"] as? String, gate.user(text,duration:proof?.seconds() ?? 0,overlapping:overlapping) else {
                send(["type":"conversation.item.delete","item_id":item]);return
            }
            answered.insert(item); if answered.count>100 { answered=[item] }
            heard=text; pendingAnnouncement=nil; recent.append(("user",String(text.prefix(1000)))); if recent.count>8 {recent.removeFirst()}
            jobs.values.forEach { $0.cancel() }; pendingUser=true
            if speaking || gate.responseActive { interrupt() }; flush()
        case "conversation.item.input_audio_transcription.failed":
            message="Non ho capito, puoi ripetere.";changed?()
        case "response.created":
            responseID = (event["response"] as? [String:Any])?["id"] as? String; gate.begin(); said = ""
        case "output_audio_buffer.started": speaking = true; state = .speaking; changed?()
        case "output_audio_buffer.stopped", "output_audio_buffer.cleared": speaking = false; state = muted ? .muted : .ready; flush(); changed?()
        case "response.output_audio_transcript.delta", "response.audio_transcript.delta":
            said += event["delta"] as? String ?? ""; if said.count > 2000 { said = String(said.suffix(2000)) }; changed?()
        case "response.function_call_arguments.done":
            guard gate.mayUseTools, gate.responseActive, let id = event["call_id"] as? String, !calls.contains(id), let name = event["name"] as? String, let args = event["arguments"] as? String else { return }
            calls.insert(id); let run = generation, turn = gate.turn
            jobs[id] = Task { [weak self] in
                guard let self else { return }
                let value = await self.onTool?(name,args) ?? ["accepted":false,"reason":"Strumento non disponibile."]
                guard self.generation == run else { return }
                let output = (try? JSONSerialization.data(withJSONObject: value)).flatMap { String(data:$0,encoding:.utf8) } ?? "{}"
                self.send(["type":"conversation.item.create","item":["type":"function_call_output","call_id":id,"output":output]])
                self.jobs.removeValue(forKey:id)
                if !Task.isCancelled && turn == self.gate.turn { self.pendingTool = true; self.flush() }
            }
        case "response.done":
            if !said.isEmpty, !(responseID.map {cancelled.contains($0)} ?? false) {recent.append(("assistant",String(said.prefix(1000))));if recent.count>8 {recent.removeFirst()}}
            gate.complete(); if !speaking { state = muted ? .muted : .ready }; flush(); changed?()
        case "error":
            let code = (event["error"] as? [String:Any])?["code"] as? String ?? ""
            if code == "response_cancel_not_active" { gate.complete(); flush() }
            else if code == "conversation_already_has_active_response" { gate.begin() }
            else { gate.complete(); state = muted ? .muted : .ready; message = "Risposta non disponibile. Riprova o riavvia la voce." }
            changed?()
        default: break
        }
    }
    func toggleMute() { muted.toggle(); track?.isEnabled = !muted; if muted { interrupt();pendingUser=false;pendingTool=false;evidence.removeAll();transcriptTimers.values.forEach {$0.cancel()};transcriptTimers.removeAll() }; state = muted ? .muted : .ready; if !muted { flush() }; changed?() }
    func stop(message: String = "Voce spenta") {
        desiredRunning=false;recovery?.cancel();recovery=nil;retryCount=0;interruptedBySystem=false;recent.removeAll()
        closeTransport(); heard="";said="";context=[:];muted=false; state = .off; self.message=message;changed?()
    }
    private func closeTransport() {
        generation = UUID(); timeout?.cancel();health?.cancel();health=nil; transcriptTimers.values.forEach {$0.cancel()};transcriptTimers.removeAll();evidence.removeAll();lastBytes=nil;stalledSince=nil; jobs.values.forEach { $0.cancel() }; jobs.removeAll(); channel?.close(); channel = nil; pc?.close(); pc = nil; track?.isEnabled = false; track = nil
        gate.reset(); calls.removeAll(); answered.removeAll(); cancelled.removeAll(); responseID = nil; pendingUser = false; pendingTool = false; speaking = false; greeted = false;pendingAnnouncement=nil
    }
    nonisolated func dataChannelDidChangeState(_ dataChannel: RTCDataChannel) {
        if dataChannel.readyState == .closed {
            Task { @MainActor [weak self] in guard self?.channel === dataChannel else { return }; self?.recover() }
            return
        }
        guard dataChannel.readyState == .open else { return }
        Task { @MainActor [weak self] in
            guard let self, self.channel === dataChannel, !self.greeted else { return }
            self.greeted = true; self.retryCount=0; self.startHealthMonitor(); self.updateContext(self.context); self.state = self.muted ? .muted : .ready
            self.send(["type":"session.update","session":["type":"realtime","audio":["input":["noise_reduction":["type":"near_field"],"turn_detection":["type":"server_vad","threshold":0.6,"prefix_padding_ms":350,"silence_duration_ms":650,"create_response":false,"interrupt_response":false]]]]])
            if !self.recent.isEmpty {
                for (role,text) in self.recent {self.send(["type":"conversation.item.create","item":["type":"message","role":role,"content":[["type":role == "user" ? "input_text" : "output_text","text":text]]]])}
                self.message="Ascolto ripristinato";self.changed?();return
            }
            self.gate.begin(comment:true)
            self.send(["type":"response.create","response":["tool_choice":"none","max_output_tokens":120,"instructions":"Presentati in italiano: Ciao, sono NEO. Cosa esploriamo insieme? Una frase, nessun tool, poi ascolta."]]); self.changed?()
        }
    }
    nonisolated func dataChannel(_ dataChannel: RTCDataChannel, didReceiveMessageWith buffer: RTCDataBuffer) { let data = buffer.data; Task { @MainActor [weak self] in guard self?.channel === dataChannel else { return }; self?.receive(data) } }
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCPeerConnectionState) { if stateChanged == .failed || stateChanged == .disconnected { Task { @MainActor [weak self] in guard self?.pc === peerConnection else { return }; self?.recover() } } }
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {}
    nonisolated func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceGatheringState) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {}
}
