import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleAspNetUserClaimFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var userId = ""
    @State private var claimType = ""
    @State private var claimValue = ""
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
                    FieldLabel(label: "claim Type") { TextField("claim Type", text: $claimType) }
                    FieldLabel(label: "claim Value") { TextField("claim Value", text: $claimValue) }
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
        .navigationTitle(keys.isEmpty ? "Asp Net User Claims" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.AspNetUserClaimsInsert(body: .json(.init(value1: .init(
                id: 0,
                userId: userId,
                claimType: claimType,
                claimValue: claimValue
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.AspNetUserClaimsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(value1: .init(
                id: Int32(keys[0]) ?? 0,
                userId: userId,
                claimType: claimType,
                claimValue: claimValue
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
            let output = try await client.AspNetUserClaimsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            userId = item.userId ?? ""
            claimType = item.claimType ?? ""
            claimValue = item.claimValue ?? ""
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}