import SwiftUI
import QuickCodeHTTP
import FinanceSettlementModuleClient

struct FinanceSettlementModulePayoutReportFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var payoutPeriodId = ""
    @State private var totalSellers = ""
    @State private var totalPayouts = ""
    @State private var totalAmount = ""
    @State private var successfulPayouts = ""
    @State private var failedPayouts = ""
    @State private var pendingPayouts = ""
    @State private var generatedDate = Date()
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
                    PortalForeignKeyField(label: "payout Period", module: "finance-settlement-module", model: "payout-periods", text: $payoutPeriodId)
                    NumberField(label: "total Sellers", text: $totalSellers)
                    NumberField(label: "total Payouts", text: $totalPayouts)
                    NumberField(label: "total Amount", text: $totalAmount, decimal: true)
                    NumberField(label: "successful Payouts", text: $successfulPayouts)
                    NumberField(label: "failed Payouts", text: $failedPayouts)
                    NumberField(label: "pending Payouts", text: $pendingPayouts)
                    DateField(label: "generated Date", date: $generatedDate)
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
        .navigationTitle(keys.isEmpty ? "Payout Reports" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PayoutReportsInsert(body: .json(.init(
                id: 0,
                payoutPeriodId: Int32(payoutPeriodId) ?? 0,
                totalSellers: Int32(totalSellers) ?? 0,
                totalPayouts: Int32(totalPayouts) ?? 0,
                totalAmount: Double(totalAmount) ?? 0,
                successfulPayouts: Int32(successfulPayouts) ?? 0,
                failedPayouts: Int32(failedPayouts) ?? 0,
                pendingPayouts: Int32(pendingPayouts) ?? 0,
                generatedDate: generatedDate
            )))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PayoutReportsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(
                id: Int32(keys[0]) ?? 0,
                payoutPeriodId: Int32(payoutPeriodId) ?? 0,
                totalSellers: Int32(totalSellers) ?? 0,
                totalPayouts: Int32(totalPayouts) ?? 0,
                totalAmount: Double(totalAmount) ?? 0,
                successfulPayouts: Int32(successfulPayouts) ?? 0,
                failedPayouts: Int32(failedPayouts) ?? 0,
                pendingPayouts: Int32(pendingPayouts) ?? 0,
                generatedDate: generatedDate
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
            let output = try await client.PayoutReportsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            payoutPeriodId = item.payoutPeriodId.map { PortalNumber.integer($0) } ?? ""
            totalSellers = item.totalSellers.map { PortalNumber.integer($0) } ?? ""
            totalPayouts = item.totalPayouts.map { PortalNumber.integer($0) } ?? ""
            totalAmount = item.totalAmount.map { PortalNumber.decimal($0) } ?? ""
            successfulPayouts = item.successfulPayouts.map { PortalNumber.integer($0) } ?? ""
            failedPayouts = item.failedPayouts.map { PortalNumber.integer($0) } ?? ""
            pendingPayouts = item.pendingPayouts.map { PortalNumber.integer($0) } ?? ""
            generatedDate = item.generatedDate ?? Date()
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}