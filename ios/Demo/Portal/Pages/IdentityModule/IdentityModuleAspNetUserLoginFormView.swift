import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleAspNetUserLoginFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var loginProvider = ""
    @State private var providerKey = ""
    @State private var providerDisplayName = ""
    @State private var userId = ""
    @State private var busy = false
    @State private var failure: String?

    private var ready: Bool { true }

    var body: some View {
                Group {
            if !keys.isEmpty, !loaded {
                LoadingState()
            } else {ScreenCanvas {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    FieldLabel(label: "login Provider") { TextField("login Provider", text: $loginProvider) }
                    FieldLabel(label: "provider Key") { TextField("provider Key", text: $providerKey) }
                    FieldLabel(label: "provider Display Name") { TextField("provider Display Name", text: $providerDisplayName) }
                    PortalForeignKeyField(label: "user", module: "identity-module", model: "asp-net-users", text: $userId)
                    if let failure {
                        Text(failure).foregroundStyle(.red)
                    }
                    PrimaryButton(title: busy ? "Saving…" : "Save") { Task { await save() } }
                        .disabled(busy || !ready)
                }
                .padding(ShellMetrics.screenPadding)
            }
        }
            }
        }
        .navigationTitle(keys.isEmpty ? "Asp Net User Logins" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.AspNetUserLoginsInsert(body: .json(.init(value1: .init(
                loginProvider: loginProvider,
                providerKey: providerKey,
                providerDisplayName: providerDisplayName,
                userId: userId
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.AspNetUserLoginsUpdate(path: .init(loginProvider: keys[0], providerKey: keys[1]), body: .json(.init(value1: .init(
                loginProvider: keys[0],
                providerKey: keys[1],
                providerDisplayName: providerDisplayName,
                userId: userId
            ))))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            }
            toast.show("Saved")
            dismiss()
        } catch {
            failure = PortalErrors.record(error)
        }
        busy = false
    }

    private func loadExisting() async {
        guard !keys.isEmpty, !loaded else {
            loaded = true
            return
        }
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.AspNetUserLoginsGetItem(path: .init(loginProvider: keys[0], providerKey: keys[1]))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            loginProvider = item.loginProvider ?? ""
            providerKey = item.providerKey ?? ""
            providerDisplayName = item.providerDisplayName ?? ""
            userId = item.userId ?? ""
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}