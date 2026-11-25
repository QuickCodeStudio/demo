import SwiftUI
import QuickCodeHTTP
import OrderManagementModuleClient

/// Buyer "My orders" — filterBinding: CUSTOMER_ID ← session (GET_BY_CUSTOMER_ID).
struct MyOrdersListView: View {
    @Environment(SessionStore.self) private var session
    @State private var rows: [GatewayRow] = []
    @State private var pageNumber = 1
    @State private var search = ""
    @State private var loading = true
    @State private var failure: String?

    private var visible: [GatewayRow] {
        let needle = search.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !needle.isEmpty else { return rows }
        return rows.filter {
            $0.title.localizedStandardContains(needle)
                || $0.subtitle.localizedStandardContains(needle)
                || $0.fields.contains { $0.text.localizedStandardContains(needle) }
        }
    }

    var body: some View {
        Group {
            if loading, rows.isEmpty, failure == nil {
                LoadingState()
            } else if let failure, rows.isEmpty {
                ErrorState(message: failure, retry: { Task { await load() } })
            } else {
                ScreenCanvas {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 12) {
                            PortalSearchField(text: $search)
                            Text(rows.isEmpty ? "No orders for this customer" : "\(visible.count) orders")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            if visible.isEmpty {
                                EmptyState(title: "No orders", actionTitle: "Try again") {
                                    Task { await load() }
                                }
                            } else {
                                ForEach(visible) { row in
                                    NavigationLink(value: row.keys) {
                                        RecordListRow(row: row)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                        .padding(.vertical, ShellMetrics.screenPadding)
                        .padding(.horizontal, ShellMetrics.screenPadding)
                    }
                    .portalStretchRefresh { await load(reset: true) }
                }
            }
        }
        .navigationTitle("My orders")
        .navigationBarTitleDisplayMode(.large)
        .navigationDestination(for: [String].self) { keys in
            OrderManagementModuleOrderView(keys: keys)
        }
        .portalShellChrome()
        .task { await load() }
    }

    private func load(reset: Bool = false) async {
        if reset { pageNumber = 1 }
        loading = true
        failure = nil
        do {
            let customerId = session.customerId
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.OrdersGetByCustomerId(
                path: .init(orderCustomerId: customerId),
                query: .init(pageNumber: Int32(pageNumber), pageSize: Int32(ShellMetrics.listPageSize))
            )
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let items = try ok.body.json
            rows = items.map { item in
                GatewayRow(
                    id: [item.id.map { String($0) } ?? ""].joined(separator: "|"),
                    recordId: item.id.map { Int($0) },
                    keys: [item.id.map { String($0) } ?? ""],
                    title: item.orderNumber ?? "",
                    subtitle: item.status.map { String($0.value1.rawValue) } ?? "",
                    image: nil,
                    fields: [
                        PortalValue(id: "orderNumber", label: "Order Number", text: item.orderNumber ?? "", kind: .text),
                        PortalValue(id: "status", label: "Status", text: item.status.map { String($0.value1.rawValue) } ?? "", kind: .text),
                        PortalValue(id: "totalAmount", label: "Total Amount", text: item.totalAmount.map { PortalNumber.decimal($0) } ?? "", kind: .decimal),
                        PortalValue(id: "orderDate", label: "Order Date", text: item.orderDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date)
                    ]
                )
            }
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }
}
