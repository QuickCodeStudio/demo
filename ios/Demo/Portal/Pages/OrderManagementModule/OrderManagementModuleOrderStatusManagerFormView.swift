import SwiftUI
import QuickCodeHTTP
import OrderManagementModuleClient

struct OrderManagementModuleOrderStatusManagerFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var orderId = ""
    @State private var previousStatus = "PendingPayment"
    @State private var newStatus = "PendingPayment"
    @State private var changedByUserId = ""
    @State private var changeDate = Date()
    @State private var notes = ""
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
                    NumberField(label: "order Id", text: $orderId)
                    SelectField(label: "previous Status", options: [(id: "PendingPayment", name: "Pending Payment"), (id: "Processing", name: "Processing"), (id: "Shipped", name: "Shipped"), (id: "Delivered", name: "Delivered"), (id: "Completed", name: "Completed"), (id: "Cancelled", name: "Cancelled"), (id: "ReturnRequested", name: "Return Requested")], selection: $previousStatus)
                    SelectField(label: "new Status", options: [(id: "PendingPayment", name: "Pending Payment"), (id: "Processing", name: "Processing"), (id: "Shipped", name: "Shipped"), (id: "Delivered", name: "Delivered"), (id: "Completed", name: "Completed"), (id: "Cancelled", name: "Cancelled"), (id: "ReturnRequested", name: "Return Requested")], selection: $newStatus)
                    NumberField(label: "changed By User Id", text: $changedByUserId)
                    DateField(label: "change Date", date: $changeDate)
                    LongTextField(label: "notes", text: $notes)
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
        .navigationTitle(keys.isEmpty ? "Order Status Managers" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.OrderStatusManagersInsert(body: .json(.init(value1: .init(
                id: 0,
                orderId: Int32(orderId) ?? 0,
                previousStatus: .init(value1: { switch previousStatus {
case "PendingPayment": .PendingPayment
case "Processing": .Processing
case "Shipped": .Shipped
case "Delivered": .Delivered
case "Completed": .Completed
case "Cancelled": .Cancelled
case "ReturnRequested": .ReturnRequested
default: .PendingPayment
} }()),
                newStatus: .init(value1: { switch newStatus {
case "PendingPayment": .PendingPayment
case "Processing": .Processing
case "Shipped": .Shipped
case "Delivered": .Delivered
case "Completed": .Completed
case "Cancelled": .Cancelled
case "ReturnRequested": .ReturnRequested
default: .PendingPayment
} }()),
                changedByUserId: Int32(changedByUserId) ?? 0,
                changeDate: changeDate,
                notes: notes
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.OrderStatusManagersUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(value1: .init(
                id: Int32(keys[0]) ?? 0,
                orderId: Int32(orderId) ?? 0,
                previousStatus: .init(value1: { switch previousStatus {
case "PendingPayment": .PendingPayment
case "Processing": .Processing
case "Shipped": .Shipped
case "Delivered": .Delivered
case "Completed": .Completed
case "Cancelled": .Cancelled
case "ReturnRequested": .ReturnRequested
default: .PendingPayment
} }()),
                newStatus: .init(value1: { switch newStatus {
case "PendingPayment": .PendingPayment
case "Processing": .Processing
case "Shipped": .Shipped
case "Delivered": .Delivered
case "Completed": .Completed
case "Cancelled": .Cancelled
case "ReturnRequested": .ReturnRequested
default: .PendingPayment
} }()),
                changedByUserId: Int32(changedByUserId) ?? 0,
                changeDate: changeDate,
                notes: notes
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
            let output = try await client.OrderStatusManagersGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            orderId = item.orderId.map { PortalNumber.integer($0) } ?? ""
            previousStatus = item.previousStatus.map { String($0.value1.rawValue) } ?? "PendingPayment"
            newStatus = item.newStatus.map { String($0.value1.rawValue) } ?? "PendingPayment"
            changedByUserId = item.changedByUserId.map { PortalNumber.integer($0) } ?? ""
            changeDate = item.changeDate ?? Date()
            notes = item.notes ?? ""
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}