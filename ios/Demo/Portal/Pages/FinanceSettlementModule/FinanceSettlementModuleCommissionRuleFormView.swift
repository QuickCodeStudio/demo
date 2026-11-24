import SwiftUI
import QuickCodeHTTP
import FinanceSettlementModuleClient

struct FinanceSettlementModuleCommissionRuleFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var commissionModelId = ""
    @State private var ruleName = ""
    @State private var minOrderValue = ""
    @State private var maxOrderValue = ""
    @State private var overridePercentage = ""
    @State private var isActive = false
    @State private var createdDate = Date()
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
                    PortalForeignKeyField(label: "commission Model", module: "finance-settlement-module", model: "commission-models", text: $commissionModelId)
                    FieldLabel(label: "rule Name") { TextField("rule Name", text: $ruleName) }
                    NumberField(label: "min Order Value", text: $minOrderValue, decimal: true)
                    NumberField(label: "max Order Value", text: $maxOrderValue, decimal: true)
                    NumberField(label: "override Percentage", text: $overridePercentage, decimal: true)
                    SwitchField(label: "is Active", isOn: $isActive)
                    DateField(label: "created Date", date: $createdDate)
                        .disabled(!keys.isEmpty)
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
                commissionModelId: Int32(commissionModelId) ?? 0,
                ruleName: ruleName,
                minOrderValue: Double(minOrderValue) ?? 0,
                maxOrderValue: Double(maxOrderValue) ?? 0,
                overridePercentage: Double(overridePercentage) ?? 0,
                isActive: isActive,
                createdDate: createdDate
            )))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.CommissionRulesUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(
                id: Int32(keys[0]) ?? 0,
                commissionModelId: Int32(commissionModelId) ?? 0,
                ruleName: ruleName,
                minOrderValue: Double(minOrderValue) ?? 0,
                maxOrderValue: Double(maxOrderValue) ?? 0,
                overridePercentage: Double(overridePercentage) ?? 0,
                isActive: isActive,
                createdDate: createdDate
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
            let output = try await client.CommissionRulesGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            commissionModelId = item.commissionModelId.map { PortalNumber.integer($0) } ?? ""
            ruleName = item.ruleName ?? ""
            minOrderValue = item.minOrderValue.map { PortalNumber.decimal($0) } ?? ""
            maxOrderValue = item.maxOrderValue.map { PortalNumber.decimal($0) } ?? ""
            overridePercentage = item.overridePercentage.map { PortalNumber.decimal($0) } ?? ""
            isActive = item.isActive ?? false
            createdDate = item.createdDate ?? Date()
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}