import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleTableComboboxSettingFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var tableName = ""
    @State private var idColumn = ""
    @State private var textColumns = ""
    @State private var stringFormat = ""
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
                    FieldLabel(label: "table Name") { TextField("table Name", text: $tableName) }
                    FieldLabel(label: "id Column") { TextField("id Column", text: $idColumn) }
                    FieldLabel(label: "text Columns") { TextField("text Columns", text: $textColumns) }
                    FieldLabel(label: "string Format") { TextField("string Format", text: $stringFormat) }
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
        .navigationTitle(keys.isEmpty ? "Table Combobox Settings" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.TableComboboxSettingsInsert(body: .json(.init(value1: .init(
                tableName: tableName,
                idColumn: idColumn,
                textColumns: textColumns,
                stringFormat: stringFormat
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.TableComboboxSettingsUpdate(path: .init(tableName: keys[0]), body: .json(.init(value1: .init(
                tableName: keys[0],
                idColumn: idColumn,
                textColumns: textColumns,
                stringFormat: stringFormat
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
            let output = try await client.TableComboboxSettingsGetItem(path: .init(tableName: keys[0]))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            tableName = item.tableName ?? ""
            idColumn = item.idColumn ?? ""
            textColumns = item.textColumns ?? ""
            stringFormat = item.stringFormat ?? ""
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}