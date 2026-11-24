import SwiftUI
import QuickCodeHTTP
import PricingEngineModuleClient

struct PricingEngineModuleCommissionRulesListView: View {
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
                                        allowsEdit: access.allows("PricingEngineModuleCommissionRules", "Update"),
                                        allowsDelete: access.allows("PricingEngineModuleCommissionRules", "Delete"),
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
                    PricingEngineModuleCommissionRuleDetailView(keys: keys)
                }
        .portalSafeRail(listSafeRailActions)
        .navigationDestination(isPresented: $creating) {
            PricingEngineModuleCommissionRuleFormView()
        }
        .navigationDestination(isPresented: $editing) {
            PricingEngineModuleCommissionRuleFormView(keys: editKeys)
        }
        .portalDeleteConfirm(isPresented: $confirmDelete, onConfirm: { Task { await removeSelected() } }, onCancel: { deleteKeys = nil })
        .task { await load() }
    }

    private func rowCard(_ row: GatewayRow) -> some View {
        RecordListRow(row: row)
    }

    private var listSafeRailActions: [PortalSafeRail.Action] {
        var items: [PortalSafeRail.Action] = []
        if access.allows("PricingEngineModuleCommissionRules", "Insert") {
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
            let output = try await client.CommissionRulesList(query: .init(page: Double(pageNumber), size: Double(ShellMetrics.listPageSize), includeCount: true))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
                        let payload = try ok.body.json
            let items = payload.items ?? []
            totalCount = payload.totalCount.map { Int($0) }
            rows = items.map { item in
                GatewayRow(
                    id: [String(item.id)].joined(separator: "|"),
                    recordId: nil,
                    keys: [String(item.id)],
                    title: String(item.scope.rawValue),
                    subtitle: item.isActive ? "Yes" : "No",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: PortalNumber.integer(item.id), kind: .integer, quiet: true),
                    PortalValue(id: "commissionModelId", label: "Commission Model Id", text: PortalNumber.integer(item.commissionModelId), kind: .integer, quiet: true),
                    PortalValue(id: "scope", label: "Scope", text: String(item.scope.rawValue), kind: .text),
                    PortalValue(id: "scopeId", label: "Scope Id", text: PortalNumber.integer(item.scopeId), kind: .integer, quiet: true),
                    PortalValue(id: "commissionType", label: "Commission Type", text: String(item.commissionType.rawValue), kind: .text),
                    PortalValue(id: "percentageRate", label: "Percentage Rate", text: PortalNumber.decimal(item.percentageRate), kind: .decimal),
                    PortalValue(id: "fixedAmount", label: "Fixed Amount", text: PortalNumber.decimal(item.fixedAmount), kind: .decimal),
                    PortalValue(id: "isActive", label: "Is Active", text: item.isActive ? "Yes" : "No", kind: .bool)
                    ]
                )
            }
            rows = await PortalRefEnricher.enrich(rows, module: "pricing-engine-module", session: session)
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
            let output = try await client.CommissionRulesDelete(path: .init(id: Double(keys[0]) ?? 0))
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