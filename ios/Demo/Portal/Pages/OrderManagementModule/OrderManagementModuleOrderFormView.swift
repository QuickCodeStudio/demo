import SwiftUI
import QuickCodeHTTP
import OrderManagementModuleClient

struct OrderManagementModuleOrderFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var customerId = ""
    @State private var sellerId = ""
    @State private var orderNumber = ""
    @State private var totalAmount = ""
    @State private var shippingAddress = ""
    @State private var status = "PendingPayment"
    @State private var orderDate = Date()
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
                    NumberField(label: "customer Id", text: $customerId)
                    NumberField(label: "seller Id", text: $sellerId)
                    FieldLabel(label: "order Number") { TextField("order Number", text: $orderNumber) }
                    NumberField(label: "total Amount", text: $totalAmount, decimal: true)
                    FieldLabel(label: "shipping Address") { TextField("shipping Address", text: $shippingAddress) }
                    SelectField(label: "status", options: [(id: "PendingPayment", name: "Pending Payment"), (id: "Processing", name: "Processing"), (id: "Shipped", name: "Shipped"), (id: "Delivered", name: "Delivered"), (id: "Completed", name: "Completed"), (id: "Cancelled", name: "Cancelled"), (id: "ReturnRequested", name: "Return Requested")], selection: $status)
                    DateField(label: "order Date", date: $orderDate)
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
        .navigationTitle(keys.isEmpty ? "Orders" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.OrdersInsert(body: .json(.init(value1: .init(
                id: 0,
                customerId: Int32(customerId) ?? 0,
                sellerId: Int32(sellerId) ?? 0,
                orderNumber: orderNumber,
                totalAmount: Double(totalAmount) ?? 0,
                shippingAddress: shippingAddress,
                status: .init(value1: { switch status {
case "PendingPayment": .PendingPayment
case "Processing": .Processing
case "Shipped": .Shipped
case "Delivered": .Delivered
case "Completed": .Completed
case "Cancelled": .Cancelled
case "ReturnRequested": .ReturnRequested
default: .PendingPayment
} }()),
                orderDate: orderDate
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.OrdersUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(value1: .init(
                id: Int32(keys[0]) ?? 0,
                customerId: Int32(customerId) ?? 0,
                sellerId: Int32(sellerId) ?? 0,
                orderNumber: orderNumber,
                totalAmount: Double(totalAmount) ?? 0,
                shippingAddress: shippingAddress,
                status: .init(value1: { switch status {
case "PendingPayment": .PendingPayment
case "Processing": .Processing
case "Shipped": .Shipped
case "Delivered": .Delivered
case "Completed": .Completed
case "Cancelled": .Cancelled
case "ReturnRequested": .ReturnRequested
default: .PendingPayment
} }()),
                orderDate: orderDate
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
            let output = try await client.OrdersGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            customerId = item.customerId.map { PortalNumber.integer($0) } ?? ""
            sellerId = item.sellerId.map { PortalNumber.integer($0) } ?? ""
            orderNumber = item.orderNumber ?? ""
            totalAmount = item.totalAmount.map { PortalNumber.decimal($0) } ?? ""
            shippingAddress = item.shippingAddress ?? ""
            status = item.status.map { String($0.value1.rawValue) } ?? "PendingPayment"
            orderDate = item.orderDate ?? Date()
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}