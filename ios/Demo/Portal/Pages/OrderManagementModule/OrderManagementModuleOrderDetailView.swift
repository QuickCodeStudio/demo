import SwiftUI
import QuickCodeHTTP
import OrderManagementModuleClient

struct OrderManagementModuleOrderDetailView: View {
    let keys: [String]
    @Environment(SessionStore.self) private var session
    @Environment(PortalAccess.self) private var access
    @State private var row: GatewayRow?
    @State private var loading = true
    @State private var failure: String?
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    @State private var confirmDelete = false
    @State private var related0: [GatewayRow] = []
    @State private var related1: [GatewayRow] = []
    @State private var related2: [GatewayRow] = []
    @State private var related3: [GatewayRow] = []

    @State private var openEditor = false

    var body: some View {
        Group {
            if loading, row == nil, failure == nil {
                LoadingState()
            } else if let failure, row == nil {
                ErrorState(message: failure, retry: { Task { await load() } })
            } else if let row {
                ScreenCanvas {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            PortalRecordHeader(title: row.title, subtitle: row.subtitle, image: row.image)
                            PortalValueList(values: row.fields)
                            PortalRelatedSection(title: "Order Items", rows: related0) { keys in
                                OrderManagementModuleOrderItemDetailView(keys: keys)
                            }
                            PortalRelatedSection(title: "Order Status Histories", rows: related1) { keys in
                                OrderManagementModuleOrderStatusHistoryDetailView(keys: keys)
                            }
                            PortalRelatedSection(title: "Return Requests", rows: related2) { keys in
                                OrderManagementModuleReturnRequestDetailView(keys: keys)
                            }
                            PortalRelatedSection(title: "Shipments", rows: related3) { keys in
                                OrderManagementModuleShipmentDetailView(keys: keys)
                            }
                        }
                        .padding(.vertical, ShellMetrics.screenPadding)
                        .padding(.horizontal, ShellMetrics.screenPadding)
                    }
                }
            }
        }
        .navigationTitle("Orders")

        .portalSafeRail(detailSafeRailActions, showsBack: true)
        .navigationDestination(isPresented: $openEditor) {
            OrderManagementModuleOrderFormView(keys: keys)
        }
        .portalDeleteConfirm(isPresented: $confirmDelete, onConfirm: { Task { await remove() } })

        .task { await load() }
    }

    private func load() async {
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.OrdersGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            let loaded = GatewayRow(
                    id: String(describing: item.id),
                    recordId: item.id.map { Int($0) },
                    keys: [],
                    title: item.orderNumber ?? "",
                    subtitle: item.status.map { String($0.value1.rawValue) } ?? "",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: item.id.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "customerId", label: "Customer Id", text: item.customerId.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "sellerId", label: "Seller Id", text: item.sellerId.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "orderNumber", label: "Order Number", text: item.orderNumber ?? "", kind: .text),
                    PortalValue(id: "totalAmount", label: "Total Amount", text: item.totalAmount.map { PortalNumber.decimal($0) } ?? "", kind: .decimal),
                    PortalValue(id: "shippingAddress", label: "Shipping Address", text: item.shippingAddress ?? "", kind: .text),
                    PortalValue(id: "status", label: "Status", text: item.status.map { String($0.value1.rawValue) } ?? "", kind: .text),
                    PortalValue(id: "orderDate", label: "Order Date", text: item.orderDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date)
                    ]
                )
            row = await PortalRefEnricher.enrich(loaded, module: "order-management-module", session: session)
            do {
                let relatedOutput = try await client.OrderItemsGetByOrderId(path: .init(orderItemOrderId: Int32(keys[0]) ?? 0), query: .init(pageNumber: Int32(1), pageSize: Int32(ShellMetrics.listPageSize)))
                if case .ok(let relatedOk) = relatedOutput {
                    let relatedItems = try relatedOk.body.json
                    related0 = relatedItems.map { item in
                        GatewayRow(
                    id: [item.id.map { String($0) } ?? ""].joined(separator: "|"),
                    recordId: item.id.map { Int($0) },
                    keys: [item.id.map { String($0) } ?? ""],
                    title: item.productName ?? "",
                    subtitle: item.unitPrice.map { PortalNumber.decimal($0) } ?? "",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: item.id.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "productName", label: "Product Name", text: item.productName ?? "", kind: .text),
                    PortalValue(id: "sku", label: "Sku", text: item.sku ?? "", kind: .text),
                    PortalValue(id: "quantity", label: "Quantity", text: item.quantity.map { PortalNumber.integer($0) } ?? "", kind: .integer),
                    PortalValue(id: "unitPrice", label: "Unit Price", text: item.unitPrice.map { PortalNumber.decimal($0) } ?? "", kind: .decimal),
                    PortalValue(id: "totalPrice", label: "Total Price", text: item.totalPrice.map { PortalNumber.decimal($0) } ?? "", kind: .decimal)
                    ]
                )
                    }
                    related0 = await PortalRefEnricher.enrich(related0, module: "order-management-module", session: session)
                }
            } catch {
                related0 = []
            }
            do {
                let relatedOutput = try await client.OrderStatusHistoriesGetByOrderId(path: .init(orderStatusHistoryOrderId: Int32(keys[0]) ?? 0), query: .init(pageNumber: Int32(1), pageSize: Int32(ShellMetrics.listPageSize)))
                if case .ok(let relatedOk) = relatedOutput {
                    let relatedItems = try relatedOk.body.json
                    related1 = relatedItems.map { item in
                        GatewayRow(
                    id: [item.id.map { String($0) } ?? ""].joined(separator: "|"),
                    recordId: item.id.map { Int($0) },
                    keys: [item.id.map { String($0) } ?? ""],
                    title: item.changeDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "",
                    subtitle: item.newStatus.map { String($0.value1.rawValue) } ?? "",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: item.id.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "newStatus", label: "New Status", text: item.newStatus.map { String($0.value1.rawValue) } ?? "", kind: .text),
                    PortalValue(id: "changeDate", label: "Change Date", text: item.changeDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date),
                    PortalValue(id: "notes", label: "Notes", text: item.notes ?? "", kind: .long)
                    ]
                )
                    }
                    related1 = await PortalRefEnricher.enrich(related1, module: "order-management-module", session: session)
                }
            } catch {
                related1 = []
            }
            do {
                let relatedOutput = try await client.ReturnRequestsGetByOrderId(path: .init(returnRequestOrderId: Int32(keys[0]) ?? 0), query: .init(pageNumber: Int32(1), pageSize: Int32(ShellMetrics.listPageSize)))
                if case .ok(let relatedOk) = relatedOutput {
                    let relatedItems = try relatedOk.body.json
                    related2 = relatedItems.map { item in
                        GatewayRow(
                    id: [item.id.map { String($0) } ?? ""].joined(separator: "|"),
                    recordId: item.id.map { Int($0) },
                    keys: [item.id.map { String($0) } ?? ""],
                    title: item.status.map { String($0.value1.rawValue) } ?? "",
                    subtitle: item.requestedDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: item.id.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "status", label: "Status", text: item.status.map { String($0.value1.rawValue) } ?? "", kind: .text),
                    PortalValue(id: "reason", label: "Reason", text: item.reason ?? "", kind: .long),
                    PortalValue(id: "requestedDate", label: "Requested Date", text: item.requestedDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date)
                    ]
                )
                    }
                    related2 = await PortalRefEnricher.enrich(related2, module: "order-management-module", session: session)
                }
            } catch {
                related2 = []
            }
            do {
                let relatedOutput = try await client.ShipmentsGetByOrderId(path: .init(shipmentOrderId: Int32(keys[0]) ?? 0), query: .init(pageNumber: Int32(1), pageSize: Int32(ShellMetrics.listPageSize)))
                if case .ok(let relatedOk) = relatedOutput {
                    let relatedItems = try relatedOk.body.json
                    related3 = relatedItems.map { item in
                        GatewayRow(
                    id: [item.id.map { String($0) } ?? ""].joined(separator: "|"),
                    recordId: item.id.map { Int($0) },
                    keys: [item.id.map { String($0) } ?? ""],
                    title: item.trackingNumber ?? "",
                    subtitle: item.status.map { String($0.value1.rawValue) } ?? "",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: item.id.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "trackingNumber", label: "Tracking Number", text: item.trackingNumber ?? "", kind: .text),
                    PortalValue(id: "status", label: "Status", text: item.status.map { String($0.value1.rawValue) } ?? "", kind: .text),
                    PortalValue(id: "shippedDate", label: "Shipped Date", text: item.shippedDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date)
                    ]
                )
                    }
                    related3 = await PortalRefEnricher.enrich(related3, module: "order-management-module", session: session)
                }
            } catch {
                related3 = []
            }
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private var detailSafeRailActions: [PortalSafeRail.Action] {
        var items: [PortalSafeRail.Action] = []
        if access.allows("OrderManagementModuleOrders", "Delete") {
            items.append(
                PortalSafeRail.Action(
                    id: "delete",
                    systemName: "trash",
                    role: .destructive,
                    accessibilityLabel: "Delete",
                    perform: { confirmDelete = true }
                )
            )
        }
        if access.allows("OrderManagementModuleOrders", "Update") {
            items.append(
                PortalSafeRail.Action(
                    id: "edit",
                    systemName: "pencil",
                    accessibilityLabel: "Edit",
                    perform: { openEditor = true }
                )
            )
        }
        return items
    }

    private func remove() async {
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.OrdersDelete(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            toast.show("Deleted")
            dismiss()
        } catch {
            failure = PortalErrors.record(error)
        }
    }
}