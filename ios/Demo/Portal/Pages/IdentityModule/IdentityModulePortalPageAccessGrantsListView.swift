import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModulePortalPageAccessGrantsListView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalAccess.self) private var access
    @Environment(PortalToast.self) private var toast
    @State private var rows: [GatewayRow] = []
    @State private var pageNumber = 1
    @State private var totalCount: Int?
    @State private var search = ""
    @State private var editing = false
    @State private var editKeys: [String] = []
    @State private var creating = false
    @State private var deleteKeys: [String]?
    @State private var confirmDelete = false
    @State private var loading = true
    @State private var failure: String?

    private var visible: [GatewayRow] {
        let needle = search.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !needle.isEmpty else { return rows }
        return rows.filter { row in
            if row.title.localizedStandardContains(needle) || row.subtitle.localizedStandardContains(needle) {
                return true
            }
            return row.fields.contains { $0.text.localizedStandardContains(needle) || $0.label.localizedStandardContains(needle) }
        }
    }

    var body: some View {
        Group {
            if loading, rows.isEmpty, failure == nil {
                LoadingState()
            } else if let failure, rows.isEmpty {
                ErrorState(message: failure, retry: { Task { await load() } })
            } else {
                ScreenCanvas {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 12) {
                            PortalSearchField(text: $search)
                            PortalListSummary(page: pageNumber, rowCount: rows.count, totalCount: totalCount)
                            if visible.isEmpty {
                                EmptyState(title: "No records", actionTitle: "Try again") { Task { await load() } }
                            } else {
                                ForEach(visible) { row in
                                    PortalSwipeRow(
                                        allowsEdit: access.allows("IdentityModulePortalPageAccessGrants", "Update"),
                                        allowsDelete: access.allows("IdentityModulePortalPageAccessGrants", "Delete"),
                                        onEdit: {
                                            editKeys = row.keys
                                            editing = true
                                        },
                                        onDelete: {
                                            deleteKeys = row.keys
                                            confirmDelete = true
                                        }
                                    ) {
                                        NavigationLink(value: row.keys) { rowCard(row) }.buttonStyle(.plain)
                                    }
                                }
                            }
                            PortalListPager(
                                page: pageNumber,
                                rowCount: rows.count,
                                totalCount: totalCount,
                                loading: loading,
                                onSelect: { next in
                                    guard next != pageNumber else { return }
                                    pageNumber = next
                                    Task { await load() }
                                }
                            )
                        }
                        .padding(.vertical, ShellMetrics.screenPadding)
                        .padding(.horizontal, ShellMetrics.screenPadding)
                    }
                }
            }
        }
        .navigationTitle("Portal Page Access Grants")
        .navigationBarTitleDisplayMode(.large)
                .navigationDestination(for: [String].self) { keys in
                    IdentityModulePortalPageAccessGrantDetailView(keys: keys)
                }
        .portalSafeRail(listSafeRailActions)
        .navigationDestination(isPresented: $creating) {
            IdentityModulePortalPageAccessGrantFormView()
        }
        .navigationDestination(isPresented: $editing) {
            IdentityModulePortalPageAccessGrantFormView(keys: editKeys)
        }
        .portalDeleteConfirm(isPresented: $confirmDelete, onConfirm: { Task { await removeSelected() } }, onCancel: { deleteKeys = nil })
        .task { await load() }
    }

    private func rowCard(_ row: GatewayRow) -> some View {
        RecordListRow(row: row)
    }

    private var listSafeRailActions: [PortalSafeRail.Action] {
        var items: [PortalSafeRail.Action] = []
        if access.allows("IdentityModulePortalPageAccessGrants", "Insert") {
            items.append(
                PortalSafeRail.Action(
                    id: "add",
                    systemName: "plus",
                    accessibilityLabel: "Add",
                    pinned: true,
                    perform: { creating = true }
                )
            )
        }
        return items
    }
    private func load() async {
        loading = true
        failure = nil
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PortalPageAccessGrantsList(query: .init(page: Int32(pageNumber), size: Int32(ShellMetrics.listPageSize), includeCount: true))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
                        let payload = try ok.body.json
            let items = payload.items ?? []
            totalCount = payload.totalCount.map { Int($0) }
            rows = items.map { item in
                GatewayRow(
                    id: [item.permissionGroupName ?? "", item.portalPageDefinitionKey ?? "", item.pageAction.map { String($0.value1.rawValue) } ?? ""].joined(separator: "|"),
                    recordId: nil,
                    keys: [item.permissionGroupName ?? "", item.portalPageDefinitionKey ?? "", item.pageAction.map { String($0.value1.rawValue) } ?? ""],
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
            }
            rows = await PortalRefEnricher.enrich(rows, module: "identity-module", session: session)
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private func removeSelected() async {
        guard let keys = deleteKeys else { return }
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
            deleteKeys = nil
            await load()
        } catch {
            failure = PortalErrors.record(error)
            deleteKeys = nil
        }
    }

}