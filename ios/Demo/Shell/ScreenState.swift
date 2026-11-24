import SwiftUI

struct LoadingState: View {
    var body: some View {
        ScreenCanvas {
            VStack(spacing: 8) {
                QcLoadingMark(label: "Loading")
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

struct ErrorState: View {
    @Environment(SessionStore.self) private var session
    let message: String
    let retry: () -> Void

    private var isSessionError: Bool {
        let text = message.lowercased()
        return text.contains("session ended") || text.contains("sign in again")
    }

    var body: some View {
        ScreenCanvas {
            VStack(spacing: 20) {
                Image(systemName: isSessionError ? "person.crop.circle.badge.exclamationmark" : "exclamationmark.triangle.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(.orange)
                    .padding(18)
                    .glassEffect(.regular, in: Circle())
                VStack(spacing: 6) {
                    Text(isSessionError ? "Session expired" : "Could not load")
                        .font(.title2.bold())
                    Text(sessionErrorDetail)
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                if isSessionError {
                    PrimaryButton(title: sessionErrorActionTitle) {
                        if AppShellContent.loadsRemoteMenus {
                            session.signOut()
                        } else {
                            Task {
                                _ = try? await session.ensureAnonymous()
                                retry()
                            }
                        }
                    }
                } else {
                    PrimaryButton(title: "Try again", action: retry)
                }
            }
            .padding(ShellMetrics.screenPadding)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .onAppear {
            // Portal: 401 → clear session so LoginView appears.
            // Storefront: remint anonymous JWT; never route to LoginView.
            if isSessionError, session.token != nil {
                if AppShellContent.loadsRemoteMenus {
                    session.signOut()
                } else {
                    Task { _ = try? await session.ensureAnonymous() }
                }
            }
        }
    }

    private var sessionErrorDetail: String {
        if !isSessionError { return PortalErrors.sanitize(message) }
        return AppShellContent.loadsRemoteMenus
            ? "Sign in again to continue."
            : "Reconnect to continue browsing."
    }

    private var sessionErrorActionTitle: String {
        AppShellContent.loadsRemoteMenus ? "Sign in" : "Try again"
    }
}

struct EmptyState: View {
    let title: String
    let actionTitle: String
    let action: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "tray")
                .font(.system(size: 36))
                .foregroundStyle(.secondary)
                .padding(18)
                .glassEffect(.regular, in: Circle())
            Text(title)
                .font(.title3.bold())
            Button(actionTitle, action: action)
                .buttonStyle(.glass)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(ShellMetrics.screenPadding)
    }
}
