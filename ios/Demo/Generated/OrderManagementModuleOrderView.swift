import SwiftUI
import QuickCodeHTTP
import OrderManagementModuleClient

/// Analysis detail (Order) with confirmable Update actions: CANCEL_ORDER + UPDATE_STATUS.
struct OrderManagementModuleOrderView: View {
    let keys: [String]
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @State private var row: GatewayRow?
    @State private var loading = true
    @State private var failure: String?
    @State private var confirmCancel = false
    @State private var confirmStatus = false
    @State private var statusPickerOpen = false
    @State private var statusDetent: PresentationDetent = .medium
    @State private var pendingStatus = ""
    @State private var acting = false

    private var statusOptions: [PortalChoiceRail.Option] {
        [
            .init(id: "PendingPayment", title: "Pending payment", detail: "Waiting for payment to clear", symbol: "creditcard", tone: Color(hex: 0xE0A100)),
            .init(id: "Processing", title: "Processing", detail: "Order is being prepared", symbol: "gearshape.2", tone: Brand.action),
            .init(id: "Shipped", title: "Shipped", detail: "On the way to the customer", symbol: "box.truck", tone: Color(hex: 0x2A9D8F)),
            .init(id: "Delivered", title: "Delivered", detail: "Arrived with the customer", symbol: "shippingbox", tone: Color(hex: 0x3D8BFF)),
            .init(id: "Completed", title: "Completed", detail: "Closed successfully", symbol: "checkmark.seal", tone: Color(hex: 0x34C759)),
            .init(id: "Cancelled", title: "Cancelled", detail: "Order was cancelled", symbol: "xmark.circle", tone: Color(hex: 0xE5484D)),
            .init(id: "ReturnRequested", title: "Return requested", detail: "Customer asked for a return", symbol: "arrow.uturn.backward.circle", tone: Color(hex: 0x8E8E93))
        ]
    }

    private var amountText: String {
        row?.fields.first { $0.id == "totalAmount" }?.text ?? ""
    }

    var body: some View {
        Group {
            if loading, row == nil, failure == nil {
                LoadingState()
            } else if let failure, row == nil {
                ErrorState(message: failure, retry: { Task { await load() } })
            } else if let row {
                ScreenCanvas {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 28) {
                            PortalRecordHeader(
                                title: row.title,
                                subtitle: row.subtitle,
                                image: row.image,
                                metric: amountText.isEmpty ? nil : amountText,
                                metricLabel: "Total"
                            )

                            PortalValueList(
                                values: row.fields,
                                hiding: ["orderNumber", "status", "totalAmount", "Order Number", "Status", "Total Amount"]
                            )

                            PortalDetailActionBar(
                                items: [
                                    .init(id: "status", title: "Change status", perform: {
                                        statusDetent = .medium
                                        statusPickerOpen = true
                                    }),
                                    .init(id: "cancel", title: "Cancel order", destructive: true, perform: { confirmCancel = true })
                                ],
                                busy: acting
                            )
                        }
                        .padding(.vertical, ShellMetrics.screenPadding)
                        .padding(.horizontal, ShellMetrics.screenPadding)
                        .padding(.bottom, 28)
                    }
                }
            }
        }
        .navigationTitle("Order")
        .navigationBarTitleDisplayMode(.inline)
        .portalShellChrome()
        .alert("Cancel this order?", isPresented: $confirmCancel) {
            Button("Cancel order", role: .destructive) { Task { await cancelOrder() } }
            Button("Keep", role: .cancel) {}
        } message: {
            Text("The order status will become cancelled. This cannot be undone.")
        }
        .alert("Change status to \(PortalChoiceRail.humanize(pendingStatus))?", isPresented: $confirmStatus) {
            Button("Update status") { Task { await updateStatus() } }
            Button("Keep", role: .cancel) {}
        } message: {
            Text("Please confirm before updating the order status.")
        }
        .sheet(isPresented: $statusPickerOpen) {
            PortalChoiceRail(
                title: "Set status",
                subtitle: row?.subtitle.isEmpty == false
                    ? "Now: \(PortalChoiceRail.humanize(row?.subtitle ?? ""))"
                    : "Pick the next step for this order.",
                options: statusOptions,
                selectedId: row?.subtitle,
                onSelect: { option in
                    pendingStatus = option.id
                    statusPickerOpen = false
                    confirmStatus = true
                },
                onClose: { statusPickerOpen = false }
            )
            .presentationDetents([.medium, .large], selection: $statusDetent)
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(28)
        }
        .task { await load() }
    }

    private func load() async {
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.OrdersGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            withAnimation(.snappy(duration: 0.3)) {
                row = GatewayRow(
                    id: item.id.map { String($0) } ?? keys.joined(separator: "|"),
                    recordId: item.id.map { Int($0) },
                    keys: [item.id.map { String($0) } ?? keys.first ?? ""],
                    title: item.orderNumber ?? "Order",
                    subtitle: item.status.map { String($0.value1.rawValue) } ?? "",
                    image: nil,
                    fields: [
                        PortalValue(id: "orderNumber", label: "Order Number", text: item.orderNumber ?? "", kind: .text),
                        PortalValue(id: "status", label: "Status", text: item.status.map { String($0.value1.rawValue) } ?? "", kind: .text),
                        PortalValue(id: "totalAmount", label: "Total Amount", text: item.totalAmount.map { PortalNumber.decimal($0) } ?? "", kind: .decimal),
                        PortalValue(id: "orderDate", label: "Order Date", text: item.orderDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date),
                        PortalValue(id: "customerId", label: "Customer Id", text: item.customerId.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true)
                    ]
                )
            }
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private func cancelOrder() async {
        acting = true
        defer { acting = false }
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.OrdersCancelOrder(
                path: .init(orderId: Int32(keys[0]) ?? 0),
                body: .json(.init(value1: .init()))
            )
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            toast.show("Order cancelled")
            await load()
        } catch {
            failure = PortalErrors.record(error)
        }
    }

    private func updateStatus() async {
        acting = true
        defer { acting = false }
        do {
            let statusCase: Components.Schemas.QuickCode_period_Demo_period_OrderManagementModule_period_Domain_period_Enums_period_OrderStatus = {
                switch pendingStatus {
                case "PendingPayment": return .PendingPayment
                case "Processing": return .Processing
                case "Shipped": return .Shipped
                case "Delivered": return .Delivered
                case "Completed": return .Completed
                case "Cancelled": return .Cancelled
                case "ReturnRequested": return .ReturnRequested
                default: return .Processing
                }
            }()
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.OrdersUpdateStatus(
                path: .init(orderId: Int32(keys[0]) ?? 0),
                body: .json(.init(value1: .init(orderStatus: .init(value1: statusCase))))
            )
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            toast.show("Status updated")
            await load()
        } catch {
            failure = PortalErrors.record(error)
        }
    }
}
