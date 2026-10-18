import Foundation

/// Audio capture remains enabled. VAD alone never interrupts or authorizes tools.
struct VoiceTurnGate {
    private(set) var turn = 0
    private(set) var responseActive = false
    private(set) var mayUseTools = false
    static func meaningful(_ text: String, duration: TimeInterval, overlapping: Bool) -> Bool {
        let words = text.lowercased().split { !$0.isLetter }.map(String.init)
        let fillers = Set(["ah","eh","ehm","uh","uhm","mm","hmm","mh","oh"])
        let useful = words.filter { !fillers.contains($0) }
        guard !useful.isEmpty, duration >= 0.18 else { return false }
        // Short intentional interruptions stay possible; a stray syllable or isolated
        // background word cannot stop speech. At rest, names and short answers are valid.
        let direct = Set(["stop","ferma","fermati","aspetta","basta","no","sì","si","neo","scusa"])
        if useful.count == 1 { return direct.contains(useful[0]) || (!overlapping && useful[0].count >= 2 && duration >= 0.28) }
        return useful.joined().count >= 5 && duration >= 0.32
    }
    mutating func user(_ text: String, duration: TimeInterval = 1, overlapping: Bool = false) -> Bool {
        guard Self.meaningful(text,duration:duration,overlapping:overlapping) else { return false }
        turn += 1; mayUseTools = true; return true
    }
    /// An untranscribed segment can request clarification, but cannot execute tools.
    mutating func mayAuthorizeAudio() { turn += 1; mayUseTools = false }
    mutating func begin(comment: Bool = false) { responseActive = true; if comment { mayUseTools = false } }
    mutating func complete() { responseActive = false }
    mutating func reset() { self = VoiceTurnGate() }
}

/// Item-scoped evidence survives asynchronous/late ASR and consecutive utterances.
struct SpeechEvidence {
    var started: Date
    var duration: TimeInterval?
    var overlapping: Bool
    var partial = ""
    var interrupted = false
    var audioStartMS: Double?
    func seconds(at now: Date = Date()) -> TimeInterval { duration ?? now.timeIntervalSince(started) }
}
