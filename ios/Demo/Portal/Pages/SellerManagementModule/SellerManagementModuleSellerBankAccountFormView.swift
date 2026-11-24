import SwiftUI
import QuickCodeHTTP
import SellerManagementModuleClient

struct SellerManagementModuleSellerBankAccountFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var sellerId = ""
    @State private var bankName = ""
    @State private var accountHolderName = ""
    @State private var iban = ""
    @State private var isDefault = false
    @State private var isVerified = false
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
                    PortalForeignKeyField(label: "seller", module: "seller-management-module", model: "sellers", text: $sellerId)
                    FieldLabel(label: "bank Name") { TextField("bank Name", text: $bankName) }
                    FieldLabel(label: "account Holder Name") { TextField("account Holder Name", text: $accountHolderName) }
                    FieldLabel(label: "iban") { TextField("iban", text: $iban) }
                    SwitchField(label: "is Default", isOn: $isDefault)
                    SwitchField(label: "is Verified", isOn: $isVerified)
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
        .navigationTitle(keys.isEmpty ? "Seller Bank Accounts" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.SellerBankAccountsInsert(body: .json(.init(value1: .init(
                id: 0,
                sellerId: Int32(sellerId) ?? 0,
                bankName: bankName,
                accountHolderName: accountHolderName,
                iban: iban,
                isDefault: isDefault,
                isVerified: isVerified
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.SellerBankAccountsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(value1: .init(
                id: Int32(keys[0]) ?? 0,
                sellerId: Int32(sellerId) ?? 0,
                bankName: bankName,
                accountHolderName: accountHolderName,
                iban: iban,
                isDefault: isDefault,
                isVerified: isVerified
            ))))
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
            let output = try await client.SellerBankAccountsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            sellerId = item.sellerId.map { PortalNumber.integer($0) } ?? ""
            bankName = item.bankName ?? ""
            accountHolderName = item.accountHolderName ?? ""
            iban = item.iban ?? ""
            isDefault = item.isDefault ?? false
            isVerified = item.isVerified ?? false
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}