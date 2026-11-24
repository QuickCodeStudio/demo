import SwiftUI
import QuickCodeHTTP

private struct OpenGatewayPickerKey: EnvironmentKey {
    static let defaultValue: (() -> Void)? = nil
}

extension EnvironmentValues {
    var openGatewayPicker: (() -> Void)? {
        get { self[OpenGatewayPickerKey.self] }
        set { self[OpenGatewayPickerKey.self] = newValue }
    }
}

/// Debug-only gateway chooser. Release builds skip this and use Info.plist `GatewayURL`.
struct GatewayEndpointPicker: View {
    var allowsDismissWithoutChange = false
    var onConfirm: (URL) -> Void
    var onCancel: (() -> Void)?

    @Environment(\.colorScheme) private var colorScheme
    @State private var choice: Choice
    @State private var customText: String
    @State private var failure: String?

    private enum Choice: Hashable {
        case local
        case cloud
        case custom
    }

    init(
        allowsDismissWithoutChange: Bool = false,
        onConfirm: @escaping (URL) -> Void,
        onCancel: (() -> Void)? = nil
    ) {
        self.allowsDismissWithoutChange = allowsDismissWithoutChange
        self.onConfirm = onConfirm
        self.onCancel = onCancel
        let preferred = GatewayServer.preferredPickerURL.absoluteString
        let local = GatewayServer.localPresetURL.absoluteString
        let cloud = GatewayServer.cloudPresetURL.absoluteString
        if preferred == local {
            _choice = State(initialValue: .local)
            _customText = State(initialValue: "")
        } else if preferred == cloud {
            _choice = State(initialValue: .cloud)
            _customText = State(initialValue: "")
        } else {
            _choice = State(initialValue: .custom)
            _customText = State(initialValue: preferred)
        }
    }

    var body: some View {
        ZStack {
            Color.black.opacity(0.42)
                .ignoresSafeArea()
                .onTapGesture {
                    if allowsDismissWithoutChange {
                        onCancel?()
                    }
                }

            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Gateway")
                        .font(.title3.weight(.bold))
                        .foregroundStyle(Brand.text(colorScheme))
                    Text("Debug only — double-tap the QuickCode logo anytime to reopen this.")
                        .font(.subheadline)
                        .foregroundStyle(Brand.muted(colorScheme))
                        .fixedSize(horizontal: false, vertical: true)
                }

                VStack(spacing: 8) {
                    optionRow(
                        title: "Local",
                        subtitle: GatewayServer.localPresetURL.absoluteString,
                        selected: choice == .local
                    ) { choice = .local }

                    optionRow(
                        title: "Cloud",
                        subtitle: GatewayServer.cloudPresetURL.absoluteString,
                        selected: choice == .cloud
                    ) { choice = .cloud }

                    optionRow(
                        title: "Custom",
                        subtitle: "Device LAN IP, staging, etc.",
                        selected: choice == .custom
                    ) { choice = .custom }
                }

                if choice == .custom {
                    TextField("https://host or http://192.168.x.x:6260", text: $customText)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                        .textContentType(.URL)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(Brand.backgroundMuted(colorScheme).opacity(0.85))
                        )
                }

                if let failure {
                    Text(failure)
                        .font(.footnote)
                        .foregroundStyle(Color(hex: 0xFF7B72))
                }

                VStack(spacing: 10) {
                    Button(action: confirm) {
                        Text("Continue")
                            .font(.body.weight(.semibold))
                            .foregroundStyle(Color.primary.opacity(0.92))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background {
                                Capsule(style: .continuous)
                                    .fill(Color.primary.opacity(colorScheme == .dark ? 0.14 : 0.08))
                            }
                    }
                    .buttonStyle(.plain)

                    if allowsDismissWithoutChange || onCancel != nil {
                        Button {
                            onCancel?()
                        } label: {
                            Text("Cancel")
                                .font(.body.weight(.semibold))
                                .foregroundStyle(Brand.muted(colorScheme))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 22)
            .padding(.bottom, 16)
            .frame(maxWidth: 360)
            .glassEffect(
                .regular.tint(Color.primary.opacity(colorScheme == .dark ? 0.08 : 0.04)),
                in: RoundedRectangle(cornerRadius: 28, style: .continuous)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .strokeBorder(Color.white.opacity(colorScheme == .dark ? 0.18 : 0.35), lineWidth: 0.8)
            }
            .padding(.horizontal, 24)
        }
    }

