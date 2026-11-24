import SwiftUI
import QuickCodeHTTP
import SellerManagementModuleClient

struct SellerManagementModuleSellerDetailView: View {
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
                            PortalRelatedSection(title: "Seller Bank Accounts", rows: related0) { keys in
                                SellerManagementModuleSellerBankAccountDetailView(keys: keys)
                            }
                            PortalRelatedSection(title: "Seller Documents", rows: related1) { keys in
                                SellerManagementModuleSellerDocumentDetailView(keys: keys)
                            }
                            PortalRelatedSection(title: "Seller Performance Reviews", rows: related2) { keys in
                                SellerManagementModuleSellerPerformanceReviewDetailView(keys: keys)
                            }
                            PortalRelatedSection(title: "Stores", rows: related3) { keys in
                                SellerManagementModuleStoreDetailView(keys: keys)
                            }
                        }
                        .padding(.vertical, ShellMetrics.screenPadding)
                        .padding(.horizontal, ShellMetrics.screenPadding)
                    }
                }
            }
        }
        .navigationTitle("Sellers")

        .portalSafeRail(detailSafeRailActions, showsBack: true)
        .navigationDestination(isPresented: $openEditor) {
            SellerManagementModuleSellerFormView(keys: keys)
        }
        .portalDeleteConfirm(isPresented: $confirmDelete, onConfirm: { Task { await remove() } })

        .task { await load() }
    }

    private func load() async {
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.SellersGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            let loaded = GatewayRow(
                    id: String(describing: item.id),
                    recordId: item.id.map { Int($0) },
                    keys: [],
                    title: item.companyName ?? "",
                    subtitle: item.status.map { String($0.value1.rawValue) } ?? "",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: item.id.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "userId", label: "User Id", text: item.userId.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "companyName", label: "Company Name", text: item.companyName ?? "", kind: .text),
                    PortalValue(id: "contactEmail", label: "Contact Email", text: item.contactEmail ?? "", kind: .email),
                    PortalValue(id: "contactPhone", label: "Contact Phone", text: item.contactPhone ?? "", kind: .phone),
                    PortalValue(id: "status", label: "Status", text: item.status.map { String($0.value1.rawValue) } ?? "", kind: .text),
                    PortalValue(id: "sellerTierId", label: "Seller Tier Id", text: item.sellerTierId.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "joinedDate", label: "Joined Date", text: item.joinedDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date)
                    ]
                )
            row = await PortalRefEnricher.enrich(loaded, module: "seller-management-module", session: session)
            do {
                let relatedOutput = try await client.SellerBankAccountsGetBySellerId(path: .init(sellerBankAccountSellerId: Int32(keys[0]) ?? 0), query: .init(pageNumber: Int32(1), pageSize: Int32(ShellMetrics.listPageSize)))
                if case .ok(let relatedOk) = relatedOutput {
                    let relatedItems = try relatedOk.body.json
                    related0 = relatedItems.map { item in
                        GatewayRow(
                    id: [item.id.map { String($0) } ?? ""].joined(separator: "|"),
                    recordId: item.id.map { Int($0) },
                    keys: [item.id.map { String($0) } ?? ""],
                    title: item.bankName ?? "",
                    subtitle: item.isDefault.map { $0 ? "Yes" : "No" } ?? "",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: item.id.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "bankName", label: "Bank Name", text: item.bankName ?? "", kind: .text),
                    PortalValue(id: "accountHolderName", label: "Account Holder Name", text: item.accountHolderName ?? "", kind: .text),
                    PortalValue(id: "iban", label: "Iban", text: item.iban ?? "", kind: .text),
                    PortalValue(id: "isDefault", label: "Is Default", text: item.isDefault.map { $0 ? "Yes" : "No" } ?? "", kind: .bool),
                    PortalValue(id: "isVerified", label: "Is Verified", text: item.isVerified.map { $0 ? "Yes" : "No" } ?? "", kind: .bool)
                    ]
                )
                    }
                    related0 = await PortalRefEnricher.enrich(related0, module: "seller-management-module", session: session)
                }
            } catch {
                related0 = []
            }
            do {
                let relatedOutput = try await client.SellerDocumentsGetBySellerId(path: .init(sellerDocumentSellerId: Int32(keys[0]) ?? 0), query: .init(pageNumber: Int32(1), pageSize: Int32(ShellMetrics.listPageSize)))
                if case .ok(let relatedOk) = relatedOutput {
                    let relatedItems = try relatedOk.body.json
                    related1 = relatedItems.map { item in
                        GatewayRow(
                    id: [item.id.map { String($0) } ?? ""].joined(separator: "|"),
                    recordId: item.id.map { Int($0) },
                    keys: [item.id.map { String($0) } ?? ""],
                    title: item.documentType.map { String($0.value1.rawValue) } ?? "",
                    subtitle: item.status.map { String($0.value1.rawValue) } ?? "",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: item.id.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "documentType", label: "Document Type", text: item.documentType.map { String($0.value1.rawValue) } ?? "", kind: .text),
                    PortalValue(id: "status", label: "Status", text: item.status.map { String($0.value1.rawValue) } ?? "", kind: .text),
                    PortalValue(id: "uploadedDate", label: "Uploaded Date", text: item.uploadedDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date)
                    ]
                )
                    }
                    related1 = await PortalRefEnricher.enrich(related1, module: "seller-management-module", session: session)
                }
            } catch {
                related1 = []
            }
            do {
                let relatedOutput = try await client.SellerPerformanceReviewsGetBySellerId(path: .init(sellerPerformanceReviewSellerId: Int32(keys[0]) ?? 0), query: .init(pageNumber: Int32(1), pageSize: Int32(ShellMetrics.listPageSize)))
                if case .ok(let relatedOk) = relatedOutput {
                    let relatedItems = try relatedOk.body.json
                    related2 = relatedItems.map { item in
                        GatewayRow(
                    id: [item.id.map { String($0) } ?? ""].joined(separator: "|"),
                    recordId: item.id.map { Int($0) },
                    keys: [item.id.map { String($0) } ?? ""],
                    title: item.reviewDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "",
                    subtitle: "",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: item.id.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "rating", label: "Rating", text: item.rating.map { PortalNumber.integer($0) } ?? "", kind: .integer),
                    PortalValue(id: "comment", label: "Comment", text: item.comment ?? "", kind: .long),
                    PortalValue(id: "reviewDate", label: "Review Date", text: item.reviewDate.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "", kind: .date)
                    ]
                )
                    }
                    related2 = await PortalRefEnricher.enrich(related2, module: "seller-management-module", session: session)
                }
            } catch {
                related2 = []
            }
            do {
                let relatedOutput = try await client.StoresGetBySellerId(query: .init(storeSellerId: nil))
                if case .ok(let relatedOk) = relatedOutput {
                    let relatedItems = [try relatedOk.body.json]
                    related3 = relatedItems.map { item in
                        GatewayRow(
                    id: [item.id.map { String($0) } ?? ""].joined(separator: "|"),
                    recordId: item.id.map { Int($0) },
                    keys: [item.id.map { String($0) } ?? ""],
                    title: item.name ?? "",
                    subtitle: item.isActive.map { $0 ? "Yes" : "No" } ?? "",
                    image: nil,
                    fields: [
                    PortalValue(id: "id", label: "Id", text: item.id.map { PortalNumber.integer($0) } ?? "", kind: .integer, quiet: true),
                    PortalValue(id: "name", label: "Name", text: item.name ?? "", kind: .text),
                    PortalValue(id: "slug", label: "Slug", text: item.slug ?? "", kind: .text),
                    PortalValue(id: "isActive", label: "Is Active", text: item.isActive.map { $0 ? "Yes" : "No" } ?? "", kind: .bool)
                    ]
                )
                    }
                    related3 = await PortalRefEnricher.enrich(related3, module: "seller-management-module", session: session)
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
        if access.allows("SellerManagementModuleSellers", "Delete") {
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
        if access.allows("SellerManagementModuleSellers", "Update") {
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
            let output = try await client.SellersDelete(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            toast.show("Deleted")
            dismiss()
        } catch {
            failure = PortalErrors.record(error)
        }
    }
}