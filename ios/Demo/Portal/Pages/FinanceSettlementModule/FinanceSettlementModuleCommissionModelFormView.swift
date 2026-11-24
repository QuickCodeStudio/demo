import SwiftUI
import QuickCodeHTTP
import FinanceSettlementModuleClient

struct FinanceSettlementModuleCommissionModelFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var modelName = ""
    @State private var description = ""
    @State private var commissionPercentage = ""
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
                    FieldLabel(label: "model Name") { TextField("model Name", text: $modelName) }
                    LongTextField(label: "description", text: $description)
                    NumberField(label: "commission Percentage", text: $commissionPercentage, decimal: true)
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
        .navigationTitle(keys.isEmpty ? "Commission Models" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.CommissionModelsInsert(body: .json(.init(
                id: 0,
                modelName: modelName,
                description: description,
                commissionPercentage: Double(commissionPercentage) ?? 0,
                isActive: isActive,
                createdDate: createdDate
            )))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.CommissionModelsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(
                id: Int32(keys[0]) ?? 0,
                modelName: modelName,
                description: description,
                commissionPercentage: Double(commissionPercentage) ?? 0,
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
            let output = try await client.CommissionModelsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            modelName = item.modelName ?? ""
            description = item.description ?? ""
            commissionPercentage = item.commissionPercentage.map { PortalNumber.decimal($0) } ?? ""
            isActive = item.isActive ?? false
            createdDate = item.createdDate ?? Date()
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}