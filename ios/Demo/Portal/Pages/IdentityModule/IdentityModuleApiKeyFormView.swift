import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleApiKeyFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var name = ""
    @State private var description = ""
    @State private var keyPrefix = ""
    @State private var keyHash = ""
    @State private var permissionGroupName = ""
    @State private var createdByUserId = ""
    @State private var status = "Active"
    @State private var isActive = false
    @State private var expiresAt = Date()
    @State private var lastUsedAt = Date()
    @State private var createdDate = Date()
    @State private var revokedDate = Date()
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
                    FieldLabel(label: "name") { TextField("name", text: $name) }
                    FieldLabel(label: "description") { TextField("description", text: $description) }
                    FieldLabel(label: "key Prefix") { TextField("key Prefix", text: $keyPrefix) }
                    FieldLabel(label: "key Hash") { TextField("key Hash", text: $keyHash) }
                    PortalForeignKeyField(label: "permission Group Name", module: "identity-module", model: "permission-groups", text: $permissionGroupName)
                    PortalForeignKeyField(label: "created By User", module: "identity-module", model: "asp-net-users", text: $createdByUserId)
                    SelectField(label: "status", options: [(id: "Active", name: "Active"), (id: "Revoked", name: "Revoked"), (id: "Expired", name: "Expired")], selection: $status)
                    SwitchField(label: "is Active", isOn: $isActive)
                    DateField(label: "expires At", date: $expiresAt)
                    DateField(label: "last Used At", date: $lastUsedAt)
                    DateField(label: "created Date", date: $createdDate)
                        .disabled(!keys.isEmpty)
                    DateField(label: "revoked Date", date: $revokedDate)
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
        .navigationTitle(keys.isEmpty ? "Api Keys" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ApiKeysInsert(body: .json(.init(value1: .init(
                id: "",
                name: name,
                description: description,
                keyPrefix: keyPrefix,
                keyHash: keyHash,
                permissionGroupName: permissionGroupName,
                createdByUserId: createdByUserId,
                status: .init(value1: { switch status {
case "Active": .Active
case "Revoked": .Revoked
case "Expired": .Expired
default: .Active
} }()),
                isActive: isActive,
                expiresAt: expiresAt,
                lastUsedAt: lastUsedAt,
                createdDate: createdDate,
                revokedDate: revokedDate
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ApiKeysUpdate(path: .init(id: keys[0]), body: .json(.init(value1: .init(
                id: keys[0],
                name: name,
                description: description,
                keyPrefix: keyPrefix,
                keyHash: keyHash,
                permissionGroupName: permissionGroupName,
                createdByUserId: createdByUserId,
                status: .init(value1: { switch status {
case "Active": .Active
case "Revoked": .Revoked
case "Expired": .Expired
default: .Active
} }()),
                isActive: isActive,
                expiresAt: expiresAt,
                lastUsedAt: lastUsedAt,
                createdDate: createdDate,
                revokedDate: revokedDate
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
            let output = try await client.ApiKeysGetItem(path: .init(id: keys[0]))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            name = item.name ?? ""
            description = item.description ?? ""
            keyPrefix = item.keyPrefix ?? ""
            keyHash = item.keyHash ?? ""
            permissionGroupName = item.permissionGroupName ?? ""
            createdByUserId = item.createdByUserId ?? ""
            status = item.status.map { String($0.value1.rawValue) } ?? "Active"
            isActive = item.isActive ?? false
            expiresAt = item.expiresAt ?? Date()
            lastUsedAt = item.lastUsedAt ?? Date()
            createdDate = item.createdDate ?? Date()
            revokedDate = item.revokedDate ?? Date()
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}