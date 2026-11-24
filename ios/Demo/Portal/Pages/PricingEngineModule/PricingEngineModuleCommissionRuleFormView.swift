import SwiftUI
import QuickCodeHTTP
import PricingEngineModuleClient

struct PricingEngineModuleCommissionRuleFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var commissionModelId = ""
    @State private var scope = "Global"
    @State private var scopeId = ""
    @State private var commissionType = "Percentage"
    @State private var percentageRate = ""
    @State private var fixedAmount = ""
    @State private var isActive = false
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
                    PortalForeignKeyField(label: "commission Model", module: "pricing-engine-module", model: "commission-models", text: $commissionModelId)
                    SelectField(label: "scope", options: [(id: "Global", name: "Global"), (id: "SellerTier", name: "Seller Tier"), (id: "Category", name: "Category"), (id: "Seller", name: "Seller")], selection: $scope)
                    NumberField(label: "scope Id", text: $scopeId)
                    SelectField(label: "commission Type", options: [(id: "Percentage", name: "Percentage"), (id: "FixedAmount", name: "Fixed Amount"), (id: "Mixed", name: "Mixed")], selection: $commissionType)
                    NumberField(label: "percentage Rate", text: $percentageRate, decimal: true)
                    NumberField(label: "fixed Amount", text: $fixedAmount, decimal: true)
                    SwitchField(label: "is Active", isOn: $isActive)
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
        .navigationTitle(keys.isEmpty ? "Commission Rules" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.CommissionRulesInsert(body: .json(.init(
                id: 0,
                commissionModelId: Double(commissionModelId) ?? 0,
                scope: { switch scope {
case "Global": .Global
case "SellerTier": .SellerTier
case "Category": .Category
case "Seller": .Seller
default: .Global
} }(),
                scopeId: Double(scopeId) ?? 0,
                commissionType: { switch commissionType {
case "Percentage": .Percentage
case "FixedAmount": .FixedAmount
case "Mixed": .Mixed
default: .Percentage
} }(),
                percentageRate: Double(percentageRate) ?? 0,
                fixedAmount: Double(fixedAmount) ?? 0,
                isActive: isActive
            )))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.CommissionRulesUpdate(path: .init(id: Double(keys[0]) ?? 0), body: .json(.init(
                id: Double(keys[0]) ?? 0,
                commissionModelId: Double(commissionModelId) ?? 0,
                scope: { switch scope {
case "Global": .Global
case "SellerTier": .SellerTier
case "Category": .Category
case "Seller": .Seller
default: .Global
} }(),
                scopeId: Double(scopeId) ?? 0,
                commissionType: { switch commissionType {
case "Percentage": .Percentage
case "FixedAmount": .FixedAmount
case "Mixed": .Mixed
default: .Percentage
} }(),
                percentageRate: Double(percentageRate) ?? 0,
                fixedAmount: Double(fixedAmount) ?? 0,
                isActive: isActive
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
            let output = try await client.CommissionRulesGetItem(path: .init(id: Double(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            commissionModelId = PortalNumber.integer(item.commissionModelId)
            scope = String(item.scope.rawValue)
            scopeId = PortalNumber.integer(item.scopeId)
            commissionType = String(item.commissionType.rawValue)
            percentageRate = PortalNumber.decimal(item.percentageRate)
            fixedAmount = PortalNumber.decimal(item.fixedAmount)
            isActive = item.isActive
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}