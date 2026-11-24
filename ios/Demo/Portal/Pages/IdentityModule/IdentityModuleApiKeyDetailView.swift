import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleApiKeyDetailView: View {
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
        .navigationTitle("Api Keys")

        .portalSafeRail(detailSafeRailActions, showsBack: true)
        .navigationDestination(isPresented: $openEditor) {
            IdentityModuleApiKeyFormView(keys: keys)
        }
        .portalDeleteConfirm(isPresented: $confirmDelete, onConfirm: { Task { await remove() } })

        .task { await load() }
    }

    private func load() async {
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ApiKeysGetItem(path: .init(id: keys[0]))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            let loaded = GatewayRow(
                    id: UUID().uuidString,
                    recordId: nil,
                    keys: [],
                    title: item.name ?? "",
                    subtitle: item.status.map { String($0.value1.rawValue) } ?? "",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: item.id ?? "", kind: .text, quiet: true),
                    PortalValue(id: "name", label: "Name", text: item.name ?? "", kind: .text),
                    PortalValue(id: "description", label: "Description", text: item.description ?? "", kind: .text),
                    PortalValue(id: "keyPrefix", label: "Key Prefix", text: item.keyPrefix ?? "", kind: .text),
                    PortalValue(id: "keyHash", label: "Key Hash", text: item.keyHash ?? "", kind: .text),
                    PortalValue(id: "permissionGroupName", label: "Permission Group Name", text: item.permissionGroupName ?? "", kind: .text),
                    PortalValue(id: "createdByUserId", label: "Created By User Id", text: item.createdByUserId ?? "", kind: .text, quiet: true),
                    PortalValue(id: "status", label: "Status", text: item.status.map { String($0.value1.rawValue) } ?? "", kind: .text),
                    PortalValue(id: "isActive", label: "Is Active", text: item.isActive.map { $0 ? "Yes" : "No" } ?? "", kind: .bool),
                    PortalValue(id: "expiresAt", label: "Expires At", text: item.expiresAt.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date),
                    PortalValue(id: "lastUsedAt", label: "Last Used At", text: item.lastUsedAt.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date),
                    PortalValue(id: "createdDate", label: "Created Date", text: item.createdDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date, quiet: true),
                    PortalValue(id: "revokedDate", label: "Revoked Date", text: item.revokedDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date)
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
        if access.allows("IdentityModuleApiKeys", "Delete") {
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
        if access.allows("IdentityModuleApiKeys", "Update") {
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
            let output = try await client.ApiKeysDelete(path: .init(id: keys[0]))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            toast.show("Deleted")
            dismiss()
        } catch {
            failure = PortalErrors.record(error)
        }
    }
}