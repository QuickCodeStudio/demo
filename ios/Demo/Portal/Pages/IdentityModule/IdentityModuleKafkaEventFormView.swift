import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleKafkaEventFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var topicName = ""
    @State private var apiMethodDefinitionKey = ""
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
                    FieldLabel(label: "topic Name") { TextField("topic Name", text: $topicName) }
                    PortalForeignKeyField(label: "api Method Definition Key", module: "identity-module", model: "api-method-definitions", text: $apiMethodDefinitionKey)
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
        .navigationTitle(keys.isEmpty ? "Kafka Events" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.KafkaEventsInsert(body: .json(.init(value1: .init(
                topicName: topicName,
                apiMethodDefinitionKey: apiMethodDefinitionKey,
                isActive: isActive
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.KafkaEventsUpdate(path: .init(topicName: keys[0]), body: .json(.init(value1: .init(
                topicName: keys[0],
                apiMethodDefinitionKey: apiMethodDefinitionKey,
                isActive: isActive
            ))))
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
            let output = try await client.KafkaEventsGetItem(path: .init(topicName: keys[0]))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            topicName = item.topicName ?? ""
            apiMethodDefinitionKey = item.apiMethodDefinitionKey ?? ""
            isActive = item.isActive ?? false
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}