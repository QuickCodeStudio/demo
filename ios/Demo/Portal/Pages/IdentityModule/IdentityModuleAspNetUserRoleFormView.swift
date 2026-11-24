import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleAspNetUserRoleFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var userId = ""
    @State private var roleId = ""
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
                    PortalForeignKeyField(label: "role", module: "identity-module", model: "asp-net-roles", text: $roleId)
                        .disabled(!keys.isEmpty)
                    if let failure {
                        Text(failure).foregroundStyle(.red)
                    }
                    if keys.isEmpty {
                        PrimaryButton(title: busy ? "Saving…" : "Save") { Task { await save() } }
                            .disabled(busy || !ready)
                    } else {
                        Text("These fields identify the record and can’t be changed. Delete this link and create a new one to pick different values.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(ShellMetrics.screenPadding)
            }
        }
            }
        }
        .navigationTitle(keys.isEmpty ? "Asp Net User Roles" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.AspNetUserRolesInsert(body: .json(.init(value1: .init(
                userId: userId,
                roleId: roleId
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.AspNetUserRolesUpdate(path: .init(userId: keys[0], roleId: keys[1]), body: .json(.init(value1: .init(
                userId: keys[0],
                roleId: keys[1]
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
            let output = try await client.AspNetUserRolesGetItem(path: .init(userId: keys[0], roleId: keys[1]))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            userId = item.userId ?? ""
            roleId = item.roleId ?? ""
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}