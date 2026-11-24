import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleAuditLogsListView: View {
    @Environment(SessionStore.self) private var session
    @State private var rows: [GatewayRow] = []
    @State private var pageNumber = 1
    @State private var totalCount: Int?
    @State private var search = ""
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
                                    NavigationLink(value: row.keys) { rowCard(row) }.buttonStyle(.plain)
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
        .navigationTitle("Audit Logs")
        .navigationBarTitleDisplayMode(.large)
                .navigationDestination(for: [String].self) { keys in
                    IdentityModuleAuditLogDetailView(keys: keys)
                }
        .task { await load() }
    }

    private func rowCard(_ row: GatewayRow) -> some View {
        RecordListRow(row: row)
    }

    private func load() async {
        loading = true
        failure = nil
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.AuditLogsList(query: .init(page: Int32(pageNumber), size: Int32(ShellMetrics.listPageSize), includeCount: true))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
                        let payload = try ok.body.json
            let items = payload.items ?? []
            totalCount = payload.totalCount.map { Int($0) }
            rows = items.map { item in
                GatewayRow(
                    id: [item.id ?? ""].joined(separator: "|"),
                    recordId: nil,
                    keys: [item.id ?? ""],
                    title: item.entityName ?? "",
                    subtitle: item.isChanged.map { $0 ? "Yes" : "No" } ?? "",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: item.id ?? "", kind: .text, quiet: true),
                    PortalValue(id: "entityName", label: "Entity Name", text: item.entityName ?? "", kind: .text),
                    PortalValue(id: "entityId", label: "Entity Id", text: item.entityId ?? "", kind: .text, quiet: true),
                    PortalValue(id: "action", label: "Action", text: item.action ?? "", kind: .text),
                    PortalValue(id: "userId", label: "User Id", text: item.userId ?? "", kind: .text, quiet: true),
                    PortalValue(id: "userName", label: "User Name", text: item.userName ?? "", kind: .text),
                    PortalValue(id: "userGroup", label: "User Group", text: item.userGroup ?? "", kind: .text),
                    PortalValue(id: "timestamp", label: "Timestamp", text: item.timestamp.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date),
                    PortalValue(id: "durationMs", label: "Duration Ms", text: item.durationMs.map { PortalNumber.integer($0) } ?? "", kind: .integer),
                    PortalValue(id: "statusCode", label: "Status Code", text: item.statusCode.map { PortalNumber.integer($0) } ?? "", kind: .integer),
                    PortalValue(id: "requestModule", label: "Request Module", text: item.requestModule ?? "", kind: .text),
                    PortalValue(id: "requestPath", label: "Request Path", text: item.requestPath ?? "", kind: .text),
                    PortalValue(id: "oldValues", label: "Old Values", text: item.oldValues ?? "", kind: .json),
                    PortalValue(id: "newValues", label: "New Values", text: item.newValues ?? "", kind: .json),
                    PortalValue(id: "changedColumns", label: "Changed Columns", text: item.changedColumns ?? "", kind: .json),
                    PortalValue(id: "isChanged", label: "Is Changed", text: item.isChanged.map { $0 ? "Yes" : "No" } ?? "", kind: .bool),
                    PortalValue(id: "changeSummary", label: "Change Summary", text: item.changeSummary ?? "", kind: .json),
                    PortalValue(id: "ipAddress", label: "Ip Address", text: item.ipAddress ?? "", kind: .text),
                    PortalValue(id: "userAgent", label: "User Agent", text: item.userAgent ?? "", kind: .text),
                    PortalValue(id: "clientId", label: "Client Id", text: item.clientId ?? "", kind: .text, quiet: true),
                    PortalValue(id: "correlationId", label: "Correlation Id", text: item.correlationId ?? "", kind: .text, quiet: true),
                    PortalValue(id: "isSuccess", label: "Is Success", text: item.isSuccess.map { $0 ? "Yes" : "No" } ?? "", kind: .bool),
                    PortalValue(id: "errorMessage", label: "Error Message", text: item.errorMessage ?? "", kind: .long),
                    PortalValue(id: "hash", label: "Hash", text: item.hash ?? "", kind: .text)
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
}