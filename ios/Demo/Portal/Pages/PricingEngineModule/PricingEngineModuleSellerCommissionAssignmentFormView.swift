import SwiftUI
import QuickCodeHTTP
import PricingEngineModuleClient

struct PricingEngineModuleSellerCommissionAssignmentFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var sellerId = ""
    @State private var commissionModelId = ""
    @State private var effectiveDate = Date()
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
                    NumberField(label: "seller Id", text: $sellerId)
                    PortalForeignKeyField(label: "commission Model", module: "pricing-engine-module", model: "commission-models", text: $commissionModelId)
                    DateField(label: "effective Date", date: $effectiveDate)
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
        .navigationTitle(keys.isEmpty ? "Seller Commission Assignments" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.SellerCommissionAssignmentsInsert(body: .json(.init(
                sellerId: Double(sellerId) ?? 0,
                commissionModelId: Double(commissionModelId) ?? 0,
                effectiveDate: effectiveDate
            )))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.SellerCommissionAssignmentsUpdate(path: .init(sellerId: Double(keys[0]) ?? 0), body: .json(.init(
                sellerId: Double(keys[0]) ?? 0,
                commissionModelId: Double(commissionModelId) ?? 0,
                effectiveDate: effectiveDate
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
            let output = try await client.SellerCommissionAssignmentsGetItem(path: .init(sellerId: Double(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            sellerId = PortalNumber.integer(item.sellerId)
            commissionModelId = PortalNumber.integer(item.commissionModelId)
            effectiveDate = item.effectiveDate
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}