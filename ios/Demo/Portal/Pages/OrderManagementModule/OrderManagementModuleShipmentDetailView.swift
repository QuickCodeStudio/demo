import SwiftUI
import QuickCodeHTTP
import OrderManagementModuleClient

struct OrderManagementModuleShipmentDetailView: View {
    let keys: [String]
    @Environment(SessionStore.self) private var session
    @Environment(PortalAccess.self) private var access
    @State private var row: GatewayRow?
    @State private var loading = true
    @State private var failure: String?
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    @State private var confirmDelete = false

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
                        }
                        .padding(.vertical, ShellMetrics.screenPadding)
                        .padding(.horizontal, ShellMetrics.screenPadding)
                    }
                }
            }
        }
        .navigationTitle("Shipments")

        .portalSafeRail(detailSafeRailActions, showsBack: true)
        .navigationDestination(isPresented: $openEditor) {
            OrderManagementModuleShipmentFormView(keys: keys)
        }
        .portalDeleteConfirm(isPresented: $confirmDelete, onConfirm: { Task { await remove() } })

        .task { await load() }
    }

    private func load() async {
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ShipmentsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            let loaded = GatewayRow(
                    id: String(describing: item.id),
                    recordId: item.id.map { Int($0) },
                    keys: [],
                    title: item.trackingNumber ?? "",
                    subtitle: item.status.map { String($0.value1.rawValue) } ?? "",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: item.id.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "orderId", label: "Order Id", text: item.orderId.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "shippingMethodId", label: "Shipping Method Id", text: item.shippingMethodId.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "trackingNumber", label: "Tracking Number", text: item.trackingNumber ?? "", kind: .text),
                    PortalValue(id: "status", label: "Status", text: item.status.map { String($0.value1.rawValue) } ?? "", kind: .text),
                    PortalValue(id: "shippedDate", label: "Shipped Date", text: item.shippedDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date),
                    PortalValue(id: "deliveredDate", label: "Delivered Date", text: item.deliveredDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date)
                    ]
                )
            row = await PortalRefEnricher.enrich(loaded, module: "order-management-module", session: session)
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private var detailSafeRailActions: [PortalSafeRail.Action] {
        var items: [PortalSafeRail.Action] = []
        if access.allows("OrderManagementModuleShipments", "Delete") {
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
        if access.allows("OrderManagementModuleShipments", "Update") {
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
            let output = try await client.ShipmentsDelete(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            toast.show("Deleted")
            dismiss()
        } catch {
            failure = PortalErrors.record(error)
        }
    }
}