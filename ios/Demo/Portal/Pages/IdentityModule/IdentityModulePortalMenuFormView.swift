import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModulePortalMenuFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var key = ""
    @State private var name = ""
    @State private var text = ""
    @State private var tooltip = ""
    @State private var actionName = ""
    @State private var orderNo = ""
    @State private var parentName = ""
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
                    FieldLabel(label: "name") { TextField("name", text: $name) }
                    FieldLabel(label: "text") { TextField("text", text: $text) }
                    FieldLabel(label: "tooltip") { TextField("tooltip", text: $tooltip) }
                    FieldLabel(label: "action Name") { TextField("action Name", text: $actionName) }
                    NumberField(label: "order No", text: $orderNo)
                    FieldLabel(label: "parent Name") { TextField("parent Name", text: $parentName) }
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
        .navigationTitle(keys.isEmpty ? "Portal Menus" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PortalMenusInsert(body: .json(.init(value1: .init(
                key: key,
                name: name,
                text: text,
                tooltip: tooltip,
                actionName: actionName,
                orderNo: Int32(orderNo) ?? 0,
                parentName: parentName
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.PortalMenusUpdate(path: .init(key: keys[0]), body: .json(.init(value1: .init(
                key: keys[0],
                name: name,
                text: text,
                tooltip: tooltip,
                actionName: actionName,
                orderNo: Int32(orderNo) ?? 0,
                parentName: parentName
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
            let output = try await client.PortalMenusGetItem(path: .init(key: keys[0]))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            key = item.key ?? ""
            name = item.name ?? ""
            text = item.text ?? ""
            tooltip = item.tooltip ?? ""
            actionName = item.actionName ?? ""
            orderNo = item.orderNo.map { PortalNumber.integer($0) } ?? ""
            parentName = item.parentName ?? ""
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}