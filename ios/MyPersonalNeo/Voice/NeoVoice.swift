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
    private var audioFallback = Set<String>()
    private var context: [String:Any] = [:]
    private var jobs: [String: Task<Void, Never>] = [:]
    private var pendingUser = false, pendingTool = false, speaking = false, greeted = false
    private var timeout: Task<Void, Never>?
    private var speechStart: Date?
    private var speechOverlapped = false
    private var lastEvent = Date()
    private var responseID: String?
    private var cancelled = Set<String>()
    private var transcriptTimer: Task<Void, Never>?
    private var observer: NSObjectProtocol?
    private var routeObserver: NSObjectProtocol?
    override init() {
        super.init()
        observer = NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.stop(message: "Audio interrotto da iOS. Premi Avvia voce per riprendere.") }
        }
        routeObserver = NotificationCenter.default.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main) { [weak self] notification in
            if let reason = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt, reason == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue {
                Task { @MainActor in self?.stop(message: "Dispositivo audio scollegato. Riavvia la voce.") }
            }
        }
    }
    func start(backend: NeoBackend) async {
        guard pc == nil else { return }
        let allowed = await withCheckedContinuation { continuation in AVAudioSession.sharedInstance().requestRecordPermission { continuation.resume(returning: $0) } }
        guard allowed else { state = .error; message = "Consenti il microfono nelle Impostazioni dell’iPhone."; changed?(); return }
        generation = UUID(); let run = generation
        state = .connecting; message = "Collego la conversazione…"; changed?()
        do {
            let audio = AVAudioSession.sharedInstance()
            try audio.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
            try audio.setActive(true)
            let token = try await backend.token()
            guard generation == run, token.expires_at > Date().timeIntervalSince1970 else { return }
            let configuration = RTCConfiguration(); configuration.sdpSemantics = .unifiedPlan
            let constraints = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: ["googEchoCancellation":"true", "googNoiseSuppression":"true", "googAutoGainControl":"true"])
            guard let peer = factory.peerConnection(with: configuration, constraints: constraints, delegate: self) else { throw NeoFailure("WebRTC non disponibile.") }
            pc = peer
            let source = factory.audioSource(with: constraints), audioTrack = factory.audioTrack(with: source, trackId: "neo-microphone")
            track = audioTrack; peer.add(audioTrack, streamIds: ["neo-audio"])
            channel = peer.dataChannel(forLabel: "oai-events", configuration: RTCDataChannelConfiguration()); channel?.delegate = self
            let offer: RTCSessionDescription = try await withCheckedThrowingContinuation { c in peer.offer(for: RTCMediaConstraints(mandatoryConstraints: ["OfferToReceiveAudio":"true"], optionalConstraints: nil)) { sdp,error in if let sdp { c.resume(returning: sdp) } else { c.resume(throwing: error ?? NeoFailure("Offerta audio non disponibile.")) } } }
            try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, Error>) in peer.setLocalDescription(offer) { error in if let error { c.resume(throwing: error) } else { c.resume() } } }
            var request = URLRequest(url: URL(string: "https://api.openai.com/v1/realtime/calls")!); request.httpMethod = "POST"; request.timeoutInterval = 25
            request.setValue("Bearer " + token.value, forHTTPHeaderField: "Authorization"); request.setValue("application/sdp", forHTTPHeaderField: "Content-Type"); request.httpBody = offer.sdp.data(using: .utf8)
            let (data,response) = try await URLSession.shared.data(for: request)
            guard generation == run else { return }
            guard (response as? HTTPURLResponse)?.statusCode == 201 || (response as? HTTPURLResponse)?.statusCode == 200, let answer = String(data: data, encoding: .utf8) else { throw NeoFailure("Connessione voce non riuscita. Controlla rete o credito API.") }
            try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void,Error>) in peer.setRemoteDescription(RTCSessionDescription(type: .answer,sdp: answer)) { error in if let error { c.resume(throwing: error) } else { c.resume() } } }
            timeout = Task { [weak self] in
                try? await Task.sleep(for: .seconds(30))
                guard let self, !Task.isCancelled, self.generation == run else { return }
                if self.channel?.readyState != .open { self.stop(message: "Connessione scaduta. Riavvia la voce.") }
                else { await self.watchdog(run) }
            }
        } catch { if generation == run { stop(message: error.localizedDescription); state = .error; changed?() } }
    }
    private func watchdog(_ run: UUID) async {
        while generation == run && !Task.isCancelled {
            try? await Task.sleep(for: .seconds(3))
            if gate.responseActive && Date().timeIntervalSince(lastEvent) > 35 {
                send(["type":"response.cancel"]); gate.complete(); speaking = false; flush(); state = muted ? .muted : .ready; message = "Risposta interrotta. Puoi ripetere la domanda."; changed?()
            }
        }
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
        guard !gate.responseActive, !speaking, !muted, pendingUser || pendingTool else { return }
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
    private func receive(_ data: Data) {
        guard let event = try? JSONSerialization.jsonObject(with: data) as? [String:Any], let type = event["type"] as? String else { return }
        if type.hasPrefix("response.") || type.hasPrefix("output_audio_buffer.") { lastEvent = Date() }
        if let id = event["response_id"] as? String, cancelled.contains(id), type != "response.done" { return }
        switch type {
        case "input_audio_buffer.speech_started": speechStart = Date(); speechOverlapped = speaking || gate.responseActive; message = "Sto ricevendo audio…"; changed?()
        case "input_audio_buffer.speech_stopped":
            let item = event["item_id"] as? String ?? UUID().uuidString
            let canRecover = !speechOverlapped && Date().timeIntervalSince(speechStart ?? Date()) >= 0.45
            transcriptTimer?.cancel(); let run = generation
            transcriptTimer = Task { [weak self] in
                try? await Task.sleep(for: .seconds(3))
                guard let self, !Task.isCancelled, self.generation == run else { return }
                // Preserve the committed audio for an audio-only answer when ASR is absent.
                if canRecover && !self.speaking && !self.answered.contains(item) { self.answered.insert(item); self.audioFallback.insert(item); self.pendingUser = true; self.gate.mayAuthorizeAudio(); self.flush() }
                self.message = "Se non ho capito, ripeti la domanda."; self.changed?()
            }
        case "conversation.item.input_audio_transcription.delta":
            if let text = event["delta"] as? String, text.range(of: "[\\p{L}]{2}", options: .regularExpression) != nil, speaking { interrupt() }
        case "conversation.item.input_audio_transcription.completed":
            transcriptTimer?.cancel()
            guard let text = event["transcript"] as? String, gate.user(text) else { state = muted ? .muted : .ready; changed?(); return }
            if let item=event["item_id"] as? String { if answered.contains(item) { heard=text;changed?();return }; answered.insert(item);if answered.count>100 {answered=[item]} }
            heard = text; jobs.values.forEach { $0.cancel() }; pendingUser = true
            if speaking || gate.responseActive { interrupt() }
            flush()
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
        case "response.done": gate.complete(); flush(); if !speaking { state = muted ? .muted : .ready }; changed?()
        case "error":
            let code = (event["error"] as? [String:Any])?["code"] as? String ?? ""
            if code == "response_cancel_not_active" { gate.complete(); flush() }
            else if code == "conversation_already_has_active_response" { gate.begin() }
            else { gate.complete(); state = muted ? .muted : .ready; message = "Risposta non disponibile. Riprova o riavvia la voce." }
            changed?()
        default: break
        }
    }
    func toggleMute() { muted.toggle(); track?.isEnabled = !muted; if muted { interrupt() }; state = muted ? .muted : .ready; if !muted { flush() }; changed?() }
    func stop(message: String = "Voce spenta") {
        generation = UUID(); timeout?.cancel(); transcriptTimer?.cancel(); jobs.values.forEach { $0.cancel() }; jobs.removeAll(); channel?.close(); channel = nil; pc?.close(); pc = nil; track?.isEnabled = false; track = nil
        gate.reset(); calls.removeAll(); answered.removeAll(); audioFallback.removeAll(); cancelled.removeAll(); responseID = nil; pendingUser = false; pendingTool = false; speaking = false; greeted = false; muted = false; state = .off; self.message = message; changed?()
    }
    nonisolated func dataChannelDidChangeState(_ dataChannel: RTCDataChannel) {
        if dataChannel.readyState == .closed {
            Task { @MainActor [weak self] in guard self?.channel === dataChannel else { return }; self?.stop(message:"Canale voce chiuso. Premi Avvia voce per riconnettere.") }
            return
        }
        guard dataChannel.readyState == .open else { return }
        Task { @MainActor [weak self] in
            guard let self, self.channel === dataChannel, !self.greeted else { return }
            self.greeted = true; self.updateContext(self.context); self.state = .ready; self.gate.begin(comment:true)
            self.send(["type":"response.create","response":["tool_choice":"none","max_output_tokens":120,"instructions":"Presentati in italiano: Ciao, sono NEO. Cosa esploriamo insieme? Una frase, nessun tool, poi ascolta."]]); self.changed?()
        }
    }
    nonisolated func dataChannel(_ dataChannel: RTCDataChannel, didReceiveMessageWith buffer: RTCDataBuffer) { let data = buffer.data; Task { @MainActor [weak self] in guard self?.channel === dataChannel else { return }; self?.receive(data) } }
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCPeerConnectionState) { if stateChanged == .failed || stateChanged == .disconnected { Task { @MainActor [weak self] in guard self?.pc === peerConnection else { return }; self?.stop(message:"Rete audio interrotta. Riavvia la voce.") } } }
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
