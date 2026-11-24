import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModulePortalPageAccessGrantDetailView: View {
    let keys: [String]
    @Environment(SessionStore.self) private var session
    @Environment(PortalAccess.self) private var access
    @State private var row: GatewayRow?
    @State private var loading = true
    @State private var failure: String?
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    @State private var confirmDelete = false

    @State private var openEditor = false

    var body: some View {
        Group {
            if loading, row == nil, failure == nil {
                LoadingState()
            } else if let failure, row == nil {
                ErrorState(message: failure, retry: { Task { await load() } })
            } else if let row {
                ScreenCanvas {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            PortalRecordHeader(title: row.title, subtitle: row.subtitle, image: row.image)
                            PortalValueList(values: row.fields)
                        }
                        .padding(.vertical, ShellMetrics.screenPadding)
                        .padding(.horizontal, ShellMetrics.screenPadding)
                    }
                }
            }
        }
        .navigationTitle("Portal Page Access Grants")

        .portalSafeRail(detailSafeRailActions, showsBack: true)
        .navigationDestination(isPresented: $openEditor) {
            IdentityModulePortalPageAccessGrantFormView(keys: keys)
        }
        .portalDeleteConfirm(isPresented: $confirmDelete, onConfirm: { Task { await remove() } })

        .task { await load() }
    }

    private func load() async {
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
            let loaded = GatewayRow(
                    id: UUID().uuidString,
                    recordId: nil,
                    keys: [],
                    title: item.pageAction.map { String($0.value1.rawValue) } ?? "",
                    subtitle: item.isActive.map { $0 ? "Yes" : "No" } ?? "",
                    image: nil,
                    fields: [
                    PortalValue(id: "permissionGroupName", label: "Permission Group Name", text: item.permissionGroupName ?? "", kind: .text),
                    PortalValue(id: "portalPageDefinitionKey", label: "Portal Page Definition Key", text: item.portalPageDefinitionKey ?? "", kind: .text),
                    PortalValue(id: "pageAction", label: "Page Action", text: item.pageAction.map { String($0.value1.rawValue) } ?? "", kind: .text),
                    PortalValue(id: "modifiedBy", label: "Modified By", text: item.modifiedBy.map { String($0.value1.rawValue) } ?? "", kind: .text, quiet: true),
                    PortalValue(id: "isActive", label: "Is Active", text: item.isActive.map { $0 ? "Yes" : "No" } ?? "", kind: .bool)
                    ]
                )
            row = await PortalRefEnricher.enrich(loaded, module: "identity-module", session: session)
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private var detailSafeRailActions: [PortalSafeRail.Action] {
        var items: [PortalSafeRail.Action] = []
        if access.allows("IdentityModulePortalPageAccessGrants", "Delete") {
            items.append(
                PortalSafeRail.Action(
                    id: "delete",
                    systemName: "trash",
                    role: .destructive,
                    accessibilityLabel: "Delete",
                    perform: { confirmDelete = true }
                )
            )
        }
        if access.allows("IdentityModulePortalPageAccessGrants", "Update") {
            items.append(
                PortalSafeRail.Action(
                    id: "edit",
                    systemName: "pencil",
                    accessibilityLabel: "Edit",
                    perform: { openEditor = true }
                )
            )
        }
        return items
    }

    private func remove() async {
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PortalPageAccessGrantsDelete(path: .init(permissionGroupName: keys[0], portalPageDefinitionKey: keys[1], pageAction: .init(value1: { switch keys[2] {
case "List": .List
case "Detail": .Detail
case "Insert": .Insert
case "Update": .Update
case "Delete": .Delete
default: .List
} }())))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            toast.show("Deleted")
            dismiss()
        } catch {
            failure = PortalErrors.record(error)
        }
    }
}