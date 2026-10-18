import Foundation

/// Bounded sensing windows. Exploring keeps world tracking but requests neither
/// continuous depth nor plane discovery; observation cannot silently restart a scan.
struct RoomScanPolicy {
    enum Phase { case paused, scanning, exploring, measuring }
    private(set) var phase: Phase = .paused
    private(set) var deadline: Double?
    var needsDepth: Bool { phase == .scanning || phase == .measuring }
    var needsPlanes: Bool { needsDepth }

    mutating func start(now: Double, duration:Double = 6) {
        guard valid(now) else { return }
        phase = .scanning; deadline = now + max(1,min(30,duration))
    }
    mutating func rescan(now: Double) {
        guard phase != .paused else { return }
        start(now: now)
    }
    mutating func measure(now: Double) {
        guard phase == .exploring, valid(now) else { return }
        phase = .measuring; deadline = now + 1
    }
    @discardableResult mutating func advance(now: Double) -> Bool {
        guard valid(now), let deadline, now >= deadline,
              phase == .scanning || phase == .measuring else { return false }
        phase = .exploring; self.deadline = nil; return true
    }
    mutating func finishScan() {
        guard phase == .scanning else {return}
        phase = .exploring;deadline=nil
    }
    mutating func endMeasurement() {
        guard phase == .measuring else { return }
        phase = .exploring; deadline = nil
    }
    mutating func stop() { phase = .paused; deadline = nil }
    private func valid(_ now: Double) -> Bool { now.isFinite && now >= 0 }
}

/// Camera capture timestamps, rather than UI callback arrival time. Stale queued
/// frames do not move this clock backwards or inflate its FPS calculation.
struct CaptureCadence {
    private(set) var fps: Double = 0
    private(set) var latestTimestamp: Double?
    private(set) var largestGap: Double = 0
    private var windowStart: Double?
    private var intervals = 0

    @discardableResult mutating func record(_ timestamp: Double) -> Bool {
        guard timestamp.isFinite, timestamp > 0 else { return false }
        if let latestTimestamp {
            guard timestamp > latestTimestamp else { return false }
            largestGap = max(largestGap, timestamp - latestTimestamp)
        }
        latestTimestamp = timestamp
        guard let windowStart else { self.windowStart = timestamp; return false }
        intervals += 1
        let elapsed = timestamp - windowStart
        guard elapsed >= 1 else { return false }
        fps = Double(intervals) / elapsed
        self.windowStart = timestamp; intervals = 0; return true
    }
    mutating func reset() { self = CaptureCadence() }
}
