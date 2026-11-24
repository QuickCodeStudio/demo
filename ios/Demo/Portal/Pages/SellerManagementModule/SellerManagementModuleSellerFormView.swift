import SwiftUI
import QuickCodeHTTP
import SellerManagementModuleClient

struct SellerManagementModuleSellerFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var userId = ""
    @State private var companyName = ""
    @State private var contactEmail = ""
    @State private var contactPhone = ""
    @State private var status = "PendingVerification"
    @State private var sellerTierId = ""
    @State private var joinedDate = Date()
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
                    NumberField(label: "user Id", text: $userId)
                    FieldLabel(label: "company Name") { TextField("company Name", text: $companyName) }
                    EmailField(label: "contact Email", text: $contactEmail)
                    PhoneField(label: "contact Phone", text: $contactPhone)
                    SelectField(label: "status", options: [(id: "PendingVerification", name: "Pending Verification"), (id: "Active", name: "Active"), (id: "Suspended", name: "Suspended"), (id: "Rejected", name: "Rejected"), (id: "Closed", name: "Closed")], selection: $status)
                    PortalForeignKeyField(label: "seller Tier", module: "seller-management-module", model: "seller-tiers", text: $sellerTierId)
                    DateField(label: "joined Date", date: $joinedDate)
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
        .navigationTitle(keys.isEmpty ? "Sellers" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.SellersInsert(body: .json(.init(value1: .init(
                id: 0,
                userId: Int32(userId) ?? 0,
                companyName: companyName,
                contactEmail: contactEmail,
                contactPhone: contactPhone,
                status: .init(value1: { switch status {
case "PendingVerification": .PendingVerification
case "Active": .Active
case "Suspended": .Suspended
case "Rejected": .Rejected
case "Closed": .Closed
default: .PendingVerification
} }()),
                sellerTierId: Int32(sellerTierId) ?? 0,
                joinedDate: joinedDate
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.SellersUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(value1: .init(
                id: Int32(keys[0]) ?? 0,
                userId: Int32(userId) ?? 0,
                companyName: companyName,
                contactEmail: contactEmail,
                contactPhone: contactPhone,
                status: .init(value1: { switch status {
case "PendingVerification": .PendingVerification
case "Active": .Active
case "Suspended": .Suspended
case "Rejected": .Rejected
case "Closed": .Closed
default: .PendingVerification
} }()),
                sellerTierId: Int32(sellerTierId) ?? 0,
                joinedDate: joinedDate
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
            let output = try await client.SellersGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            userId = item.userId.map { PortalNumber.integer($0) } ?? ""
            companyName = item.companyName ?? ""
            contactEmail = item.contactEmail ?? ""
            contactPhone = item.contactPhone ?? ""
            status = item.status.map { String($0.value1.rawValue) } ?? "PendingVerification"
            sellerTierId = item.sellerTierId.map { PortalNumber.integer($0) } ?? ""
            joinedDate = item.joinedDate ?? Date()
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}