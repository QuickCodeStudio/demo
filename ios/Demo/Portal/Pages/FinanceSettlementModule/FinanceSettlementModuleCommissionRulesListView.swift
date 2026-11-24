import SwiftUI
import QuickCodeHTTP
import FinanceSettlementModuleClient

struct FinanceSettlementModuleCommissionRulesListView: View {
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
                                        allowsEdit: access.allows("FinanceSettlementModuleCommissionRules", "Update"),
                                        allowsDelete: access.allows("FinanceSettlementModuleCommissionRules", "Delete"),
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
        .navigationTitle("Commission Rules")
        .navigationBarTitleDisplayMode(.large)
                .navigationDestination(for: [String].self) { keys in
                    FinanceSettlementModuleCommissionRuleDetailView(keys: keys)
                }
        .portalSafeRail(listSafeRailActions)
        .navigationDestination(isPresented: $creating) {
            FinanceSettlementModuleCommissionRuleFormView()
        }
        .navigationDestination(isPresented: $editing) {
            FinanceSettlementModuleCommissionRuleFormView(keys: editKeys)
        }
        .portalDeleteConfirm(isPresented: $confirmDelete, onConfirm: { Task { await removeSelected() } }, onCancel: { deleteKeys = nil })
        .task { await load() }
    }

    private func rowCard(_ row: GatewayRow) -> some View {
        RecordListRow(row: row)
    }

    private var listSafeRailActions: [PortalSafeRail.Action] {
        var items: [PortalSafeRail.Action] = []
        if access.allows("FinanceSettlementModuleCommissionRules", "Insert") {
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
            let output = try await client.CommissionRulesList(query: .init(page: pageNumber, size: ShellMetrics.listPageSize, includeCount: true))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
                        let payload = try ok.body.json
            let items = payload.items ?? []
            totalCount = payload.totalCount.map { Int($0) }
            rows = items.map { item in
                GatewayRow(
                    id: [item.id.map { String($0) } ?? ""].joined(separator: "|"),
                    recordId: item.id.map { Int($0) },
                    keys: [item.id.map { String($0) } ?? ""],
                    title: item.ruleName ?? "",
                    subtitle: item.isActive.map { $0 ? "Yes" : "No" } ?? "",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: item.id.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "commissionModelId", label: "Commission Model Id", text: item.commissionModelId.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "ruleName", label: "Rule Name", text: item.ruleName ?? "", kind: .text),
                    PortalValue(id: "minOrderValue", label: "Min Order Value", text: item.minOrderValue.map { PortalNumber.decimal($0) } ?? "", kind: .decimal),
                    PortalValue(id: "maxOrderValue", label: "Max Order Value", text: item.maxOrderValue.map { PortalNumber.decimal($0) } ?? "", kind: .decimal),
                    PortalValue(id: "overridePercentage", label: "Override Percentage", text: item.overridePercentage.map { PortalNumber.decimal($0) } ?? "", kind: .decimal),
                    PortalValue(id: "isActive", label: "Is Active", text: item.isActive.map { $0 ? "Yes" : "No" } ?? "", kind: .bool),
                    PortalValue(id: "createdDate", label: "Created Date", text: item.createdDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date, quiet: true)
                    ]
                )
            }
            rows = await PortalRefEnricher.enrich(rows, module: "finance-settlement-module", session: session)
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
            let output = try await client.CommissionRulesDelete(path: .init(id: Int32(keys[0]) ?? 0))
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