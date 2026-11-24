import SwiftUI
import QuickCodeHTTP
import ProductCatalogModuleClient

struct ProductCatalogModuleProductsListView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalAccess.self) private var access
    @Environment(PortalToast.self) private var toast
    @State private var rows: [GatewayRow] = []
    @State private var pageNumber = 1
    @State private var totalCount: Int?
    @State private var search = ""
    @State private var editing = false
    @State private var editKeys: [String] = []
    @State private var creating = false
    @State private var deleteKeys: [String]?
    @State private var confirmDelete = false
    @State private var loading = true
    @State private var failure: String?

    private var visible: [GatewayRow] {
        let needle = search.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !needle.isEmpty else { return rows }
        return rows.filter { row in
            if row.title.localizedStandardContains(needle) || row.subtitle.localizedStandardContains(needle) {
                return true
            }
            return row.fields.contains { $0.text.localizedStandardContains(needle) || $0.label.localizedStandardContains(needle) }
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
                            PortalListSummary(page: pageNumber, rowCount: rows.count, totalCount: totalCount)
                            if visible.isEmpty {
                                EmptyState(title: "No records", actionTitle: "Try again") { Task { await load() } }
                            } else {
                                ForEach(visible) { row in
                                    PortalSwipeRow(
                                        allowsEdit: access.allows("ProductCatalogModuleProducts", "Update"),
                                        allowsDelete: access.allows("ProductCatalogModuleProducts", "Delete"),
                                        onEdit: {
                                            editKeys = row.keys
                                            editing = true
                                        },
                                        onDelete: {
                                            deleteKeys = row.keys
                                            confirmDelete = true
                                        }
                                    ) {
                                        NavigationLink(value: row.keys) { rowCard(row) }.buttonStyle(.plain)
                                    }
                                }
                            }
                            PortalListPager(
                                page: pageNumber,
                                rowCount: rows.count,
                                totalCount: totalCount,
                                loading: loading,
                                onSelect: { next in
                                    guard next != pageNumber else { return }
                                    pageNumber = next
                                    Task { await load() }
                                }
                            )
                        }
                        .padding(.vertical, ShellMetrics.screenPadding)
                        .padding(.horizontal, ShellMetrics.screenPadding)
                    }
                }
            }
        }
        .navigationTitle("Products")
        .navigationBarTitleDisplayMode(.large)
                .navigationDestination(for: [String].self) { keys in
                    ProductCatalogModuleProductDetailView(keys: keys)
                }
        .portalSafeRail(listSafeRailActions)
        .navigationDestination(isPresented: $creating) {
            ProductCatalogModuleProductFormView()
        }
        .navigationDestination(isPresented: $editing) {
            ProductCatalogModuleProductFormView(keys: editKeys)
        }
        .portalDeleteConfirm(isPresented: $confirmDelete, onConfirm: { Task { await removeSelected() } }, onCancel: { deleteKeys = nil })
        .task { await load() }
    }

    private func rowCard(_ row: GatewayRow) -> some View {
        ProductCardLabel(imageURL: row.image, title: row.title, price: row.subtitle)
    }

    private var listSafeRailActions: [PortalSafeRail.Action] {
        var items: [PortalSafeRail.Action] = []
        if access.allows("ProductCatalogModuleProducts", "Insert") {
            items.append(
                PortalSafeRail.Action(
                    id: "add",
                    systemName: "plus",
                    accessibilityLabel: "Add",
                    pinned: true,
                    perform: { creating = true }
                )
            )
        }
        return items
    }
    private func load() async {
        loading = true
        failure = nil
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ProductsList(query: .init(page: Int32(pageNumber), size: Int32(ShellMetrics.listPageSize), includeCount: true))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
                        let payload = try ok.body.json
            let items = payload.items ?? []
            totalCount = payload.totalCount.map { Int($0) }
            rows = items.map { item in
                GatewayRow(
                    id: [String(item.id)].joined(separator: "|"),
                    recordId: Int(item.id),
                    keys: [String(item.id)],
                    title: item.name,
                    subtitle: String(item.status.rawValue),
                    image: remoteMediaURL(item.photo),
                    fields: [
                    PortalValue(id: "id", label: "Id", text: PortalNumber.integer(item.id), kind: .integer, quiet: true),
                    PortalValue(id: "sellerId", label: "Seller Id", text: PortalNumber.integer(item.sellerId), kind: .integer, quiet: true),
                    PortalValue(id: "brandId", label: "Brand Id", text: PortalNumber.integer(item.brandId), kind: .integer, quiet: true),
                    PortalValue(id: "primaryCategoryId", label: "Primary Category Id", text: PortalNumber.integer(item.primaryCategoryId), kind: .integer, quiet: true),
                    PortalValue(id: "sku", label: "Sku", text: item.sku, kind: .text),
                    PortalValue(id: "name", label: "Name", text: item.name, kind: .text),
                    PortalValue(id: "description", label: "Description", text: item.description, kind: .long),
                    PortalValue(id: "photo", label: "Photo", text: item.photo, kind: .image),
                    PortalValue(id: "video", label: "Video", text: item.video, kind: .video),
                    PortalValue(id: "datasheet", label: "Datasheet", text: item.datasheet, kind: .pdf),
                    PortalValue(id: "status", label: "Status", text: String(item.status.rawValue), kind: .text),
                    PortalValue(id: "isFeatured", label: "Is Featured", text: item.isFeatured ? "Yes" : "No", kind: .bool),
                    PortalValue(id: "createdDate", label: "Created Date", text: item.createdDate.formatted(date: .abbreviated, time: .shortened), kind: .date, quiet: true)
                    ]
                )
            }
            rows = await PortalRefEnricher.enrich(rows, module: "product-catalog-module", session: session)
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private func removeSelected() async {
        guard let keys = deleteKeys else { return }
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ProductsDelete(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            toast.show("Deleted")
            deleteKeys = nil
            await load()
        } catch {
            failure = PortalErrors.record(error)
            deleteKeys = nil
        }
    }

}