import XCTest
@testable import MyPersonalNeo

final class RoomScanPolicyTests: XCTestCase {
    func testInitialScanExpiresAndExplorationNeverAutomaticallyRescans() {
        var policy = RoomScanPolicy()
        XCTAssertEqual(policy.phase, .paused); XCTAssertFalse(policy.needsDepth)
        policy.start(now: 10)
        XCTAssertEqual(policy.phase, .scanning); XCTAssertEqual(policy.deadline, 16)
        XCTAssertTrue(policy.needsDepth); XCTAssertTrue(policy.needsPlanes)
        XCTAssertFalse(policy.advance(now: 15.9)); XCTAssertTrue(policy.advance(now: 16))
        XCTAssertEqual(policy.phase, .exploring); XCTAssertNil(policy.deadline)
        XCTAssertFalse(policy.needsDepth); XCTAssertFalse(policy.needsPlanes)
        XCTAssertFalse(policy.advance(now: 3600)); XCTAssertEqual(policy.phase, .exploring)
    }

    func testMeasurementCannotExtendScanOrItselfAndStopCancelsAllSensing() {
        var policy = RoomScanPolicy(); policy.start(now: 20)
        policy.measure(now: 25)
        XCTAssertEqual(policy.phase, .scanning); XCTAssertEqual(policy.deadline, 26)
        policy.endMeasurement(); XCTAssertEqual(policy.phase, .scanning)
        XCTAssertTrue(policy.advance(now: 26))
        policy.measure(now: 30); policy.measure(now: 30.8)
        XCTAssertEqual(policy.phase, .measuring); XCTAssertEqual(policy.deadline, 31)
        XCTAssertTrue(policy.needsDepth); XCTAssertFalse(policy.advance(now: 30.9))
        XCTAssertTrue(policy.advance(now: 31)); XCTAssertEqual(policy.phase, .exploring)
        policy.measure(now: 32); policy.endMeasurement()
        XCTAssertEqual(policy.phase, .exploring); XCTAssertNil(policy.deadline)
        policy.rescan(now: 40); XCTAssertEqual(policy.deadline, 46)
        policy.stop(); policy.measure(now: 50); policy.rescan(now: 50)
        XCTAssertEqual(policy.phase, .paused); XCTAssertNil(policy.deadline)
        XCTAssertFalse(policy.needsDepth); XCTAssertFalse(policy.advance(now: 60))
        policy.start(now: .nan); XCTAssertEqual(policy.phase, .paused)
    }

    func testCaptureCadenceRejectsBacklogAndTracksActualCaptureGaps() {
        var cadence = CaptureCadence()
        for i in 0...30 { _ = cadence.record(1 + Double(i) / 30) }
        XCTAssertEqual(cadence.fps, 30, accuracy: 0.001)
        XCTAssertEqual(cadence.latestTimestamp, 2)
        XCTAssertEqual(cadence.largestGap, 1.0 / 30, accuracy: 0.001)
        XCTAssertFalse(cadence.record(2)); XCTAssertFalse(cadence.record(1.5))
        XCTAssertFalse(cadence.record(.nan)); XCTAssertFalse(cadence.record(.infinity))
        XCTAssertFalse(cadence.record(0)); XCTAssertEqual(cadence.latestTimestamp, 2)
        XCTAssertTrue(cadence.record(4.5))
        XCTAssertEqual(cadence.largestGap, 2.5, accuracy: 0.001)
        XCTAssertEqual(cadence.fps, 0.4, accuracy: 0.001)
        cadence.reset(); XCTAssertNil(cadence.latestTimestamp)
        XCTAssertEqual(cadence.fps, 0); XCTAssertEqual(cadence.largestGap, 0)
    }
}
