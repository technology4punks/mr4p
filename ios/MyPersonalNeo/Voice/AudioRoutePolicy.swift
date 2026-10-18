import AVFoundation

/// Device identity, independent of transient category/mode notifications.
struct AudioRouteSnapshot: Equatable {
    let inputs: [String]
    let outputs: [String]

    init(inputs: [String], outputs: [String]) {
        self.inputs = inputs.sorted()
        self.outputs = outputs.sorted()
    }

    init(_ route: AVAudioSessionRouteDescription) {
        self.init(
            inputs: route.inputs.map { $0.portType.rawValue + ":" + $0.uid },
            outputs: route.outputs.map { $0.portType.rawValue + ":" + $0.uid }
        )
    }
}

enum AudioRoutePolicy {
    static func observes(_ reason: AVAudioSession.RouteChangeReason) -> Bool {
        switch reason {
        case .newDeviceAvailable, .oldDeviceUnavailable, .override, .wakeFromSleep, .routeConfigurationChange:
            return true
        default:
            // setCategory and WebRTC's own session configuration emit categoryChange.
            // Reconfiguring in response creates an audio-session feedback loop.
            return false
        }
    }

    static func changed(from previous: AudioRouteSnapshot?, to current: AudioRouteSnapshot) -> Bool {
        previous != current
    }
}
