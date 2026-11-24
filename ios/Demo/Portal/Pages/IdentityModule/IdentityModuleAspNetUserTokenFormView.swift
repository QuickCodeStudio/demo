import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleAspNetUserTokenFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var userId = ""
    @State private var loginProvider = ""
    @State private var name = ""
    @State private var value = ""
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
                    PortalForeignKeyField(label: "user", module: "identity-module", model: "asp-net-users", text: $userId)
                        .disabled(!keys.isEmpty)
                    FieldLabel(label: "login Provider") { TextField("login Provider", text: $loginProvider) }
                    FieldLabel(label: "name") { TextField("name", text: $name) }
                    FieldLabel(label: "value") { TextField("value", text: $value) }
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
        .navigationTitle(keys.isEmpty ? "Asp Net User Tokens" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.AspNetUserTokensInsert(body: .json(.init(value1: .init(
                userId: userId,
                loginProvider: loginProvider,
                name: name,
                value: value
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.AspNetUserTokensUpdate(path: .init(userId: keys[0]), body: .json(.init(value1: .init(
                userId: keys[0],
                loginProvider: loginProvider,
                name: name,
                value: value
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
            let output = try await client.AspNetUserTokensGetItem(path: .init(userId: keys[0]))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            userId = item.userId ?? ""
            loginProvider = item.loginProvider ?? ""
            name = item.name ?? ""
            value = item.value ?? ""
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}