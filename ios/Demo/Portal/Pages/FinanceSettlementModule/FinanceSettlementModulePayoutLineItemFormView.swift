import SwiftUI
import QuickCodeHTTP
import FinanceSettlementModuleClient

struct FinanceSettlementModulePayoutLineItemFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var payoutId = ""
    @State private var orderId = ""
    @State private var orderItemId = ""
    @State private var itemAmount = ""
    @State private var commissionAmount = ""
    @State private var adjustmentAmount = ""
    @State private var netAmount = ""
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
                    PortalForeignKeyField(label: "payout", module: "finance-settlement-module", model: "seller-payouts", text: $payoutId)
                    NumberField(label: "order Id", text: $orderId)
                    NumberField(label: "order Item Id", text: $orderItemId)
                    NumberField(label: "item Amount", text: $itemAmount, decimal: true)
                    NumberField(label: "commission Amount", text: $commissionAmount, decimal: true)
                    NumberField(label: "adjustment Amount", text: $adjustmentAmount, decimal: true)
                    NumberField(label: "net Amount", text: $netAmount, decimal: true)
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
        .navigationTitle(keys.isEmpty ? "Payout Line Items" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PayoutLineItemsInsert(body: .json(.init(
                id: 0,
                payoutId: Int32(payoutId) ?? 0,
                orderId: Int32(orderId) ?? 0,
                orderItemId: Int32(orderItemId) ?? 0,
                itemAmount: Double(itemAmount) ?? 0,
                commissionAmount: Double(commissionAmount) ?? 0,
                adjustmentAmount: Double(adjustmentAmount) ?? 0,
                netAmount: Double(netAmount) ?? 0,
                createdDate: createdDate
            )))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PayoutLineItemsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(
                id: Int32(keys[0]) ?? 0,
                payoutId: Int32(payoutId) ?? 0,
                orderId: Int32(orderId) ?? 0,
                orderItemId: Int32(orderItemId) ?? 0,
                itemAmount: Double(itemAmount) ?? 0,
                commissionAmount: Double(commissionAmount) ?? 0,
                adjustmentAmount: Double(adjustmentAmount) ?? 0,
                netAmount: Double(netAmount) ?? 0,
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
            let output = try await client.PayoutLineItemsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            payoutId = item.payoutId.map { PortalNumber.integer($0) } ?? ""
            orderId = item.orderId.map { PortalNumber.integer($0) } ?? ""
            orderItemId = item.orderItemId.map { PortalNumber.integer($0) } ?? ""
            itemAmount = item.itemAmount.map { PortalNumber.decimal($0) } ?? ""
            commissionAmount = item.commissionAmount.map { PortalNumber.decimal($0) } ?? ""
            adjustmentAmount = item.adjustmentAmount.map { PortalNumber.decimal($0) } ?? ""
            netAmount = item.netAmount.map { PortalNumber.decimal($0) } ?? ""
            createdDate = item.createdDate ?? Date()
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}