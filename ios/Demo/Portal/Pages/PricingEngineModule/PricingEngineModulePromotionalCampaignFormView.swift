import SwiftUI
import QuickCodeHTTP
import PricingEngineModuleClient

struct PricingEngineModulePromotionalCampaignFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var name = ""
    @State private var startDate = Date()
    @State private var endDate = Date()
    @State private var discountPercentage = ""
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
                    FieldLabel(label: "name") { TextField("name", text: $name) }
                    DateField(label: "start Date", date: $startDate)
                    DateField(label: "end Date", date: $endDate)
                    NumberField(label: "discount Percentage", text: $discountPercentage, decimal: true)
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
        .navigationTitle(keys.isEmpty ? "Promotional Campaigns" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PromotionalCampaignsInsert(body: .json(.init(
                id: 0,
                name: name,
                startDate: startDate,
                endDate: endDate,
                discountPercentage: Double(discountPercentage) ?? 0,
                isActive: isActive
            )))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PromotionalCampaignsUpdate(path: .init(id: Double(keys[0]) ?? 0), body: .json(.init(
                id: Double(keys[0]) ?? 0,
                name: name,
                startDate: startDate,
                endDate: endDate,
                discountPercentage: Double(discountPercentage) ?? 0,
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
            let output = try await client.PromotionalCampaignsGetItem(path: .init(id: Double(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            name = item.name
            startDate = item.startDate
            endDate = item.endDate
            discountPercentage = PortalNumber.decimal(item.discountPercentage)
            isActive = item.isActive
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}