    private func optionRow(
        title: String,
        subtitle: String,
        selected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(selected ? Brand.action : Brand.muted(colorScheme))
                    .padding(.top, 1)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(Brand.text(colorScheme))
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(Brand.muted(colorScheme))
                        .multilineTextAlignment(.leading)
                }
                Spacer(minLength: 0)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Brand.backgroundMuted(colorScheme).opacity(selected ? 0.95 : 0.55))
            }
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(
                        selected ? Brand.action.opacity(0.55) : Color.white.opacity(0.12),
                        lineWidth: selected ? 1.2 : 0.6
                    )
            }
        }
        .buttonStyle(.plain)
    }

    private func confirm() {
        let resolved: URL?
        switch choice {
        case .local:
            resolved = GatewayServer.localPresetURL
        case .cloud:
            resolved = GatewayServer.cloudPresetURL
        case .custom:
            let trimmed = customText.trimmingCharacters(in: .whitespacesAndNewlines)
            resolved = URL(string: trimmed)
            if trimmed.isEmpty || resolved?.scheme == nil || resolved?.host == nil {
                failure = "Enter a full URL, for example http://192.168.1.20:6260"
                return
            }
        }
        guard let resolved else {
            failure = "That endpoint URL is not valid."
            return
        }
        failure = nil
        onConfirm(resolved)
    }
}

/// Hosts Debug gateway selection before creating `SessionStore` (clients bind URL at init).
/// Picker is never forced on launch — open via double-tap on the QuickCode logo (Debug only).
@MainActor
@Observable
final class AppGatewayGate {
    let access: SessionAccess
    private(set) var session: SessionStore?
    var showingPicker: Bool
    private var relaunchPicker = false

    init(access: SessionAccess = .password) {
        self.access = access
        showingPicker = false
        session = SessionStore(access: access)
    }

    func confirm(_ url: URL) {
        let previous = session != nil ? GatewayServer.url.absoluteString : nil
        let changed = previous != url.absoluteString
        GatewayServer.setOverride(url)
        if changed || session == nil {
            if changed, session != nil {
                SessionStore.clearPersistedAuth()
            }
            session = SessionStore(access: access)
        }
        showingPicker = false
        relaunchPicker = false
    }

    func openPicker() {
        guard GatewayServer.allowsEndpointPicker else { return }
        relaunchPicker = session != nil
        showingPicker = true
    }

    func cancelPicker() {
        guard session != nil else {
            // First-run edge: allow dismiss only after a session exists.
            return
        }
        showingPicker = false
        relaunchPicker = false
    }
}

/// Tiny Debug-only host line under the logo (not a big card). Double-tap logo also opens the picker.
struct GatewayEndpointBadge: View {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.openGatewayPicker) private var openGatewayPicker

    var body: some View {
        if GatewayServer.allowsEndpointPicker, let openGatewayPicker {
            Button(action: openGatewayPicker) {
                HStack(spacing: 5) {
                    Image(systemName: "server.rack")
                        .font(.caption2.weight(.semibold))
                    Text(Self.shortHost)
                        .font(.caption2)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
                .foregroundStyle(Brand.muted(colorScheme).opacity(0.85))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Change gateway endpoint")
            .accessibilityHint("Double-tap the QuickCode logo to open the gateway picker")
        }
    }

    private static var shortHost: String {
        let url = GatewayServer.url
        if let host = url.host, let port = url.port {
            return "\(host):\(port)"
        }
        if let host = url.host {
            return host
        }
        return url.absoluteString
    }
}

/// Debug: double-tap opens the gateway picker. No-op in Release.
struct PortalGatewayDebugTapModifier: ViewModifier {
    @Environment(\.openGatewayPicker) private var openGatewayPicker

    func body(content: Content) -> some View {
        if GatewayServer.allowsEndpointPicker, let openGatewayPicker {
            content
                .onTapGesture(count: 2) {
                    openGatewayPicker()
                }
                .accessibilityHint("Double-tap to change gateway")
        } else {
            content
        }
    }
}

extension View {
    func portalGatewayDebugTap() -> some View {
        modifier(PortalGatewayDebugTapModifier())
    }
}
