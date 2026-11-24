import SwiftUI

struct ApiKeyView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.colorScheme) private var colorScheme
    @State private var apiKey = ""
    @State private var reveal = false
    @State private var busy = false
    @State private var failure: String?

    var body: some View {
        ScreenCanvas {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    VStack(alignment: .leading, spacing: 8) {
                        QcLoadingLogo(width: 230)
                            .portalGatewayDebugTap()
                        Text(ShellCopy.projectName)
                            .font(.title2.bold())
                            .foregroundStyle(Brand.text(colorScheme))
                        GatewayEndpointBadge()
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 12)

                    VStack(alignment: .leading, spacing: 18) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Connect")
                                .font(.title.bold())
                            Text("Enter the API key for \(ShellCopy.projectName).")
                                .foregroundStyle(Brand.muted(colorScheme))
                        }
                        GlassPanel {
                            FieldLabel(label: "API key") {
                                HStack {
                                    Group {
                                        if reveal {
                                            TextField("API key", text: $apiKey)
                                        } else {
                                            SecureField("API key", text: $apiKey)
                                        }
                                    }
                                    .textInputAutocapitalization(.never)
                                    .autocorrectionDisabled()
                                    .submitLabel(.go)
                                    .onSubmit { connect() }
                                    Button {
                                        reveal.toggle()
                                    } label: {
                                        Image(systemName: reveal ? "eye.slash" : "eye")
                                    }
                                    .buttonStyle(.plain)
                                    .foregroundStyle(Brand.muted(colorScheme))
                                    .accessibilityLabel(reveal ? "Hide API key" : "Show API key")
                                }
                            }
                        }
                        if let failure {
                            Text(failure)
                                .font(.footnote)
                                .foregroundStyle(.red)
                        }
                        PrimaryButton(title: busy ? "Connecting…" : "Continue") { connect() }
                            .disabled(busy || apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }
                .padding(ShellMetrics.screenPadding)
            }
            .scrollDismissesKeyboard(.interactively)
        }
    }

    private func connect() {
        let key = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty, !busy else { return }
        busy = true
        failure = nil
        Task {
            do {
                try await session.connect(apiKey: key)
            } catch {
                failure = PortalErrors.record(error)
            }
            busy = false
        }
    }
}

/// Settings → replace the stored API key without leaving the signed-in shell.
struct ApiKeySettingsView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.dismiss) private var dismiss
    @State private var apiKey = ""
    @State private var reveal = false
    @State private var busy = false
    @State private var failure: String?
    @State private var saved = false

    var body: some View {
        Form {
            Section {
                HStack {
                    Group {
                        if reveal {
                            TextField("API key", text: $apiKey)
                        } else {
                            SecureField("API key", text: $apiKey)
                        }
                    }
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    Button {
                        reveal.toggle()
                    } label: {
                        Image(systemName: reveal ? "eye.slash" : "eye")
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(Brand.muted(colorScheme))
                }
            } header: {
                Text("API key")
            } footer: {
                Text("Saved on this device. A default key is used until you change it.")
            }

            if let failure {
                Section {
                    Text(failure)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }

            if saved {
                Section {
                    Text("API key updated.")
                        .font(.footnote)
                        .foregroundStyle(Brand.action)
                }
            }

            Section {
                Button(busy ? "Saving…" : "Save API key") {
                    save()
                }
                .disabled(busy || apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .navigationTitle("API key")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            if apiKey.isEmpty {
                apiKey = KeychainStore.get("apiKey") ?? ""
            }
        }
    }

    private func save() {
        let key = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty, !busy else { return }
        busy = true
        failure = nil
        saved = false
        Task {
            do {
                try await session.connect(apiKey: key)
                saved = true
                try? await Task.sleep(for: .milliseconds(600))
                dismiss()
            } catch {
                failure = PortalErrors.record(error)
            }
            busy = false
        }
    }
}
