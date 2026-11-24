import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleApiMethodDefinitionFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var key = ""
    @State private var moduleName = ""
    @State private var modelName = ""
    @State private var httpMethod = "Get"
    @State private var controllerName = ""
    @State private var methodName = ""
    @State private var urlPath = ""
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
                    FieldLabel(label: "key") { TextField("key", text: $key) }
                    PortalForeignKeyField(label: "module Name", module: "identity-module", model: "modules", text: $moduleName)
                    PortalForeignKeyField(label: "model Name", module: "identity-module", model: "models", text: $modelName)
                    SelectField(label: "http Method", options: [(id: "Get", name: "Get"), (id: "Post", name: "Post"), (id: "Put", name: "Put"), (id: "Delete", name: "Delete"), (id: "Patch", name: "Patch")], selection: $httpMethod)
                    FieldLabel(label: "controller Name") { TextField("controller Name", text: $controllerName) }
                    FieldLabel(label: "method Name") { TextField("method Name", text: $methodName) }
                    FieldLabel(label: "url Path") { TextField("url Path", text: $urlPath) }
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
        .navigationTitle(keys.isEmpty ? "Api Method Definitions" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ApiMethodDefinitionsInsert(body: .json(.init(value1: .init(
                key: key,
                moduleName: moduleName,
                modelName: modelName,
                httpMethod: .init(value1: { switch httpMethod {
case "Get": .Get
case "Post": .Post
case "Put": .Put
case "Delete": .Delete
case "Patch": .Patch
default: .Get
} }()),
                controllerName: controllerName,
                methodName: methodName,
                urlPath: urlPath
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ApiMethodDefinitionsUpdate(path: .init(key: keys[0]), body: .json(.init(value1: .init(
                key: keys[0],
                moduleName: moduleName,
                modelName: modelName,
                httpMethod: .init(value1: { switch httpMethod {
case "Get": .Get
case "Post": .Post
case "Put": .Put
case "Delete": .Delete
case "Patch": .Patch
default: .Get
} }()),
                controllerName: controllerName,
                methodName: methodName,
                urlPath: urlPath
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
            let output = try await client.ApiMethodDefinitionsGetItem(path: .init(key: keys[0]))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            key = item.key ?? ""
            moduleName = item.moduleName ?? ""
            modelName = item.modelName ?? ""
            httpMethod = item.httpMethod.map { String($0.value1.rawValue) } ?? "Get"
            controllerName = item.controllerName ?? ""
            methodName = item.methodName ?? ""
            urlPath = item.urlPath ?? ""
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}