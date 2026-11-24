import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModulePortalPageAccessGrantFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var permissionGroupName = ""
    @State private var portalPageDefinitionKey = ""
    @State private var pageAction = "List"
    @State private var modifiedBy = "System"
    @State private var isActive = false
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
                    PortalForeignKeyField(label: "permission Group Name", module: "identity-module", model: "permission-groups", text: $permissionGroupName)
                        .disabled(!keys.isEmpty)
                    PortalForeignKeyField(label: "portal Page Definition Key", module: "identity-module", model: "portal-page-definitions", text: $portalPageDefinitionKey)
                        .disabled(!keys.isEmpty)
                    SelectField(label: "page Action", options: [(id: "List", name: "List"), (id: "Detail", name: "Detail"), (id: "Insert", name: "Insert"), (id: "Update", name: "Update"), (id: "Delete", name: "Delete")], selection: $pageAction)
                    SelectField(label: "modified By", options: [(id: "System", name: "System"), (id: "User", name: "User"), (id: "UserDisabled", name: "User Disabled")], selection: $modifiedBy)
                        .disabled(!keys.isEmpty)
                    SwitchField(label: "is Active", isOn: $isActive)
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
        .navigationTitle(keys.isEmpty ? "Portal Page Access Grants" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PortalPageAccessGrantsInsert(body: .json(.init(value1: .init(
                permissionGroupName: permissionGroupName,
                portalPageDefinitionKey: portalPageDefinitionKey,
                pageAction: .init(value1: { switch pageAction {
case "List": .List
case "Detail": .Detail
case "Insert": .Insert
case "Update": .Update
case "Delete": .Delete
default: .List
} }()),
                modifiedBy: .init(value1: { switch modifiedBy {
case "System": .System
case "User": .User
case "UserDisabled": .UserDisabled
default: .System
} }()),
                isActive: isActive
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PortalPageAccessGrantsUpdate(path: .init(permissionGroupName: keys[0], portalPageDefinitionKey: keys[1], pageAction: .init(value1: { switch keys[2] {
case "List": .List
case "Detail": .Detail
case "Insert": .Insert
case "Update": .Update
case "Delete": .Delete
default: .List
} }())), body: .json(.init(value1: .init(
                permissionGroupName: keys[0],
                portalPageDefinitionKey: keys[1],
                pageAction: .init(value1: { switch keys[2] {
case "List": .List
case "Detail": .Detail
case "Insert": .Insert
case "Update": .Update
case "Delete": .Delete
default: .List
} }()),
                modifiedBy: .init(value1: { switch modifiedBy {
case "System": .System
case "User": .User
case "UserDisabled": .UserDisabled
default: .System
} }()),
                isActive: isActive
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
            let output = try await client.PortalPageAccessGrantsGetItem(path: .init(permissionGroupName: keys[0], portalPageDefinitionKey: keys[1], pageAction: .init(value1: { switch keys[2] {
case "List": .List
case "Detail": .Detail
case "Insert": .Insert
case "Update": .Update
case "Delete": .Delete
default: .List
} }())))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            permissionGroupName = item.permissionGroupName ?? ""
            portalPageDefinitionKey = item.portalPageDefinitionKey ?? ""
            pageAction = item.pageAction.map { String($0.value1.rawValue) } ?? "List"
            modifiedBy = item.modifiedBy.map { String($0.value1.rawValue) } ?? "System"
            isActive = item.isActive ?? false
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}