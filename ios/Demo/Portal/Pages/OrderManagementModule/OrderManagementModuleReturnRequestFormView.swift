import SwiftUI
import QuickCodeHTTP
import OrderManagementModuleClient

struct OrderManagementModuleReturnRequestFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var orderId = ""
    @State private var orderItemId = ""
    @State private var reason = ""
    @State private var status = "Requested"
    @State private var requestedDate = Date()
    @State private var updatedDate = Date()
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
                    PortalForeignKeyField(label: "order Item", module: "order-management-module", model: "order-items", text: $orderItemId)
                    LongTextField(label: "reason", text: $reason)
                    SelectField(label: "status", options: [(id: "Requested", name: "Requested"), (id: "Approved", name: "Approved"), (id: "Rejected", name: "Rejected"), (id: "ShippedByCustomer", name: "Shipped By Customer"), (id: "Received", name: "Received"), (id: "Completed", name: "Completed")], selection: $status)
                    DateField(label: "requested Date", date: $requestedDate)
                    DateField(label: "updated Date", date: $updatedDate)
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
        .navigationTitle(keys.isEmpty ? "Return Requests" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ReturnRequestsInsert(body: .json(.init(value1: .init(
                id: 0,
                orderId: Int32(orderId) ?? 0,
                orderItemId: Int32(orderItemId) ?? 0,
                reason: reason,
                status: .init(value1: { switch status {
case "Requested": .Requested
case "Approved": .Approved
case "Rejected": .Rejected
case "ShippedByCustomer": .ShippedByCustomer
case "Received": .Received
case "Completed": .Completed
default: .Requested
} }()),
                requestedDate: requestedDate,
                updatedDate: updatedDate
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ReturnRequestsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(value1: .init(
                id: Int32(keys[0]) ?? 0,
                orderId: Int32(orderId) ?? 0,
                orderItemId: Int32(orderItemId) ?? 0,
                reason: reason,
                status: .init(value1: { switch status {
case "Requested": .Requested
case "Approved": .Approved
case "Rejected": .Rejected
case "ShippedByCustomer": .ShippedByCustomer
case "Received": .Received
case "Completed": .Completed
default: .Requested
} }()),
                requestedDate: requestedDate,
                updatedDate: updatedDate
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
            let output = try await client.ReturnRequestsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            orderId = item.orderId.map { PortalNumber.integer($0) } ?? ""
            orderItemId = item.orderItemId.map { PortalNumber.integer($0) } ?? ""
            reason = item.reason ?? ""
            status = item.status.map { String($0.value1.rawValue) } ?? "Requested"
            requestedDate = item.requestedDate ?? Date()
            updatedDate = item.updatedDate ?? Date()
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}