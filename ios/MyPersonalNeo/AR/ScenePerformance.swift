import Foundation

/// Measures scene-update cadence (not GPU time). Rendering/head tracking stays independent
/// of the reduced joint-animation rate. All diagnostics remain in the hidden controls.
struct ScenePerformance {
    private var elapsed: Double = 0
    private var frames = 0
    private var slowWindows = 0
    private(set) var fps: Double = 0
    private(set) var animationHz: Double = 30
    mutating func observe(_ delta: Double) -> Bool {
        guard delta.isFinite, delta > 0 else { return false }
        elapsed += delta;frames += 1
        guard elapsed >= 1 else { return false }
        fps=Double(frames)/elapsed
        slowWindows = fps < 40 ? slowWindows+1 : 0
        if slowWindows>=2 {animationHz=20}
        if fps>52 {animationHz=30}
        elapsed=0;frames=0;return true
    }
}
