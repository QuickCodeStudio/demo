import SwiftUI
import QuickCodeHTTP
import ProductCatalogModuleClient

struct ProductCatalogModuleProductDetailView: View {
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
                            PortalRelatedSection(title: "Product Categories", rows: related0) { keys in
                                ProductCatalogModuleProductCategoryDetailView(keys: keys)
                            }
                            PortalRelatedSection(title: "Product Variants", rows: related1) { keys in
                                ProductCatalogModuleProductVariantDetailView(keys: keys)
                            }
                        }
                        .padding(.vertical, ShellMetrics.screenPadding)
                        .padding(.horizontal, ShellMetrics.screenPadding)
                    }
                }
            }
        }
        .navigationTitle("Products")

        .portalSafeRail(detailSafeRailActions, showsBack: true)
        .navigationDestination(isPresented: $openEditor) {
            ProductCatalogModuleProductFormView(keys: keys)
        }
        .portalDeleteConfirm(isPresented: $confirmDelete, onConfirm: { Task { await remove() } })

        .task { await load() }
    }

    private func load() async {
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ProductsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            let loaded = GatewayRow(
                    id: String(item.id),
                    recordId: Int(item.id),
                    keys: [],
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
            row = await PortalRefEnricher.enrich(loaded, module: "product-catalog-module", session: session)
            do {
                let relatedOutput = try await client.ProductCategoriesGetByProductId(query: .init(productCategoryProductId: nil, pageNumber: Double(1), pageSize: Double(ShellMetrics.listPageSize)))
                if case .ok(let relatedOk) = relatedOutput {
                    let relatedItems = try relatedOk.body.json
                    related0 = relatedItems.map { item in
                        GatewayRow(
                    id: ["", String(item.categoryId)].joined(separator: "|"),
                    recordId: nil,
                    keys: ["", String(item.categoryId)],
                    title: "Item",
                    subtitle: "",
                    image: nil,
                    fields: [
                    PortalValue(id: "categoryId", label: "Category Id", text: PortalNumber.integer(item.categoryId), kind: .integer, quiet: true)
                    ]
                )
                    }
                    related0 = await PortalRefEnricher.enrich(related0, module: "product-catalog-module", session: session)
                }
            } catch {
                related0 = []
            }
            do {
                let relatedOutput = try await client.ProductVariantsGetByProductId(query: .init(productVariantProductId: nil, pageNumber: Double(1), pageSize: Double(ShellMetrics.listPageSize)))
                if case .ok(let relatedOk) = relatedOutput {
                    let relatedItems = try relatedOk.body.json
                    related1 = relatedItems.map { item in
                        GatewayRow(
                    id: [String(item.id)].joined(separator: "|"),
                    recordId: Int(item.id),
                    keys: [String(item.id)],
                    title: item.sku,
                    subtitle: item.isActive ? "Yes" : "No",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: PortalNumber.integer(item.id), kind: .integer, quiet: true),
                    PortalValue(id: "sku", label: "Sku", text: item.sku, kind: .text),
                    PortalValue(id: "price", label: "Price", text: PortalNumber.decimal(item.price), kind: .decimal),
                    PortalValue(id: "stockQuantity", label: "Stock Quantity", text: PortalNumber.integer(item.stockQuantity), kind: .integer),
                    PortalValue(id: "isActive", label: "Is Active", text: item.isActive ? "Yes" : "No", kind: .bool)
                    ]
                )
                    }
                    related1 = await PortalRefEnricher.enrich(related1, module: "product-catalog-module", session: session)
                }
            } catch {
                related1 = []
            }
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private var detailSafeRailActions: [PortalSafeRail.Action] {
        var items: [PortalSafeRail.Action] = []
        if access.allows("ProductCatalogModuleProducts", "Delete") {
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
        if access.allows("ProductCatalogModuleProducts", "Update") {
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
            let output = try await client.ProductsDelete(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            toast.show("Deleted")
            dismiss()
        } catch {
            failure = PortalErrors.record(error)
        }
    }
}