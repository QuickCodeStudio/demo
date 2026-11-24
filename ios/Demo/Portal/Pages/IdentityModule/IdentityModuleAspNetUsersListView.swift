import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleAspNetUsersListView: View {
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
                                        allowsEdit: access.allows("IdentityModuleAspNetUsers", "Update"),
                                        allowsDelete: access.allows("IdentityModuleAspNetUsers", "Delete"),
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
        .navigationTitle("Asp Net Users")
        .navigationBarTitleDisplayMode(.large)
                .navigationDestination(for: [String].self) { keys in
                    IdentityModuleAspNetUserDetailView(keys: keys)
                }
        .portalSafeRail(listSafeRailActions)
        .navigationDestination(isPresented: $creating) {
            IdentityModuleAspNetUserFormView()
        }
        .navigationDestination(isPresented: $editing) {
            IdentityModuleAspNetUserFormView(keys: editKeys)
        }
        .portalDeleteConfirm(isPresented: $confirmDelete, onConfirm: { Task { await removeSelected() } }, onCancel: { deleteKeys = nil })
        .task { await load() }
    }

    private func rowCard(_ row: GatewayRow) -> some View {
        ProductCardLabel(imageURL: row.image, title: row.title, price: row.subtitle)
    }

    private var listSafeRailActions: [PortalSafeRail.Action] {
        var items: [PortalSafeRail.Action] = []
        if access.allows("IdentityModuleAspNetUsers", "Insert") {
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
            let output = try await client.AspNetUsersList(query: .init(page: Int32(pageNumber), size: Int32(ShellMetrics.listPageSize), includeCount: true))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
                        let payload = try ok.body.json
            let items = payload.items ?? []
            totalCount = payload.totalCount.map { Int($0) }
            rows = items.map { item in
                GatewayRow(
                    id: [item.id ?? ""].joined(separator: "|"),
                    recordId: nil,
                    keys: [item.id ?? ""],
                    title: item.firstName ?? "",
                    subtitle: item.emailConfirmed.map { $0 ? "Yes" : "No" } ?? "",
                    image: remoteMediaURL(item.photoUrl ?? ""),
                    fields: [
                    PortalValue(id: "id", label: "Id", text: item.id ?? "", kind: .text, quiet: true),
                    PortalValue(id: "firstName", label: "First Name", text: item.firstName ?? "", kind: .text),
                    PortalValue(id: "lastName", label: "Last Name", text: item.lastName ?? "", kind: .text),
                    PortalValue(id: "permissionGroupName", label: "Permission Group Name", text: item.permissionGroupName ?? "", kind: .text),
                    PortalValue(id: "userName", label: "User Name", text: item.userName ?? "", kind: .text),
                    PortalValue(id: "normalizedUserName", label: "Normalized User Name", text: item.normalizedUserName ?? "", kind: .text),
                    PortalValue(id: "email", label: "Email", text: item.email ?? "", kind: .text),
                    PortalValue(id: "normalizedEmail", label: "Normalized Email", text: item.normalizedEmail ?? "", kind: .text),
                    PortalValue(id: "emailConfirmed", label: "Email Confirmed", text: item.emailConfirmed.map { $0 ? "Yes" : "No" } ?? "", kind: .bool),
                    PortalValue(id: "phoneNumber", label: "Phone Number", text: item.phoneNumber ?? "", kind: .text),
                    PortalValue(id: "phoneNumberConfirmed", label: "Phone Number Confirmed", text: item.phoneNumberConfirmed.map { $0 ? "Yes" : "No" } ?? "", kind: .bool),
                    PortalValue(id: "twoFactorEnabled", label: "Two Factor Enabled", text: item.twoFactorEnabled.map { $0 ? "Yes" : "No" } ?? "", kind: .bool),
                    PortalValue(id: "lockoutEnd", label: "Lockout End", text: item.lockoutEnd.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .text),
                    PortalValue(id: "lockoutEnabled", label: "Lockout Enabled", text: item.lockoutEnabled.map { $0 ? "Yes" : "No" } ?? "", kind: .bool),
                    PortalValue(id: "accessFailedCount", label: "Access Failed Count", text: item.accessFailedCount.map { PortalNumber.integer($0) } ?? "", kind: .integer),
                    PortalValue(id: "photoUrl", label: "Photo Url", text: item.photoUrl ?? "", kind: .image)
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
            let output = try await client.AspNetUsersDelete(path: .init(id: keys[0]))
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