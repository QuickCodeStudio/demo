import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleRefreshTokenFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var userId = ""
    @State private var token = ""
    @State private var expiryDate = Date()
    @State private var createdDate = Date()
    @State private var isRevoked = false
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
                    FieldLabel(label: "token") { TextField("token", text: $token) }
                    DateField(label: "expiry Date", date: $expiryDate)
                    DateField(label: "created Date", date: $createdDate)
                        .disabled(!keys.isEmpty)
                    SwitchField(label: "is Revoked", isOn: $isRevoked)
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
        .navigationTitle(keys.isEmpty ? "Refresh Tokens" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.RefreshTokensInsert(body: .json(.init(value1: .init(
                id: 0,
                userId: userId,
                token: token,
                expiryDate: expiryDate,
                createdDate: createdDate,
                isRevoked: isRevoked
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.RefreshTokensUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(value1: .init(
                id: Int32(keys[0]) ?? 0,
                userId: userId,
                token: token,
                expiryDate: expiryDate,
                createdDate: createdDate,
                isRevoked: isRevoked
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
            let output = try await client.RefreshTokensGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            userId = item.userId ?? ""
            token = item.token ?? ""
            expiryDate = item.expiryDate ?? Date()
            createdDate = item.createdDate ?? Date()
            isRevoked = item.isRevoked ?? false
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}