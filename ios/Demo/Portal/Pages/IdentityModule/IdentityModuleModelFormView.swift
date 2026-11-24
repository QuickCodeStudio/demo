import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleModelFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var name = ""
    @State private var moduleName = ""
    @State private var description = ""
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
                    PortalForeignKeyField(label: "module Name", module: "identity-module", model: "modules", text: $moduleName)
                        .disabled(!keys.isEmpty)
                    FieldLabel(label: "description") { TextField("description", text: $description) }
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
        .navigationTitle(keys.isEmpty ? "Models" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ModelsInsert(body: .json(.init(value1: .init(
                name: name,
                moduleName: moduleName,
                description: description
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ModelsUpdate(path: .init(name: keys[0], moduleName: keys[1]), body: .json(.init(value1: .init(
                name: keys[0],
                moduleName: keys[1],
                description: description
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
            let output = try await client.ModelsGetItem(path: .init(name: keys[0], moduleName: keys[1]))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            name = item.name ?? ""
            moduleName = item.moduleName ?? ""
            description = item.description ?? ""
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}