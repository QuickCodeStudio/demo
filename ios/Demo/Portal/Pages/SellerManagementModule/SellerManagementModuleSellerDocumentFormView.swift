import SwiftUI
import QuickCodeHTTP
import SellerManagementModuleClient

struct SellerManagementModuleSellerDocumentFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var sellerId = ""
    @State private var documentType = "Identity"
    @State private var fileUrl = ""
    @State private var status = "Pending"
    @State private var uploadedDate = Date()
    @State private var reviewedDate = Date()
    @State private var rejectionReason = ""
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
                    SelectField(label: "document Type", options: [(id: "Identity", name: "Identity"), (id: "BusinessRegistration", name: "Business Registration"), (id: "TaxId", name: "Tax Id"), (id: "BankStatement", name: "Bank Statement")], selection: $documentType)
                    UrlField(label: "file Url", text: $fileUrl)
                    SelectField(label: "status", options: [(id: "Pending", name: "Pending"), (id: "Verified", name: "Verified"), (id: "Rejected", name: "Rejected")], selection: $status)
                    DateField(label: "uploaded Date", date: $uploadedDate)
                    DateField(label: "reviewed Date", date: $reviewedDate)
                    LongTextField(label: "rejection Reason", text: $rejectionReason)
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
        .navigationTitle(keys.isEmpty ? "Seller Documents" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.SellerDocumentsInsert(body: .json(.init(value1: .init(
                id: 0,
                sellerId: Int32(sellerId) ?? 0,
                documentType: .init(value1: { switch documentType {
case "Identity": .Identity
case "BusinessRegistration": .BusinessRegistration
case "TaxId": .TaxId
case "BankStatement": .BankStatement
default: .Identity
} }()),
                fileUrl: fileUrl,
                status: .init(value1: { switch status {
case "Pending": .Pending
case "Verified": .Verified
case "Rejected": .Rejected
default: .Pending
} }()),
                uploadedDate: uploadedDate,
                reviewedDate: reviewedDate,
                rejectionReason: rejectionReason
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.SellerDocumentsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(value1: .init(
                id: Int32(keys[0]) ?? 0,
                sellerId: Int32(sellerId) ?? 0,
                documentType: .init(value1: { switch documentType {
case "Identity": .Identity
case "BusinessRegistration": .BusinessRegistration
case "TaxId": .TaxId
case "BankStatement": .BankStatement
default: .Identity
} }()),
                fileUrl: fileUrl,
                status: .init(value1: { switch status {
case "Pending": .Pending
case "Verified": .Verified
case "Rejected": .Rejected
default: .Pending
} }()),
                uploadedDate: uploadedDate,
                reviewedDate: reviewedDate,
                rejectionReason: rejectionReason
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
            let output = try await client.SellerDocumentsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            sellerId = item.sellerId.map { PortalNumber.integer($0) } ?? ""
            documentType = item.documentType.map { String($0.value1.rawValue) } ?? "Identity"
            fileUrl = item.fileUrl ?? ""
            status = item.status.map { String($0.value1.rawValue) } ?? "Pending"
            uploadedDate = item.uploadedDate ?? Date()
            reviewedDate = item.reviewedDate ?? Date()
            rejectionReason = item.rejectionReason ?? ""
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}