import AVFoundation

/// Local, labelled synthesized sound; does not claim to actuate an acoustic piano.
@MainActor
final class PianoSound {
    private var players: [AVAudioPlayer] = []
    func note(_ midi: Int) {
        let rate = 24000, count = 14400
        let frequency = 440.0 * pow(2, Double(midi - 69) / 12)
        var pcm = Data(capacity: count * 2)
        for n in 0..<count {
            let t = Double(n) / Double(rate)
            let attack = min(1, t / 0.008), release = min(1, Double(count - n) / 1200)
            let signal = (sin(2 * .pi * frequency * t) + 0.20 * sin(4 * .pi * frequency * t)) * exp(-4 * t) * attack * release * 0.25
            var sample = Int16(signal * 32767).littleEndian
            withUnsafeBytes(of: &sample) { pcm.append(contentsOf: $0) }
        }
        var wav = Data()
        func text(_ value: String) { wav.append(contentsOf: value.utf8) }
        func u32(_ value: Int) { var n = UInt32(value).littleEndian; withUnsafeBytes(of: &n) { wav.append(contentsOf: $0) } }
        func u16(_ value: Int) { var n = UInt16(value).littleEndian; withUnsafeBytes(of: &n) { wav.append(contentsOf: $0) } }
        text("RIFF"); u32(36 + pcm.count); text("WAVEfmt "); u32(16); u16(1); u16(1); u32(rate); u32(rate * 2); u16(2); u16(16); text("data"); u32(pcm.count); wav.append(pcm)
        players.removeAll { !$0.isPlaying }
        if let player = try? AVAudioPlayer(data: wav) { player.volume = 0.35; player.play(); players.append(player) }
    }
    func stop() { players.forEach { $0.stop() }; players.removeAll() }
}
