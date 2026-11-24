import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleApiKeyUsageLogFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var apiKeyId = ""
    @State private var httpMethod = "Get"
    @State private var urlPath = ""
    @State private var statusCode = ""
    @State private var ipAddress = ""
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
                    PortalForeignKeyField(label: "api Key", module: "identity-module", model: "api-keys", text: $apiKeyId)
                    SelectField(label: "http Method", options: [(id: "Get", name: "Get"), (id: "Post", name: "Post"), (id: "Put", name: "Put"), (id: "Delete", name: "Delete"), (id: "Patch", name: "Patch")], selection: $httpMethod)
                    FieldLabel(label: "url Path") { TextField("url Path", text: $urlPath) }
                    NumberField(label: "status Code", text: $statusCode)
                    FieldLabel(label: "ip Address") { TextField("ip Address", text: $ipAddress) }
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
        .navigationTitle(keys.isEmpty ? "Api Key Usage Logs" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ApiKeyUsageLogsInsert(body: .json(.init(value1: .init(
                id: 0,
                apiKeyId: apiKeyId,
                httpMethod: .init(value1: { switch httpMethod {
case "Get": .Get
case "Post": .Post
case "Put": .Put
case "Delete": .Delete
case "Patch": .Patch
default: .Get
} }()),
                urlPath: urlPath,
                statusCode: Int32(statusCode) ?? 0,
                ipAddress: ipAddress,
                createdDate: createdDate
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ApiKeyUsageLogsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(value1: .init(
                id: Int32(keys[0]) ?? 0,
                apiKeyId: apiKeyId,
                httpMethod: .init(value1: { switch httpMethod {
case "Get": .Get
case "Post": .Post
case "Put": .Put
case "Delete": .Delete
case "Patch": .Patch
default: .Get
} }()),
                urlPath: urlPath,
                statusCode: Int32(statusCode) ?? 0,
                ipAddress: ipAddress,
                createdDate: createdDate
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
            let output = try await client.ApiKeyUsageLogsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            apiKeyId = item.apiKeyId ?? ""
            httpMethod = item.httpMethod.map { String($0.value1.rawValue) } ?? "Get"
            urlPath = item.urlPath ?? ""
            statusCode = item.statusCode.map { PortalNumber.integer($0) } ?? ""
            ipAddress = item.ipAddress ?? ""
            createdDate = item.createdDate ?? Date()
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}