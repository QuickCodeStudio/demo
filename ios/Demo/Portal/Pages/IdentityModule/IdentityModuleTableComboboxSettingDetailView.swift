import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleTableComboboxSettingDetailView: View {
    let keys: [String]
    @Environment(SessionStore.self) private var session
    @Environment(PortalAccess.self) private var access
    @State private var row: GatewayRow?
    @State private var loading = true
    @State private var failure: String?
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    @State private var confirmDelete = false

    @State private var openEditor = false

    var body: some View {
        Group {
            if loading, row == nil, failure == nil {
                LoadingState()
            } else if let failure, row == nil {
                ErrorState(message: failure, retry: { Task { await load() } })
            } else if let row {
                ScreenCanvas {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            PortalRecordHeader(title: row.title, subtitle: row.subtitle, image: row.image)
                            PortalValueList(values: row.fields)
                        }
                        .padding(.vertical, ShellMetrics.screenPadding)
                        .padding(.horizontal, ShellMetrics.screenPadding)
                    }
                }
            }
        }
        .navigationTitle("Table Combobox Settings")

        .portalSafeRail(detailSafeRailActions, showsBack: true)
        .navigationDestination(isPresented: $openEditor) {
            IdentityModuleTableComboboxSettingFormView(keys: keys)
        }
        .portalDeleteConfirm(isPresented: $confirmDelete, onConfirm: { Task { await remove() } })

        .task { await load() }
    }

    private func load() async {
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.TableComboboxSettingsGetItem(path: .init(tableName: keys[0]))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            let loaded = GatewayRow(
                    id: UUID().uuidString,
                    recordId: nil,
                    keys: [],
                    title: item.tableName ?? "",
                    subtitle: item.idColumn ?? "",
                    image: nil,
                    fields: [
                    PortalValue(id: "tableName", label: "Table Name", text: item.tableName ?? "", kind: .text),
                    PortalValue(id: "idColumn", label: "Id Column", text: item.idColumn ?? "", kind: .text),
                    PortalValue(id: "textColumns", label: "Text Columns", text: item.textColumns ?? "", kind: .text),
                    PortalValue(id: "stringFormat", label: "String Format", text: item.stringFormat ?? "", kind: .text)
                    ]
                )
            row = await PortalRefEnricher.enrich(loaded, module: "identity-module", session: session)
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private var detailSafeRailActions: [PortalSafeRail.Action] {
        var items: [PortalSafeRail.Action] = []
        if access.allows("IdentityModuleTableComboboxSettings", "Delete") {
            items.append(
                PortalSafeRail.Action(
                    id: "delete",
                    systemName: "trash",
                    role: .destructive,
                    accessibilityLabel: "Delete",
                    perform: { confirmDelete = true }
                )
            )
        }
        if access.allows("IdentityModuleTableComboboxSettings", "Update") {
            items.append(
                PortalSafeRail.Action(
                    id: "edit",
                    systemName: "pencil",
                    accessibilityLabel: "Edit",
                    perform: { openEditor = true }
                )
            )
        }
        return items
    }

    private func remove() async {
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.TableComboboxSettingsDelete(path: .init(tableName: keys[0]))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            toast.show("Deleted")
            dismiss()
        } catch {
            failure = PortalErrors.record(error)
        }
    }
}