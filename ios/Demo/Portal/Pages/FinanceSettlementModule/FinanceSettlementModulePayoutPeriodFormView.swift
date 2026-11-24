import SwiftUI
import QuickCodeHTTP
import FinanceSettlementModuleClient

struct FinanceSettlementModulePayoutPeriodFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var periodName = ""
    @State private var startDate = Date()
    @State private var endDate = Date()
    @State private var isClosed = false
    @State private var closedDate = Date()
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
                    FieldLabel(label: "period Name") { TextField("period Name", text: $periodName) }
                    DateField(label: "start Date", date: $startDate)
                    DateField(label: "end Date", date: $endDate)
                    SwitchField(label: "is Closed", isOn: $isClosed)
                    DateField(label: "closed Date", date: $closedDate)
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
        .navigationTitle(keys.isEmpty ? "Payout Periods" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PayoutPeriodsInsert(body: .json(.init(
                id: 0,
                periodName: periodName,
                startDate: startDate,
                endDate: endDate,
                isClosed: isClosed,
                closedDate: closedDate,
                createdDate: createdDate
            )))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PayoutPeriodsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(
                id: Int32(keys[0]) ?? 0,
                periodName: periodName,
                startDate: startDate,
                endDate: endDate,
                isClosed: isClosed,
                closedDate: closedDate,
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
            let output = try await client.PayoutPeriodsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            periodName = item.periodName ?? ""
            startDate = item.startDate ?? Date()
            endDate = item.endDate ?? Date()
            isClosed = item.isClosed ?? false
            closedDate = item.closedDate ?? Date()
            createdDate = item.createdDate ?? Date()
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}