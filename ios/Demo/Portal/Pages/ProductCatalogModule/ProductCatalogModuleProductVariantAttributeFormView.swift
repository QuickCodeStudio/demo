import SwiftUI
import QuickCodeHTTP
import ProductCatalogModuleClient

struct ProductCatalogModuleProductVariantAttributeFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var variantId = ""
    @State private var attributeValueId = ""
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
                    PortalForeignKeyField(label: "variant", module: "product-catalog-module", model: "product-variants", text: $variantId)
                        .disabled(!keys.isEmpty)
                    PortalForeignKeyField(label: "attribute Value", module: "product-catalog-module", model: "attribute-values", text: $attributeValueId)
                        .disabled(!keys.isEmpty)
                    if let failure {
                        Text(failure).foregroundStyle(.red)
                    }
                    if keys.isEmpty {
                        PrimaryButton(title: busy ? "Saving…" : "Save") { Task { await save() } }
                            .disabled(busy || !ready)
                    } else {
                        Text("These fields identify the record and can’t be changed. Delete this link and create a new one to pick different values.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(ShellMetrics.screenPadding)
            }
        }
            }
        }
        .navigationTitle(keys.isEmpty ? "Product Variant Attributes" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ProductVariantAttributesInsert(body: .json(.init(
                variantId: Int32(variantId) ?? 0,
                attributeValueId: Int32(attributeValueId) ?? 0
            )))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.ProductVariantAttributesUpdate(path: .init(variantId: Int32(keys[0]) ?? 0, attributeValueId: Int32(keys[1]) ?? 0), body: .json(.init(
                variantId: Int32(keys[0]) ?? 0,
                attributeValueId: Int32(keys[1]) ?? 0
            )))
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
            let output = try await client.ProductVariantAttributesGetItem(path: .init(variantId: Int32(keys[0]) ?? 0, attributeValueId: Int32(keys[1]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            variantId = PortalNumber.integer(item.variantId)
            attributeValueId = PortalNumber.integer(item.attributeValueId)
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}