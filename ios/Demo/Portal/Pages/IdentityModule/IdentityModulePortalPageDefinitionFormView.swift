import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModulePortalPageDefinitionFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var key = ""
    @State private var moduleName = ""
    @State private var modelName = ""
    @State private var pageAction = "List"
    @State private var pagePath = ""
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
                    SelectField(label: "page Action", options: [(id: "List", name: "List"), (id: "Detail", name: "Detail"), (id: "Insert", name: "Insert"), (id: "Update", name: "Update"), (id: "Delete", name: "Delete")], selection: $pageAction)
                    FieldLabel(label: "page Path") { TextField("page Path", text: $pagePath) }
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
        .navigationTitle(keys.isEmpty ? "Portal Page Definitions" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PortalPageDefinitionsInsert(body: .json(.init(value1: .init(
                key: key,
                moduleName: moduleName,
                modelName: modelName,
                pageAction: .init(value1: { switch pageAction {
case "List": .List
case "Detail": .Detail
case "Insert": .Insert
case "Update": .Update
case "Delete": .Delete
default: .List
} }()),
                pagePath: pagePath
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PortalPageDefinitionsUpdate(path: .init(key: keys[0]), body: .json(.init(value1: .init(
                key: keys[0],
                moduleName: moduleName,
                modelName: modelName,
                pageAction: .init(value1: { switch pageAction {
case "List": .List
case "Detail": .Detail
case "Insert": .Insert
case "Update": .Update
case "Delete": .Delete
default: .List
} }()),
                pagePath: pagePath
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
            let output = try await client.PortalPageDefinitionsGetItem(path: .init(key: keys[0]))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            key = item.key ?? ""
            moduleName = item.moduleName ?? ""
            modelName = item.modelName ?? ""
            pageAction = item.pageAction.map { String($0.value1.rawValue) } ?? "List"
            pagePath = item.pagePath ?? ""
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}