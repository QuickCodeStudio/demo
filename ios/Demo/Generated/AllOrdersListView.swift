import SwiftUI
import QuickCodeHTTP
import OrderManagementModuleClient

/// Browse-by-customer orders — filterBinding: CUSTOMER_ID ← picker (lookup OrdersList).
struct AllOrdersListView: View {
    @Environment(SessionStore.self) private var session
    @State private var rows: [GatewayRow] = []
    @State private var pageNumber = 1
    @State private var search = ""
    @State private var loading = true
    @State private var failure: String?
    @State private var filterOptions: [(id: Int32, label: String)] = []
    @State private var selectedFilterId: Int32?
    @State private var optionsLoading = true

    private var visible: [GatewayRow] {
        let needle = search.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !needle.isEmpty else { return rows }
        return rows.filter {
            $0.title.localizedStandardContains(needle)
                || $0.subtitle.localizedStandardContains(needle)
                || $0.fields.contains { $0.text.localizedStandardContains(needle) }
        }
    }

    private var showInitialLoad: Bool {
        loading && rows.isEmpty && failure == nil && selectedFilterId != nil && !optionsLoading
    }

    var body: some View {
        Group {
            if showInitialLoad {
                LoadingState()
            } else if let failure, rows.isEmpty {
                ErrorState(message: failure, retry: { Task { await load() } })
            } else {
                ScreenCanvas {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 14) {
                            if optionsLoading && filterOptions.isEmpty {
                                PortalLookupCombo(
                                    title: "Customer",
                                    options: [],
                                    selection: $selectedFilterId,
                                    isLoadingOptions: true,
                                    isRefreshing: false
                                )
                            } else if filterOptions.isEmpty {
                                Text("No customer ids found")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            } else {
                                PortalLookupCombo(
                                    title: "Customer",
                                    options: filterOptions,
                                    selection: $selectedFilterId,
                                    isLoadingOptions: optionsLoading,
                                    isRefreshing: loading
                                )
                                .onChange(of: selectedFilterId) { _, _ in
                                    Task { await load(reset: true) }
                                }
                            }

                            PortalSearchField(text: $search)

                            if loading, !rows.isEmpty || selectedFilterId != nil {
                                HStack(spacing: 10) {
                                    ProgressView()
                                        .controlSize(.small)
                                    Text(loading ? "Updating orders…" : "")
                                        .font(.caption.weight(.medium))
                                        .foregroundStyle(.secondary)
                                    Spacer(minLength: 0)
                                }
                                .opacity(loading ? 1 : 0)
                                .animation(.easeInOut(duration: 0.2), value: loading)
                            }

                            Text(rows.isEmpty && !loading ? "No orders for this customer" : "\(visible.count) orders")
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            ZStack(alignment: .top) {
                                if loading {
                                    VStack(spacing: 16) {
                                        QcLoadingMark(width: 64, label: "Loading orders")
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 36)
                                    .transition(.opacity.combined(with: .scale(scale: 0.96)))
                                } else if visible.isEmpty {
                                    EmptyState(title: "No orders", actionTitle: "Try again") {
                                        Task { await load() }
                                    }
                                } else {
                                    VStack(spacing: 10) {
                                        ForEach(visible) { row in
                                            NavigationLink(value: row.keys) {
                                                RecordListRow(row: row)
                                            }
                                            .buttonStyle(.plain)
                                        }
                                    }
                                    .transition(.opacity)
                                }
                            }
                            .animation(.snappy(duration: 0.32), value: loading)
                            .animation(.snappy(duration: 0.32), value: selectedFilterId)
                        }
                        .padding(.vertical, ShellMetrics.screenPadding)
                        .padding(.horizontal, ShellMetrics.screenPadding)
                    }
                    .portalStretchRefresh { await load(reset: true) }
                }
            }
        }
        .navigationTitle("All orders")
        .navigationBarTitleDisplayMode(.large)
        .navigationDestination(for: [String].self) { keys in
            OrderManagementModuleOrderView(keys: keys)
        }
        .portalShellChrome()
        .task {
            await loadOptions()
            await load()
        }
    }

    private func loadOptions() async {
        optionsLoading = true
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.OrdersList(
                query: .init(page: 1, size: Int32(ShellMetrics.listPageSize), includeCount: false)
            )
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let page = try ok.body.json
            let items = page.items ?? []
            var seen = Set<Int32>()
            var options: [(id: Int32, label: String)] = []
            for item in items {
                guard let id = item.customerId else { continue }
                if seen.insert(id).inserted {
                    options.append((id: id, label: "Customer \(id)"))
                }
            }
            filterOptions = options.sorted { $0.id < $1.id }
            if selectedFilterId == nil {
                selectedFilterId = filterOptions.first?.id ?? session.customerId
            }
            optionsLoading = false
        } catch {
            filterOptions = [(id: session.customerId, label: "Customer \(session.customerId)")]
            if selectedFilterId == nil { selectedFilterId = session.customerId }
            optionsLoading = false
        }
    }

    private func load(reset: Bool = false) async {
        if reset { pageNumber = 1 }
        guard let customerId = selectedFilterId else {
            rows = []
            loading = false
            return
        }
        loading = true
        failure = nil
        do {
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
