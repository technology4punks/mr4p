import Foundation
import simd

/// Kinematic step proposal. The AR adapter must verify floor support and a body-width sweep
/// before applying it. Unknown geometry never authorizes a move.
enum AvatarMotion {
    static let speed: Float = 0.42
    static let radius: Float = 0.25
    static func step(from: SIMD3<Float>, to: SIMD3<Float>, delta: Float) -> SIMD3<Float>? {
        guard from.x.isFinite, from.y.isFinite, from.z.isFinite, to.x.isFinite, to.y.isFinite, to.z.isFinite, delta.isFinite, delta > 0, abs(to.y-from.y)<0.12 else { return nil }
        let offset = SIMD3<Float>(to.x-from.x,0,to.z-from.z), distance = simd_length(offset)
        guard distance > 0.08, distance <= 3 else { return nil }
        return from + offset/distance * min(speed*min(delta,0.05),distance)
    }
    static func permitted(candidate: SIMD3<Float>, measuredFloor: SIMD3<Float>?, blocked: Bool) -> Bool {
        guard !blocked, let floor = measuredFloor else { return false }
        return simd_length(SIMD2<Float>(candidate.x-floor.x,candidate.z-floor.z)) < 0.08 && abs(candidate.y-floor.y) < 0.08
    }
}
