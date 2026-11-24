import SwiftUI
import QuickCodeHTTP
import FinanceSettlementModuleClient

struct FinanceSettlementModuleTransactionLedgerFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var sellerId = ""
    @State private var transactionType = ""
    @State private var amount = ""
    @State private var referenceId = ""
    @State private var referenceType = ""
    @State private var description = ""
    @State private var transactionDate = Date()
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
                    FieldLabel(label: "transaction Type") { TextField("transaction Type", text: $transactionType) }
                    NumberField(label: "amount", text: $amount, decimal: true)
                    FieldLabel(label: "reference Id") { TextField("reference Id", text: $referenceId) }
                    FieldLabel(label: "reference Type") { TextField("reference Type", text: $referenceType) }
                    LongTextField(label: "description", text: $description)
                    DateField(label: "transaction Date", date: $transactionDate)
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
        .navigationTitle(keys.isEmpty ? "Transaction Ledgers" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.TransactionLedgersInsert(body: .json(.init(
                id: 0,
                sellerId: Int32(sellerId) ?? 0,
                transactionType: transactionType,
                amount: Double(amount) ?? 0,
                referenceId: referenceId,
                referenceType: referenceType,
                description: description,
                transactionDate: transactionDate,
                createdDate: createdDate
            )))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.TransactionLedgersUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(
                id: Int32(keys[0]) ?? 0,
                sellerId: Int32(sellerId) ?? 0,
                transactionType: transactionType,
                amount: Double(amount) ?? 0,
                referenceId: referenceId,
                referenceType: referenceType,
                description: description,
                transactionDate: transactionDate,
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
            let output = try await client.TransactionLedgersGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            sellerId = item.sellerId.map { PortalNumber.integer($0) } ?? ""
            transactionType = item.transactionType ?? ""
            amount = item.amount.map { PortalNumber.decimal($0) } ?? ""
            referenceId = item.referenceId ?? ""
            referenceType = item.referenceType ?? ""
            description = item.description ?? ""
            transactionDate = item.transactionDate ?? Date()
            createdDate = item.createdDate ?? Date()
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}