import SwiftUI
import QuickCodeHTTP
import ProductCatalogModuleClient

struct ProductCatalogModuleProductFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var sellerId = ""
    @State private var brandId = ""
    @State private var primaryCategoryId = ""
    @State private var sku = ""
    @State private var name = ""
    @State private var description = ""
    @State private var photo = ""
    @State private var video = ""
    @State private var datasheet = ""
    @State private var status = "Draft"
    @State private var isFeatured = false
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
                    PortalForeignKeyField(label: "brand", module: "product-catalog-module", model: "brands", text: $brandId)
                    PortalForeignKeyField(label: "primary Category", module: "product-catalog-module", model: "categories", text: $primaryCategoryId)
                    FieldLabel(label: "sku") { TextField("sku", text: $sku) }
                    FieldLabel(label: "name") { TextField("name", text: $name) }
                    LongTextField(label: "description", text: $description)
                    MediaUploadField(label: "photo", kind: .image, text: $photo)
                    MediaUploadField(label: "video", kind: .video, text: $video)
                    MediaUploadField(label: "datasheet", kind: .pdf, text: $datasheet)
                    SelectField(label: "status", options: [(id: "Draft", name: "Draft"), (id: "PendingApproval", name: "Pending Approval"), (id: "Active", name: "Active"), (id: "Inactive", name: "Inactive"), (id: "Discontinued", name: "Discontinued")], selection: $status)
                    SwitchField(label: "is Featured", isOn: $isFeatured)
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
        .navigationTitle(keys.isEmpty ? "Products" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ProductsInsert(body: .json(.init(
                id: 0,
                sellerId: Int32(sellerId) ?? 0,
                brandId: Int32(brandId) ?? 0,
                primaryCategoryId: Int32(primaryCategoryId) ?? 0,
                sku: sku,
                name: name,
                description: description,
                photo: photo,
                video: video,
                datasheet: datasheet,
                status: { switch status {
case "Draft": .Draft
case "PendingApproval": .PendingApproval
case "Active": .Active
case "Inactive": .Inactive
case "Discontinued": .Discontinued
default: .Draft
} }(),
                isFeatured: isFeatured,
                createdDate: createdDate
            )))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ProductsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(
                id: Int32(keys[0]) ?? 0,
                sellerId: Int32(sellerId) ?? 0,
                brandId: Int32(brandId) ?? 0,
                primaryCategoryId: Int32(primaryCategoryId) ?? 0,
                sku: sku,
                name: name,
                description: description,
                photo: photo,
                video: video,
                datasheet: datasheet,
                status: { switch status {
case "Draft": .Draft
case "PendingApproval": .PendingApproval
case "Active": .Active
case "Inactive": .Inactive
case "Discontinued": .Discontinued
default: .Draft
} }(),
                isFeatured: isFeatured,
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
            let output = try await client.ProductsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            sellerId = PortalNumber.integer(item.sellerId)
            brandId = PortalNumber.integer(item.brandId)
            primaryCategoryId = PortalNumber.integer(item.primaryCategoryId)
            sku = item.sku
            name = item.name
            description = item.description
            photo = item.photo
            video = item.video
            datasheet = item.datasheet
            status = String(item.status.rawValue)
            isFeatured = item.isFeatured
            createdDate = item.createdDate
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}