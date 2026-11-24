import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleEndpointWorkflowFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var name = ""
    @State private var moduleName = ""
    @State private var endpointPath = ""
    @State private var httpMethod = ""
    @State private var description = ""
    @State private var workflowContent = ""
    @State private var runOnBff = false
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
                    FieldLabel(label: "module Name") { TextField("module Name", text: $moduleName) }
                    FieldLabel(label: "endpoint Path") { TextField("endpoint Path", text: $endpointPath) }
                    FieldLabel(label: "http Method") { TextField("http Method", text: $httpMethod) }
                    FieldLabel(label: "description") { TextField("description", text: $description) }
                    JsonField(label: "workflow Content", text: $workflowContent, yaml: true)
                    SwitchField(label: "run On Bff", isOn: $runOnBff)
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
        .navigationTitle(keys.isEmpty ? "Endpoint Workflows" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.EndpointWorkflowsInsert(body: .json(.init(value1: .init(
                id: 0,
                name: name,
                moduleName: moduleName,
                endpointPath: endpointPath,
                httpMethod: httpMethod,
                description: description,
                workflowContent: workflowContent,
                runOnBff: runOnBff,
                isActive: isActive
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.EndpointWorkflowsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(value1: .init(
                id: Int32(keys[0]) ?? 0,
                name: name,
                moduleName: moduleName,
                endpointPath: endpointPath,
                httpMethod: httpMethod,
                description: description,
                workflowContent: workflowContent,
                runOnBff: runOnBff,
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
            let output = try await client.EndpointWorkflowsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            name = item.name ?? ""
            moduleName = item.moduleName ?? ""
            endpointPath = item.endpointPath ?? ""
            httpMethod = item.httpMethod ?? ""
            description = item.description ?? ""
            workflowContent = item.workflowContent ?? ""
            runOnBff = item.runOnBff ?? false
            isActive = item.isActive ?? false
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}