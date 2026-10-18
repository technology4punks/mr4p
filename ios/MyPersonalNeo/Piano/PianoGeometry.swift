import Foundation
import simd

struct PianoCalibration {
    let low: SIMD3<Float>
    let high: SIMD3<Float>
    let back: SIMD3<Float>
    let axis: SIMD3<Float>
    let depthAxis: SIMD3<Float>
    let up: SIMD3<Float>
    let width: Float
    let depth: Float
    init(low: SIMD3<Float>, high: SIMD3<Float>, back: SIMD3<Float>) throws {
        guard [low, high, back].allSatisfy({ $0.x.isFinite && $0.y.isFinite && $0.z.isFinite }) else { throw NeoFailure("Punti non validi.") }
        let width = simd_distance(low, high)
        guard (0.70...1.60).contains(width), abs(low.y - high.y) < 0.06 else { throw NeoFailure("Seleziona i centri di LA0 e DO8 sulla stessa tastiera a 88 tasti.") }
        let x = simd_normalize(high - low)
        let d = back - low - x * simd_dot(back - low, x)
        let depth = simd_length(d)
        guard (0.07...0.30).contains(depth) else { throw NeoFailure("Il terzo punto deve essere sul bordo posteriore di un tasto bianco, 7–30 cm dietro i primi due.") }
        let z = simd_normalize(d), up = simd_normalize(simd_cross(z, x))
        guard abs(up.y) > 0.90 else { throw NeoFailure("La tastiera deve essere orizzontale. Ripeti la calibrazione.") }
        self.low = low; self.high = high; self.back = back; self.axis = x; self.depthAxis = z; self.up = up.y > 0 ? up : -up; self.width = width; self.depth = depth
    }
    static let whitePitchClasses: Set<Int> = [0, 2, 4, 5, 7, 9, 11]
    static func isWhite(_ midi: Int) -> Bool { whitePitchClasses.contains(midi % 12) }
    static func whiteIndex(_ midi: Int) -> Float? {
        guard (21...108).contains(midi) else { return nil }
        let below = (21..<midi).filter { isWhite($0) }.count
        return isWhite(midi) ? Float(below) : Float(below) - 0.5
    }
    func key(_ midi: Int) -> SIMD3<Float>? {
        guard let index = Self.whiteIndex(midi) else { return nil }
        return low + axis * (width * index / 51) + depthAxis * (Self.isWhite(midi) ? 0 : depth * 0.50) + up * (Self.isWhite(midi) ? 0.004 : 0.015)
    }
    var middle: SIMD3<Float> { (low + high) / 2 }
    var seat: SIMD3<Float> { middle - depthAxis * 0.34 - up * 0.28 }
}
struct PianoNote: Equatable {
    let midi: Int
    let beat: Double
    let duration: Double
}
enum PianoScore {
    static func notes(_ name: String) -> [PianoNote]? {
        let values: [Int]
        switch name {
        case "c_major": values = [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60]
        case "ode_to_joy": values = [64,64,65,67,67,65,64,62,60,60,62,64,64,62,62]
        default: return nil
        }
        return values.enumerated().map { PianoNote(midi: $0.element, beat: Double($0.offset) * 0.65, duration: 0.50) }
    }
}
