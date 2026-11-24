import SwiftUI
import QuickCodeHTTP
import FinanceSettlementModuleClient

struct FinanceSettlementModuleCommissionEntryFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var orderId = ""
    @State private var orderItemId = ""
    @State private var sellerId = ""
    @State private var commissionModelId = ""
    @State private var commissionRuleId = ""
    @State private var itemPrice = ""
    @State private var commissionPercentage = ""
    @State private var commissionAmount = ""
    @State private var status = ""
    @State private var calculatedDate = Date()
    @State private var appliedDate = Date()
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
                    NumberField(label: "order Id", text: $orderId)
                    NumberField(label: "order Item Id", text: $orderItemId)
                    NumberField(label: "seller Id", text: $sellerId)
                    NumberField(label: "commission Model Id", text: $commissionModelId)
                    NumberField(label: "commission Rule Id", text: $commissionRuleId)
                    NumberField(label: "item Price", text: $itemPrice, decimal: true)
                    NumberField(label: "commission Percentage", text: $commissionPercentage, decimal: true)
                    NumberField(label: "commission Amount", text: $commissionAmount, decimal: true)
                    FieldLabel(label: "status") { TextField("status", text: $status) }
                    DateField(label: "calculated Date", date: $calculatedDate)
                    DateField(label: "applied Date", date: $appliedDate)
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
        .navigationTitle(keys.isEmpty ? "Commission Entries" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.CommissionEntriesInsert(body: .json(.init(
                id: 0,
                orderId: Int32(orderId) ?? 0,
                orderItemId: Int32(orderItemId) ?? 0,
                sellerId: Int32(sellerId) ?? 0,
                commissionModelId: Int32(commissionModelId) ?? 0,
                commissionRuleId: Int32(commissionRuleId) ?? 0,
                itemPrice: Double(itemPrice) ?? 0,
                commissionPercentage: Double(commissionPercentage) ?? 0,
                commissionAmount: Double(commissionAmount) ?? 0,
                status: status,
                calculatedDate: calculatedDate,
                appliedDate: appliedDate
            )))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.CommissionEntriesUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(
                id: Int32(keys[0]) ?? 0,
                orderId: Int32(orderId) ?? 0,
                orderItemId: Int32(orderItemId) ?? 0,
                sellerId: Int32(sellerId) ?? 0,
                commissionModelId: Int32(commissionModelId) ?? 0,
                commissionRuleId: Int32(commissionRuleId) ?? 0,
                itemPrice: Double(itemPrice) ?? 0,
                commissionPercentage: Double(commissionPercentage) ?? 0,
                commissionAmount: Double(commissionAmount) ?? 0,
                status: status,
                calculatedDate: calculatedDate,
                appliedDate: appliedDate
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
            let output = try await client.CommissionEntriesGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            orderId = item.orderId.map { PortalNumber.integer($0) } ?? ""
            orderItemId = item.orderItemId.map { PortalNumber.integer($0) } ?? ""
            sellerId = item.sellerId.map { PortalNumber.integer($0) } ?? ""
            commissionModelId = item.commissionModelId.map { PortalNumber.integer($0) } ?? ""
            commissionRuleId = item.commissionRuleId.map { PortalNumber.integer($0) } ?? ""
            itemPrice = item.itemPrice.map { PortalNumber.decimal($0) } ?? ""
            commissionPercentage = item.commissionPercentage.map { PortalNumber.decimal($0) } ?? ""
            commissionAmount = item.commissionAmount.map { PortalNumber.decimal($0) } ?? ""
            status = item.status ?? ""
            calculatedDate = item.calculatedDate ?? Date()
            appliedDate = item.appliedDate ?? Date()
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}