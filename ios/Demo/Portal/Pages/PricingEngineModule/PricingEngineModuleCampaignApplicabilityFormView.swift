import SwiftUI
import QuickCodeHTTP
import PricingEngineModuleClient

struct PricingEngineModuleCampaignApplicabilityFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var campaignId = ""
    @State private var scope = "Global"
    @State private var scopeId = ""
    @State private var busy = false
    @State private var failure: String?

    private var ready: Bool { true }

    var body: some View {
                Group {
            if !keys.isEmpty, !loaded {
                LoadingState()
            } else {ScreenCanvas {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    PortalForeignKeyField(label: "campaign", module: "pricing-engine-module", model: "promotional-campaigns", text: $campaignId)
                        .disabled(!keys.isEmpty)
                    SelectField(label: "scope", options: [(id: "Global", name: "Global"), (id: "SellerTier", name: "Seller Tier"), (id: "Category", name: "Category"), (id: "Seller", name: "Seller")], selection: $scope)
                    NumberField(label: "scope Id", text: $scopeId)
                    if let failure {
                        Text(failure).foregroundStyle(.red)
                    }
                    PrimaryButton(title: busy ? "Saving…" : "Save") { Task { await save() } }
                        .disabled(busy || !ready)
                }
                .padding(ShellMetrics.screenPadding)
            }
        }
            }
        }
        .navigationTitle(keys.isEmpty ? "Campaign Applicabilities" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.CampaignApplicabilitiesInsert(body: .json(.init(
                campaignId: Double(campaignId) ?? 0,
                scope: { switch scope {
case "Global": .Global
case "SellerTier": .SellerTier
case "Category": .Category
case "Seller": .Seller
default: .Global
} }(),
                scopeId: Double(scopeId) ?? 0
            )))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.CampaignApplicabilitiesUpdate(path: .init(campaignId: Double(keys[0]) ?? 0, scope: { switch keys[1] {
case "Global": .Global
case "SellerTier": .SellerTier
case "Category": .Category
case "Seller": .Seller
default: .Global
} }(), scopeId: Double(keys[2]) ?? 0), body: .json(.init(
                campaignId: Double(keys[0]) ?? 0,
                scope: { switch keys[1] {
case "Global": .Global
case "SellerTier": .SellerTier
case "Category": .Category
case "Seller": .Seller
default: .Global
} }(),
                scopeId: Double(keys[2]) ?? 0
            )))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            }
            toast.show("Saved")
            dismiss()
        } catch {
            failure = PortalErrors.record(error)
        }
        busy = false
    }

    private func loadExisting() async {
        guard !keys.isEmpty, !loaded else {
            loaded = true
            return
        }
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.CampaignApplicabilitiesGetItem(path: .init(campaignId: Double(keys[0]) ?? 0, scope: { switch keys[1] {
case "Global": .Global
case "SellerTier": .SellerTier
case "Category": .Category
case "Seller": .Seller
default: .Global
} }(), scopeId: Double(keys[2]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            campaignId = PortalNumber.integer(item.campaignId)
            scope = String(item.scope.rawValue)
            scopeId = PortalNumber.integer(item.scopeId)
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}