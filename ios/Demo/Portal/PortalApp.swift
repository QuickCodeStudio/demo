import SwiftUI
import UIKit
import QuickCodeHTTP

@main
struct PortalApp: App {
    @State private var gate = AppGatewayGate(access: .password)

    var body: some Scene {
        WindowGroup {
            ZStack {
                if let session = gate.session {
                    PortalRootView()
                        .environment(session)
                        .environment(\.openGatewayPicker, gate.openPicker)
                        .portalShakeToReport()
                        .id(GatewayServer.url.absoluteString)
                } else {
                    Color.clear.ignoresSafeArea()
                }

                if gate.showingPicker {
                    GatewayEndpointPicker(
                        allowsDismissWithoutChange: gate.session != nil,
                        onConfirm: gate.confirm,
                        onCancel: gate.cancelPicker
                    )
                    .transition(.opacity)
                    .zIndex(10)
                }
            }
        }
    }
}

struct PortalRootView: View {
    @Environment(SessionStore.self) private var session
    @State private var splashVisible = true

    var body: some View {
        Group {
            if splashVisible {
                SplashView()
            } else if session.token == nil {
                LoginView()
            } else {
                PortalMenuView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .task {
            async let hold: Void = holdSplash()
            await session.restore()
            await hold
            splashVisible = false
        }
    }

    private func holdSplash() async {
        try? await Task.sleep(for: .milliseconds(2600))
    }
}
