import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleColumnTypeFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var typeName = ""
    @State private var iosComponentName = ""
    @State private var iosType = ""
    @State private var iconCode = ""
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
                    FieldLabel(label: "type Name") { TextField("type Name", text: $typeName) }
                    FieldLabel(label: "ios Component Name") { TextField("ios Component Name", text: $iosComponentName) }
                    FieldLabel(label: "ios Type") { TextField("ios Type", text: $iosType) }
                    FieldLabel(label: "icon Code") { TextField("icon Code", text: $iconCode) }
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
        .navigationTitle(keys.isEmpty ? "Column Types" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ColumnTypesInsert(body: .json(.init(value1: .init(
                id: 0,
                typeName: typeName,
                iosComponentName: iosComponentName,
                iosType: iosType,
                iconCode: iconCode
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ColumnTypesUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(value1: .init(
                id: Int32(keys[0]) ?? 0,
                typeName: typeName,
                iosComponentName: iosComponentName,
                iosType: iosType,
                iconCode: iconCode
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
            let output = try await client.ColumnTypesGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            typeName = item.typeName ?? ""
            iosComponentName = item.iosComponentName ?? ""
            iosType = item.iosType ?? ""
            iconCode = item.iconCode ?? ""
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}