import SwiftUI
import QuickCodeHTTP
import ProductCatalogModuleClient

struct ProductCatalogModuleProductVariantFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var productId = ""
    @State private var sku = ""
    @State private var price = ""
    @State private var stockQuantity = ""
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
                    PortalForeignKeyField(label: "product", module: "product-catalog-module", model: "products", text: $productId)
                    FieldLabel(label: "sku") { TextField("sku", text: $sku) }
                    NumberField(label: "price", text: $price, decimal: true)
                    NumberField(label: "stock Quantity", text: $stockQuantity)
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
        .navigationTitle(keys.isEmpty ? "Product Variants" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ProductVariantsInsert(body: .json(.init(
                id: 0,
                productId: Int32(productId) ?? 0,
                sku: sku,
                price: Double(price) ?? 0,
                stockQuantity: Int32(stockQuantity) ?? 0,
                isActive: isActive
            )))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ProductVariantsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(
                id: Int32(keys[0]) ?? 0,
                productId: Int32(productId) ?? 0,
                sku: sku,
                price: Double(price) ?? 0,
                stockQuantity: Int32(stockQuantity) ?? 0,
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
            let output = try await client.ProductVariantsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            productId = PortalNumber.integer(item.productId)
            sku = item.sku
            price = PortalNumber.decimal(item.price)
            stockQuantity = PortalNumber.integer(item.stockQuantity)
            isActive = item.isActive
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}