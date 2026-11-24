import SwiftUI
import QuickCodeHTTP
import FinanceSettlementModuleClient

struct FinanceSettlementModuleSellerPayoutFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var sellerId = ""
    @State private var payoutPeriodId = ""
    @State private var totalEarnings = ""
    @State private var totalCommission = ""
    @State private var totalAdjustments = ""
    @State private var netPayoutAmount = ""
    @State private var status = ""
    @State private var requestedDate = Date()
    @State private var approvedDate = Date()
    @State private var processedDate = Date()
    @State private var paidDate = Date()
    @State private var transactionId = ""
    @State private var notes = ""
    @State private var createdDate = Date()
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
                    NumberField(label: "seller Id", text: $sellerId)
                    PortalForeignKeyField(label: "payout Period", module: "finance-settlement-module", model: "payout-periods", text: $payoutPeriodId)
                    NumberField(label: "total Earnings", text: $totalEarnings, decimal: true)
                    NumberField(label: "total Commission", text: $totalCommission, decimal: true)
                    NumberField(label: "total Adjustments", text: $totalAdjustments, decimal: true)
                    NumberField(label: "net Payout Amount", text: $netPayoutAmount, decimal: true)
                    FieldLabel(label: "status") { TextField("status", text: $status) }
                    DateField(label: "requested Date", date: $requestedDate)
                    DateField(label: "approved Date", date: $approvedDate)
                    DateField(label: "processed Date", date: $processedDate)
                    DateField(label: "paid Date", date: $paidDate)
                    FieldLabel(label: "transaction Id") { TextField("transaction Id", text: $transactionId) }
                    LongTextField(label: "notes", text: $notes)
                    DateField(label: "created Date", date: $createdDate)
                        .disabled(!keys.isEmpty)
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
        .navigationTitle(keys.isEmpty ? "Seller Payouts" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.SellerPayoutsInsert(body: .json(.init(
                id: 0,
                sellerId: Int32(sellerId) ?? 0,
                payoutPeriodId: Int32(payoutPeriodId) ?? 0,
                totalEarnings: Double(totalEarnings) ?? 0,
                totalCommission: Double(totalCommission) ?? 0,
                totalAdjustments: Double(totalAdjustments) ?? 0,
                netPayoutAmount: Double(netPayoutAmount) ?? 0,
                status: status,
                requestedDate: requestedDate,
                approvedDate: approvedDate,
                processedDate: processedDate,
                paidDate: paidDate,
                transactionId: transactionId,
                notes: notes,
                createdDate: createdDate
            )))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.SellerPayoutsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(
                id: Int32(keys[0]) ?? 0,
                sellerId: Int32(sellerId) ?? 0,
                payoutPeriodId: Int32(payoutPeriodId) ?? 0,
                totalEarnings: Double(totalEarnings) ?? 0,
                totalCommission: Double(totalCommission) ?? 0,
                totalAdjustments: Double(totalAdjustments) ?? 0,
                netPayoutAmount: Double(netPayoutAmount) ?? 0,
                status: status,
                requestedDate: requestedDate,
                approvedDate: approvedDate,
                processedDate: processedDate,
                paidDate: paidDate,
                transactionId: transactionId,
                notes: notes,
                createdDate: createdDate
            )))
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
            let output = try await client.SellerPayoutsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            sellerId = item.sellerId.map { PortalNumber.integer($0) } ?? ""
            payoutPeriodId = item.payoutPeriodId.map { PortalNumber.integer($0) } ?? ""
            totalEarnings = item.totalEarnings.map { PortalNumber.decimal($0) } ?? ""
            totalCommission = item.totalCommission.map { PortalNumber.decimal($0) } ?? ""
            totalAdjustments = item.totalAdjustments.map { PortalNumber.decimal($0) } ?? ""
            netPayoutAmount = item.netPayoutAmount.map { PortalNumber.decimal($0) } ?? ""
            status = item.status ?? ""
            requestedDate = item.requestedDate ?? Date()
            approvedDate = item.approvedDate ?? Date()
            processedDate = item.processedDate ?? Date()
            paidDate = item.paidDate ?? Date()
            transactionId = item.transactionId ?? ""
            notes = item.notes ?? ""
            createdDate = item.createdDate ?? Date()
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}