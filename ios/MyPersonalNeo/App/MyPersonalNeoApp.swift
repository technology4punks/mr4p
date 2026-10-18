import SwiftUI

@main
struct MyPersonalNeoApp: App {
    @StateObject private var session = NeoSession()
    @Environment(\.scenePhase) private var scenePhase
    var body: some Scene {
        WindowGroup {
            NeoView().environmentObject(session).preferredColorScheme(.dark)
                .onChange(of: scenePhase) { _, phase in
                    if phase != .active { session.suspend() }
                }
        }
    }
}
