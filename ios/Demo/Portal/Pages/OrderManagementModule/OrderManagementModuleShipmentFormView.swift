import SwiftUI
import QuickCodeHTTP
import OrderManagementModuleClient

struct OrderManagementModuleShipmentFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var orderId = ""
    @State private var shippingMethodId = ""
    @State private var trackingNumber = ""
    @State private var status = "Pending"
    @State private var shippedDate = Date()
    @State private var deliveredDate = Date()
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
                    PortalForeignKeyField(label: "shipping Method", module: "order-management-module", model: "shipping-methods", text: $shippingMethodId)
                    FieldLabel(label: "tracking Number") { TextField("tracking Number", text: $trackingNumber) }
                    SelectField(label: "status", options: [(id: "Pending", name: "Pending"), (id: "InTransit", name: "In Transit"), (id: "Delivered", name: "Delivered"), (id: "FailedDelivery", name: "Failed Delivery")], selection: $status)
                    DateField(label: "shipped Date", date: $shippedDate)
                    DateField(label: "delivered Date", date: $deliveredDate)
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
        .navigationTitle(keys.isEmpty ? "Shipments" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ShipmentsInsert(body: .json(.init(value1: .init(
                id: 0,
                orderId: Int32(orderId) ?? 0,
                shippingMethodId: Int32(shippingMethodId) ?? 0,
                trackingNumber: trackingNumber,
                status: .init(value1: { switch status {
case "Pending": .Pending
case "InTransit": .InTransit
case "Delivered": .Delivered
case "FailedDelivery": .FailedDelivery
default: .Pending
} }()),
                shippedDate: shippedDate,
                deliveredDate: deliveredDate
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ShipmentsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(value1: .init(
                id: Int32(keys[0]) ?? 0,
                orderId: Int32(orderId) ?? 0,
                shippingMethodId: Int32(shippingMethodId) ?? 0,
                trackingNumber: trackingNumber,
                status: .init(value1: { switch status {
case "Pending": .Pending
case "InTransit": .InTransit
case "Delivered": .Delivered
case "FailedDelivery": .FailedDelivery
default: .Pending
} }()),
                shippedDate: shippedDate,
                deliveredDate: deliveredDate
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
            let output = try await client.ShipmentsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            orderId = item.orderId.map { PortalNumber.integer($0) } ?? ""
            shippingMethodId = item.shippingMethodId.map { PortalNumber.integer($0) } ?? ""
            trackingNumber = item.trackingNumber ?? ""
            status = item.status.map { String($0.value1.rawValue) } ?? "Pending"
            shippedDate = item.shippedDate ?? Date()
            deliveredDate = item.deliveredDate ?? Date()
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}