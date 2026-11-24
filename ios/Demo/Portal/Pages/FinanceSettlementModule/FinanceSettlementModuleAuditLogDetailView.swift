import SwiftUI
import QuickCodeHTTP
import FinanceSettlementModuleClient

struct FinanceSettlementModuleAuditLogDetailView: View {
    let keys: [String]
    @Environment(SessionStore.self) private var session
    @Environment(PortalAccess.self) private var access
    @State private var row: GatewayRow?
    @State private var loading = true
    @State private var failure: String?

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
        .navigationTitle("Audit Logs")
        .task { await load() }
    }

    private func load() async {
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.AuditLogsGetItem(path: .init(id: keys[0]))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            let loaded = GatewayRow(
                    id: UUID().uuidString,
                    recordId: nil,
                    keys: [],
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
            row = await PortalRefEnricher.enrich(loaded, module: "finance-settlement-module", session: session)
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }
}