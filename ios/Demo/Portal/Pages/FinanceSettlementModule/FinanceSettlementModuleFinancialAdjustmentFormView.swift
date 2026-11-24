import SwiftUI
import QuickCodeHTTP
import FinanceSettlementModuleClient

struct FinanceSettlementModuleFinancialAdjustmentFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var sellerId = ""
    @State private var payoutId = ""
    @State private var amount = ""
    @State private var reason = ""
    @State private var notes = ""
    @State private var createdByUserId = ""
    @State private var approvedByUserId = ""
    @State private var createdDate = Date()
    @State private var approvedDate = Date()
    @State private var isActive = false
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
                    NumberField(label: "payout Id", text: $payoutId)
                    NumberField(label: "amount", text: $amount, decimal: true)
                    FieldLabel(label: "reason") { TextField("reason", text: $reason) }
                    LongTextField(label: "notes", text: $notes)
                    NumberField(label: "created By User Id", text: $createdByUserId)
                    NumberField(label: "approved By User Id", text: $approvedByUserId)
                    DateField(label: "created Date", date: $createdDate)
                        .disabled(!keys.isEmpty)
                    DateField(label: "approved Date", date: $approvedDate)
                    SwitchField(label: "is Active", isOn: $isActive)
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
        .navigationTitle(keys.isEmpty ? "Financial Adjustments" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.FinancialAdjustmentsInsert(body: .json(.init(
                id: 0,
                sellerId: Int32(sellerId) ?? 0,
                payoutId: Int32(payoutId) ?? 0,
                amount: Double(amount) ?? 0,
                reason: reason,
                notes: notes,
                createdByUserId: Int32(createdByUserId) ?? 0,
                approvedByUserId: Int32(approvedByUserId) ?? 0,
                createdDate: createdDate,
                approvedDate: approvedDate,
                isActive: isActive
            )))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.FinancialAdjustmentsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(
                id: Int32(keys[0]) ?? 0,
                sellerId: Int32(sellerId) ?? 0,
                payoutId: Int32(payoutId) ?? 0,
                amount: Double(amount) ?? 0,
                reason: reason,
                notes: notes,
                createdByUserId: Int32(createdByUserId) ?? 0,
                approvedByUserId: Int32(approvedByUserId) ?? 0,
                createdDate: createdDate,
                approvedDate: approvedDate,
                isActive: isActive
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
            let output = try await client.FinancialAdjustmentsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            sellerId = item.sellerId.map { PortalNumber.integer($0) } ?? ""
            payoutId = item.payoutId.map { PortalNumber.integer($0) } ?? ""
            amount = item.amount.map { PortalNumber.decimal($0) } ?? ""
            reason = item.reason ?? ""
            notes = item.notes ?? ""
            createdByUserId = item.createdByUserId.map { PortalNumber.integer($0) } ?? ""
            approvedByUserId = item.approvedByUserId.map { PortalNumber.integer($0) } ?? ""
            createdDate = item.createdDate ?? Date()
            approvedDate = item.approvedDate ?? Date()
            isActive = item.isActive ?? false
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}