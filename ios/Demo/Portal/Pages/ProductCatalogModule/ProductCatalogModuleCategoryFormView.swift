import SwiftUI
import QuickCodeHTTP
import ProductCatalogModuleClient

struct ProductCatalogModuleCategoryFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var parentCategoryId = ""
    @State private var name = ""
    @State private var slug = ""
    @State private var icon = ""
    @State private var banner = ""
    @State private var introVideo = ""
    @State private var isActive = false
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
                    PortalForeignKeyField(label: "parent Category", module: "product-catalog-module", model: "categories", text: $parentCategoryId)
                    FieldLabel(label: "name") { TextField("name", text: $name) }
                    FieldLabel(label: "slug") { TextField("slug", text: $slug) }
                    MediaUploadField(label: "icon", kind: .image, text: $icon)
                    MediaUploadField(label: "banner", kind: .image, text: $banner)
                    MediaUploadField(label: "intro Video", kind: .video, text: $introVideo)
                    SwitchField(label: "is Active", isOn: $isActive)
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
        .navigationTitle(keys.isEmpty ? "Categories" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.CategoriesInsert(body: .json(.init(
                id: 0,
                parentCategoryId: Int32(parentCategoryId) ?? 0,
                name: name,
                slug: slug,
                icon: icon,
                banner: banner,
                introVideo: introVideo,
                isActive: isActive
            )))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.CategoriesUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(
                id: Int32(keys[0]) ?? 0,
                parentCategoryId: Int32(parentCategoryId) ?? 0,
                name: name,
                slug: slug,
                icon: icon,
                banner: banner,
                introVideo: introVideo,
                isActive: isActive
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
            let output = try await client.CategoriesGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            parentCategoryId = PortalNumber.integer(item.parentCategoryId)
            name = item.name
            slug = item.slug
            icon = item.icon
            banner = item.banner
            introVideo = item.introVideo
            isActive = item.isActive
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}