import SwiftUI
import QuickCodeHTTP
import ProductCatalogModuleClient

struct ProductCatalogModuleBrandDetailView: View {
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
        .navigationTitle("Brands")

        .portalSafeRail(detailSafeRailActions, showsBack: true)
        .navigationDestination(isPresented: $openEditor) {
            ProductCatalogModuleBrandFormView(keys: keys)
        }
        .portalDeleteConfirm(isPresented: $confirmDelete, onConfirm: { Task { await remove() } })

        .task { await load() }
    }

    private func load() async {
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.BrandsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            let loaded = GatewayRow(
                    id: String(item.id),
                    recordId: Int(item.id),
                    keys: [],
                    title: item.name,
                    subtitle: item.isActive ? "Yes" : "No",
                    image: remoteMediaURL(item.logo),
                    fields: [
                    PortalValue(id: "id", label: "Id", text: PortalNumber.integer(item.id), kind: .integer, quiet: true),
                    PortalValue(id: "name", label: "Name", text: item.name, kind: .text),
                    PortalValue(id: "logo", label: "Logo", text: item.logo, kind: .image),
                    PortalValue(id: "photo", label: "Photo", text: item.photo, kind: .image),
                    PortalValue(id: "brandVideo", label: "Brand Video", text: item.brandVideo, kind: .video),
                    PortalValue(id: "catalogPdf", label: "Catalog Pdf", text: item.catalogPdf, kind: .pdf),
                    PortalValue(id: "isActive", label: "Is Active", text: item.isActive ? "Yes" : "No", kind: .bool)
                    ]
                )
            row = await PortalRefEnricher.enrich(loaded, module: "product-catalog-module", session: session)
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private var detailSafeRailActions: [PortalSafeRail.Action] {
        var items: [PortalSafeRail.Action] = []
        if access.allows("ProductCatalogModuleBrands", "Delete") {
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
        if access.allows("ProductCatalogModuleBrands", "Update") {
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
            let output = try await client.BrandsDelete(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            toast.show("Deleted")
            dismiss()
        } catch {
            failure = PortalErrors.record(error)
        }
    }
}