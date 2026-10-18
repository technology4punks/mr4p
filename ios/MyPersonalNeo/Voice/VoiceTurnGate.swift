import Foundation

/// Recognition, not a VAD noise event, authorizes interruption and tools.
struct VoiceTurnGate {
    private(set) var turn = 0
    private(set) var responseActive = false
    private(set) var mayUseTools = false
    mutating func user(_ text: String) -> Bool {
        let words = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard words.count >= 2, words.range(of: "[\\p{L}]{2}", options: .regularExpression) != nil else { return false }
        turn += 1; mayUseTools = true; return true
    }
    mutating func mayAuthorizeAudio() { turn += 1; mayUseTools = true }
    mutating func begin(comment: Bool = false) { responseActive = true; if comment { mayUseTools = false } }
    mutating func complete() { responseActive = false }
    mutating func reset() { self = VoiceTurnGate() }
}
