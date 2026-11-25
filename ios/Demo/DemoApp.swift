import SwiftUI

@main
struct DemoApp: App {
    /// Storefront: anonymous Public JWT (not Admin API key).
    @State private var session = SessionStore(access: .password)

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
        }
    }
}

struct RootView: View {
    @Environment(SessionStore.self) private var session
    @State private var splashVisible = true

    var body: some View {
        Group {
            if splashVisible {
                SplashView()
            } else if session.token == nil {
                // Anon mint failed — allow account login as fallback.
                LoginView()
            } else {
                // Same shell as Portal; AppShellContent supplies analysis / curated screens.
                PortalMenuView()
            }
        }
        .task {
            async let hold: Void = holdSplash()
            await session.restore()
            if session.token == nil {
                try? await session.ensureAnonymous()
            }
            await hold
            splashVisible = false
        }
    }

    private func holdSplash() async {
        try? await Task.sleep(for: .milliseconds(2600))
    }
}
