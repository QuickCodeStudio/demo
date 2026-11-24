import SwiftUI
import QuickCodeHTTP
import ProductCatalogModuleClient

struct ProductCatalogModuleCategoryDetailView: View {
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
                        }
                        .padding(.vertical, ShellMetrics.screenPadding)
                        .padding(.horizontal, ShellMetrics.screenPadding)
                    }
                }
            }
        }
        .navigationTitle("Categories")

        .portalSafeRail(detailSafeRailActions, showsBack: true)
        .navigationDestination(isPresented: $openEditor) {
            ProductCatalogModuleCategoryFormView(keys: keys)
        }
        .portalDeleteConfirm(isPresented: $confirmDelete, onConfirm: { Task { await remove() } })

        .task { await load() }
    }

    private func load() async {
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.CategoriesGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            let loaded = GatewayRow(
                    id: String(item.id),
                    recordId: Int(item.id),
                    keys: [],
                    title: item.name,
                    subtitle: item.isActive ? "Yes" : "No",
                    image: remoteMediaURL(item.icon),
                    fields: [
                    PortalValue(id: "id", label: "Id", text: PortalNumber.integer(item.id), kind: .integer, quiet: true),
                    PortalValue(id: "parentCategoryId", label: "Parent Category Id", text: PortalNumber.integer(item.parentCategoryId), kind: .integer, quiet: true),
                    PortalValue(id: "name", label: "Name", text: item.name, kind: .text),
                    PortalValue(id: "slug", label: "Slug", text: item.slug, kind: .text),
                    PortalValue(id: "icon", label: "Icon", text: item.icon, kind: .image),
                    PortalValue(id: "banner", label: "Banner", text: item.banner, kind: .image),
                    PortalValue(id: "introVideo", label: "Intro Video", text: item.introVideo, kind: .video),
                    PortalValue(id: "isActive", label: "Is Active", text: item.isActive ? "Yes" : "No", kind: .bool)
                    ]
                )
            row = await PortalRefEnricher.enrich(loaded, module: "product-catalog-module", session: session)
            do {
                let relatedOutput = try await client.ProductCategoriesGetByCategoryId(query: .init(productCategoryCategoryId: nil, pageNumber: Double(1), pageSize: Double(ShellMetrics.listPageSize)))
                if case .ok(let relatedOk) = relatedOutput {
                    let relatedItems = try relatedOk.body.json
                    related0 = relatedItems.map { item in
                        GatewayRow(
                    id: [String(item.productId), ""].joined(separator: "|"),
                    recordId: nil,
                    keys: [String(item.productId), ""],
                    title: "Item",
                    subtitle: "",
                    image: nil,
                    fields: [
                    PortalValue(id: "productId", label: "Product Id", text: PortalNumber.integer(item.productId), kind: .integer, quiet: true)
                    ]
                )
                    }
                    related0 = await PortalRefEnricher.enrich(related0, module: "product-catalog-module", session: session)
                }
            } catch {
                related0 = []
            }
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private var detailSafeRailActions: [PortalSafeRail.Action] {
        var items: [PortalSafeRail.Action] = []
        if access.allows("ProductCatalogModuleCategories", "Delete") {
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
        if access.allows("ProductCatalogModuleCategories", "Update") {
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
            let output = try await client.CategoriesDelete(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            toast.show("Deleted")
            dismiss()
        } catch {
            failure = PortalErrors.record(error)
        }
    }
}