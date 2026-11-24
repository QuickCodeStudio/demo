import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleAspNetRoleFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var name = ""
    @State private var normalizedName = ""
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
                    FieldLabel(label: "normalized Name") { TextField("normalized Name", text: $normalizedName) }
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
        .navigationTitle(keys.isEmpty ? "Asp Net Roles" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.AspNetRolesInsert(body: .json(.init(value1: .init(
                id: "",
                name: name,
                normalizedName: normalizedName
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.AspNetRolesUpdate(path: .init(id: keys[0]), body: .json(.init(value1: .init(
                id: keys[0],
                name: name,
                normalizedName: normalizedName
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
            let output = try await client.AspNetRolesGetItem(path: .init(id: keys[0]))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            name = item.name ?? ""
            normalizedName = item.normalizedName ?? ""
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}