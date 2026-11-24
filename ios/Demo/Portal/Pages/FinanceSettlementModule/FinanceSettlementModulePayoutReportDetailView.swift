import SwiftUI
import QuickCodeHTTP
import FinanceSettlementModuleClient

struct FinanceSettlementModulePayoutReportDetailView: View {
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
        .navigationTitle("Payout Reports")

        .portalSafeRail(detailSafeRailActions, showsBack: true)
        .navigationDestination(isPresented: $openEditor) {
            FinanceSettlementModulePayoutReportFormView(keys: keys)
        }
        .portalDeleteConfirm(isPresented: $confirmDelete, onConfirm: { Task { await remove() } })

        .task { await load() }
    }

    private func load() async {
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PayoutReportsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            let loaded = GatewayRow(
                    id: String(describing: item.id),
                    recordId: item.id.map { Int($0) },
                    keys: [],
                    title: item.totalSellers.map { PortalNumber.integer($0) } ?? "",
                    subtitle: item.totalAmount.map { PortalNumber.decimal($0) } ?? "",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: item.id.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "payoutPeriodId", label: "Payout Period Id", text: item.payoutPeriodId.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "totalSellers", label: "Total Sellers", text: item.totalSellers.map { PortalNumber.integer($0) } ?? "", kind: .integer),
                    PortalValue(id: "totalPayouts", label: "Total Payouts", text: item.totalPayouts.map { PortalNumber.integer($0) } ?? "", kind: .integer),
                    PortalValue(id: "totalAmount", label: "Total Amount", text: item.totalAmount.map { PortalNumber.decimal($0) } ?? "", kind: .decimal),
                    PortalValue(id: "successfulPayouts", label: "Successful Payouts", text: item.successfulPayouts.map { PortalNumber.integer($0) } ?? "", kind: .integer),
                    PortalValue(id: "failedPayouts", label: "Failed Payouts", text: item.failedPayouts.map { PortalNumber.integer($0) } ?? "", kind: .integer),
                    PortalValue(id: "pendingPayouts", label: "Pending Payouts", text: item.pendingPayouts.map { PortalNumber.integer($0) } ?? "", kind: .integer),
                    PortalValue(id: "generatedDate", label: "Generated Date", text: item.generatedDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date)
                    ]
                )
            row = await PortalRefEnricher.enrich(loaded, module: "finance-settlement-module", session: session)
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private var detailSafeRailActions: [PortalSafeRail.Action] {
        var items: [PortalSafeRail.Action] = []
        if access.allows("FinanceSettlementModulePayoutReports", "Delete") {
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
        if access.allows("FinanceSettlementModulePayoutReports", "Update") {
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
            let output = try await client.PayoutReportsDelete(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            toast.show("Deleted")
            dismiss()
        } catch {
            failure = PortalErrors.record(error)
        }
    }
}