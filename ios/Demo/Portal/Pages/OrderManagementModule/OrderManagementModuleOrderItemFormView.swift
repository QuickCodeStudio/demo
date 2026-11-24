import SwiftUI
import QuickCodeHTTP
import OrderManagementModuleClient

struct OrderManagementModuleOrderItemFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var orderId = ""
    @State private var productVariantId = ""
    @State private var productName = ""
    @State private var sku = ""
    @State private var quantity = ""
    @State private var unitPrice = ""
    @State private var totalPrice = ""
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
                    PortalForeignKeyField(label: "order", module: "order-management-module", model: "orders", text: $orderId)
                    NumberField(label: "product Variant Id", text: $productVariantId)
                    FieldLabel(label: "product Name") { TextField("product Name", text: $productName) }
                    FieldLabel(label: "sku") { TextField("sku", text: $sku) }
                    NumberField(label: "quantity", text: $quantity)
                    NumberField(label: "unit Price", text: $unitPrice, decimal: true)
                    NumberField(label: "total Price", text: $totalPrice, decimal: true)
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
        .navigationTitle(keys.isEmpty ? "Order Items" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.OrderItemsInsert(body: .json(.init(value1: .init(
                id: 0,
                orderId: Int32(orderId) ?? 0,
                productVariantId: Int32(productVariantId) ?? 0,
                productName: productName,
                sku: sku,
                quantity: Int32(quantity) ?? 0,
                unitPrice: Double(unitPrice) ?? 0,
                totalPrice: Double(totalPrice) ?? 0
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.OrderItemsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(value1: .init(
                id: Int32(keys[0]) ?? 0,
                orderId: Int32(orderId) ?? 0,
                productVariantId: Int32(productVariantId) ?? 0,
                productName: productName,
                sku: sku,
                quantity: Int32(quantity) ?? 0,
                unitPrice: Double(unitPrice) ?? 0,
                totalPrice: Double(totalPrice) ?? 0
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
            let output = try await client.OrderItemsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            orderId = item.orderId.map { PortalNumber.integer($0) } ?? ""
            productVariantId = item.productVariantId.map { PortalNumber.integer($0) } ?? ""
            productName = item.productName ?? ""
            sku = item.sku ?? ""
            quantity = item.quantity.map { PortalNumber.integer($0) } ?? ""
            unitPrice = item.unitPrice.map { PortalNumber.decimal($0) } ?? ""
            totalPrice = item.totalPrice.map { PortalNumber.decimal($0) } ?? ""
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}