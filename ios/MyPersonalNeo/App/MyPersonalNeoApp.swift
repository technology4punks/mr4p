import SwiftUI

@main
struct MyPersonalNeoApp: App {
    var body: some Scene {
        WindowGroup {
            // Hosted core/asset tests must not start an unavailable simulator AR session.
            if ProcessInfo.processInfo.environment["NEO_UNIT_TESTING"] == "1" {
                Color.black.ignoresSafeArea()
            } else {
                NeoAppRoot()
            }
        }
    }
}
private struct NeoAppRoot: View {
    @StateObject private var session = NeoSession()
    @Environment(\.scenePhase) private var scenePhase
    var body: some View {
        NeoView().environmentObject(session).preferredColorScheme(.dark)
            .onChange(of: scenePhase) { _, phase in
                if phase != .active { session.suspend() }
            }
    }
}
