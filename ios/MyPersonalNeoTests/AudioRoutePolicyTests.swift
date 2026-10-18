import XCTest
import AVFoundation
@testable import MyPersonalNeo

final class AudioRoutePolicyTests: XCTestCase {
    func testConfigurationNotificationsCannotReconfigureAudio() {
        XCTAssertFalse(AudioRoutePolicy.observes(.categoryChange))
        XCTAssertFalse(AudioRoutePolicy.observes(.unknown))
        XCTAssertFalse(AudioRoutePolicy.observes(.noSuitableRouteForCategory))
        XCTAssertTrue(AudioRoutePolicy.observes(.newDeviceAvailable))
        XCTAssertTrue(AudioRoutePolicy.observes(.oldDeviceUnavailable))
        XCTAssertTrue(AudioRoutePolicy.observes(.override))
        XCTAssertTrue(AudioRoutePolicy.observes(.routeConfigurationChange))
    }

    func testRepeatedNotificationsForSameDevicesNeedNoRefresh() {
        let builtIn = AudioRouteSnapshot(inputs:["mic:built-in"],outputs:["speaker:built-in"])
        let headphones = AudioRouteSnapshot(inputs:["mic:bluetooth"],outputs:["headphones:bluetooth"])
        XCTAssertFalse(AudioRoutePolicy.changed(from:builtIn,to:builtIn))
        XCTAssertTrue(AudioRoutePolicy.changed(from:builtIn,to:headphones))
        XCTAssertTrue(AudioRoutePolicy.changed(from:nil,to:builtIn))
        XCTAssertEqual(
            AudioRouteSnapshot(inputs:["b","a"],outputs:["d","c"]),
            AudioRouteSnapshot(inputs:["a","b"],outputs:["c","d"])
        )
    }
}
