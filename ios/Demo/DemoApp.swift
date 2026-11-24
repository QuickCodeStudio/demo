import SwiftUI
import QuickCodeHTTP

@main
struct DemoApp: App {
    /// Storefront: anonymous Public JWT (not Admin API key).
    @State private var gate = AppGatewayGate(access: .password)
    /// Bumps when the gateway picker closes so boot can retry (even if URL stayed the same).
    @State private var bootEpoch = 0

    var body: some Scene {
        WindowGroup {
            ZStack {
                if let session = gate.session {
                    RootView(bootEpoch: bootEpoch)
                        .environment(session)
                        .environment(\.openGatewayPicker, gate.openPicker)
                        .portalShakeToReport()
                        .id(GatewayServer.url.absoluteString + "-\(bootEpoch)")
                } else {
                    Color.clear.ignoresSafeArea()
                }

                if gate.showingPicker {
                    GatewayEndpointPicker(
                        allowsDismissWithoutChange: true,
                        onConfirm: { url in
                            gate.confirm(url)
                            bootEpoch += 1
                        },
                        onCancel: {
                            gate.cancelPicker()
                            bootEpoch += 1
                        }
                    )
                    .transition(.opacity)
                    .zIndex(10)
                }
            }
        }
    }
}

struct RootView: View {
    var bootEpoch: Int = 0

    @Environment(SessionStore.self) private var session
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.openGatewayPicker) private var openGatewayPicker
    @State private var splashVisible = true
    @State private var bootFailed = false
    @State private var retrying = false
    @State private var bootError: String?

    var body: some View {
        Group {
            if splashVisible {
                SplashView()
            } else if session.token == nil {
                // Storefront never shows Portal LoginView — anonymous JWT only.
                storefrontBootFailure
            } else {
                PortalMenuView()
            }
        }
        .task(id: bootEpoch) {
            await boot()
        }
    }

    private var storefrontBootFailure: some View {
        ScreenCanvas {
            VStack(spacing: 18) {
                QcLoadingMark(width: 72, label: retrying ? "Connecting…" : nil)
                    .portalGatewayDebugTap()
                if !retrying {
                    Text("Couldn't start browsing")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(Brand.text(colorScheme))
                    Text(bootError ?? "Check your connection and try again.")
                        .font(.subheadline)
                        .foregroundStyle(Brand.muted(colorScheme))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 12)
                    PrimaryButton(title: "Try again") {
                        Task { await retryBoot() }
                    }
                    .frame(maxWidth: 220)

                    if GatewayServer.allowsEndpointPicker, let openGatewayPicker {
                        VStack(spacing: 8) {
                            GatewayEndpointBadge()
                            Button("Change environment", action: openGatewayPicker)
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(Brand.action)
                                .buttonStyle(.plain)
                        }
                        .padding(.top, 6)
                    }
                }
            }
            .padding(ShellMetrics.screenPadding)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func boot() async {
        bootFailed = false
        bootError = nil
        splashVisible = true
        async let hold: Void = holdSplash()
        await session.restore()
        if session.token == nil {
            do {
                try await session.ensureAnonymous()
            } catch {
                bootFailed = true
                bootError = PortalErrors.sanitize(PortalErrors.record(error))
            }
        }
        await hold
        splashVisible = false
    }

    private func retryBoot() async {
        retrying = true
        defer { retrying = false }
        bootError = nil
        do {
            try await session.ensureAnonymous()
            bootFailed = session.token == nil
            if bootFailed {
                bootError = "Anonymous session was not created."
            }
        } catch {
            bootFailed = true
            bootError = PortalErrors.sanitize(PortalErrors.record(error))
        }
    }

    private func holdSplash() async {
        try? await Task.sleep(for: .milliseconds(bootEpoch == 0 ? 2600 : 400))
    }
}
