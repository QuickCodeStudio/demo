import SwiftUI
import UIKit

// MARK: - API Keys (web IdentityModuleApiKeyGrands)

struct ApiKeysManagerView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.colorScheme) private var colorScheme

    @State private var items: [ApiKeyRow] = []
    @State private var groups: [String] = []
    @State private var loading = true
    @State private var failure: String?
    @State private var filter = "Active"
    @State private var showCreate = false
    @State private var createdSecret: String?
    @State private var draftName = ""
    @State private var draftGroup = "Admin"
    @State private var draftDescription = ""
    @State private var draftExpires = Date().addingTimeInterval(90 * 24 * 3600)
    @State private var busy = false
    @State private var createDetent: PresentationDetent = .large

    private var filtered: [ApiKeyRow] {
        switch filter {
        case "All": return items
        case "Revoked": return items.filter { $0.status.caseInsensitiveCompare("Revoked") == .orderedSame }
        case "Expired": return items.filter { $0.status.caseInsensitiveCompare("Expired") == .orderedSame }
        default: return items.filter(\.isEffectivelyActive)
        }
    }

    var body: some View {
        GrantManagerChrome(
            title: "API Keys",
            subtitle: "Issue and revoke service client keys. Storefront Public / Guest groups are not assignable.",
            loading: loading && items.isEmpty,
            failure: failure,
            empty: !loading && filtered.isEmpty ? "No API keys in this filter." : nil,
            toolbar: [
                PortalSafeRail.Action(
                    id: "api-keys-add",
                    systemName: "plus",
                    accessibilityLabel: "Add",
                    pinned: true
                ) { showCreate = true }
            ]
        ) {
            GrantSegmentedFilter(
                options: [
                    ("Active", items.filter(\.isEffectivelyActive).count),
                    ("All", items.count),
                    ("Revoked", items.filter { $0.status.caseInsensitiveCompare("Revoked") == .orderedSame }.count),
                    ("Expired", items.filter { $0.status.caseInsensitiveCompare("Expired") == .orderedSame }.count)
                ],
                selection: $filter
            )

            LazyVStack(spacing: 12) {
                ForEach(filtered) { item in
                    apiKeyCard(item)
                }
            }
        }
        .task { await reload() }
        .sheet(isPresented: $showCreate) { createSheet }
        .alert("API key created", isPresented: Binding(
            get: { createdSecret != nil },
            set: { if !$0 { createdSecret = nil } }
        )) {
            Button("Copy") {
                if let createdSecret { UIPasteboard.general.string = createdSecret }
            }
            Button("Done", role: .cancel) { createdSecret = nil }
        } message: {
            Text(createdSecret ?? "")
        }
    }

    private func apiKeyCard(_ item: ApiKeyRow) -> some View {
        let active = item.isEffectivelyActive
        let statusText = item.status.isEmpty ? (active ? "Active" : "Inactive") : item.status
        let secondary = colorScheme == .dark
            ? Color.white.opacity(0.78)
            : Brand.muted(colorScheme)
        let chipFill = colorScheme == .dark
            ? Color.white.opacity(0.12)
            : Color.primary.opacity(0.06)
        let chipStroke = colorScheme == .dark
            ? Color.white.opacity(0.16)
            : Color.primary.opacity(0.08)

        return VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Brand.action.opacity(colorScheme == .dark ? 0.28 : 0.14))
                        .frame(width: 44, height: 44)
                    Image(systemName: "key.horizontal.fill")
                        .font(.body.weight(.bold))
                        .foregroundStyle(colorScheme == .dark ? Color(hex: 0x93C5FD) : Brand.action)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(item.name)
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(Brand.text(colorScheme))
                    Text(item.permissionGroupName)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(secondary)
                }
                Spacer(minLength: 8)
                Text(statusText)
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(active
                                     ? (colorScheme == .dark ? Color(hex: 0x86EFAC) : Color(hex: 0x15803D))
                                     : secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background {
                        Capsule()
                            .fill(active
                                  ? Color(hex: 0x22C55E).opacity(colorScheme == .dark ? 0.22 : 0.14)
                                  : chipFill)
                    }
                    .overlay {
                        Capsule()
                            .strokeBorder(active
                                          ? Color(hex: 0x86EFAC).opacity(0.45)
                                          : chipStroke)
                    }
            }

            HStack(spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "number")
                        .font(.caption2.weight(.bold))
                    Text(item.keyPrefix)
                        .font(.caption.monospaced().weight(.semibold))
                }
                .foregroundStyle(Brand.text(colorScheme))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Capsule().fill(chipFill))
                .overlay(Capsule().strokeBorder(chipStroke))

                if let expires = item.expiresAtLabel {
                    HStack(spacing: 5) {
                        Image(systemName: "calendar")
                            .font(.caption2.weight(.bold))
                        Text(expires)
                            .font(.caption.weight(.medium))
                    }
                    .foregroundStyle(secondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Capsule().fill(chipFill))
                    .overlay(Capsule().strokeBorder(chipStroke))
                }
            }

            if active {
                HStack {
                    Spacer(minLength: 0)
                    Button {
                        Task { await revoke(item) }
                    } label: {
                        Label("Revoke", systemImage: "xmark.shield.fill")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(colorScheme == .dark ? Color(hex: 0xFECACA) : Color(hex: 0xB91C1C))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                    }
                    .buttonStyle(.plain)
                    .background(
                        Capsule()
                            .fill(Color(hex: 0xB91C1C).opacity(colorScheme == .dark ? 0.28 : 0.12))
                    )
                    .overlay(
                        Capsule()
                            .strokeBorder(Color(hex: 0xFCA5A5).opacity(colorScheme == .dark ? 0.35 : 0.25))
                    )
                    .disabled(busy)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassPanel(colorScheme, tint: Brand.action.opacity(colorScheme == .dark ? 0.1 : 0.05))
    }

    private var createSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    glassField(title: "Name") {
                        TextField("Key name", text: $draftName)
                            .textInputAutocapitalization(.words)
                    }
                    GrantGroupChipBar(groups: groups, selection: $draftGroup) { group in
                        draftGroup = group
                    }
                    glassField(title: "Description") {
                        TextField("Optional note", text: $draftDescription)
                    }
                    glassField(title: "Expires") {
                        DatePicker("", selection: $draftExpires, in: Date()..., displayedComponents: [.date, .hourAndMinute])
                            .labelsHidden()
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(20)
            }
            .background { ShellAtmosphere(intensity: 0.85) }
            .navigationTitle("New API key")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showCreate = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { Task { await create() } }
                        .disabled(busy || draftName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || groups.isEmpty)
                }
            }
        }
        .portalSheetPresentation($createDetent)
        .presentationBackground { ShellAtmosphere(intensity: 0.9) }
        .onAppear { createDetent = .large }
    }

    private func glassField<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption.weight(.bold))
                .foregroundStyle(Brand.muted(colorScheme))
            content()
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .glassPanel(colorScheme)
        }
    }

    private func reload() async {
        loading = true
        failure = nil
        do {
            async let keysData = session.pathData("/api/auth/api-keys")
            async let groupsData = session.collectionData(module: "identity-module", model: "permission-groups")
            let (keysPayload, groupsPayload) = try await (keysData, groupsData)
            items = try decodeApiKeys(keysPayload)
            // Show Public in the picker (visible); create still blocks storefront groups.
            groups = try decodePermissionGroups(groupsPayload).sorted()
            if draftGroup.isEmpty || !groups.contains(draftGroup) {
                draftGroup = groups.first { !isStorefrontPublic($0) } ?? groups.first ?? ""
            }
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private func create() async {
        if isStorefrontPublic(draftGroup) {
            toast.show("Public / Guest cannot be assigned to API keys.")
            return
        }
        busy = true
        defer { busy = false }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var body: [String: Any] = [
            "name": draftName.trimmingCharacters(in: .whitespacesAndNewlines),
            "permissionGroupName": draftGroup,
            "expiresAt": formatter.string(from: draftExpires)
        ]
        let description = draftDescription.trimmingCharacters(in: .whitespacesAndNewlines)
        if !description.isEmpty { body["description"] = description }
        do {
            let data = try await session.pathJSON("/api/auth/api-keys", method: "POST", body: body)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let secret = (json["apiKey"] as? String) ?? (json["ApiKey"] as? String) {
                createdSecret = secret
            }
            showCreate = false
            draftName = ""
            draftDescription = ""
            toast.show("API key created")
            await reload()
        } catch {
            failure = PortalErrors.record(error)
        }
    }

    private func revoke(_ item: ApiKeyRow) async {
        busy = true
        defer { busy = false }
        do {
            _ = try await session.pathJSON("/api/auth/api-keys/\(item.id)/revoke", method: "POST")
            toast.show("API key revoked")
            await reload()
        } catch {
            failure = PortalErrors.record(error)
        }
    }
}

// MARK: - API Method Grants

struct ApiMethodGrantsManagerView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.colorScheme) private var colorScheme

    @State private var groups: [String] = []
    @State private var selectedGroup = ""
    @State private var modules: [GrantModuleSection] = []
    @State private var loading = true
    @State private var failure: String?
    @State private var query = ""
    @State private var statusFilter = "All"
    @State private var expandedModules: Set<String> = []
    @State private var expandedControllers: Set<String> = []

    private var visibleModules: [GrantModuleSection] {
        let text = query.trimmingCharacters(in: .whitespacesAndNewlines)
        return modules.compactMap { module in
            let controllers = module.controllers.compactMap { controller -> GrantControllerSection? in
                let methods = controller.methods.filter { method in
                    let statusOk: Bool = {
                        switch statusFilter {
                        case "Granted": return method.isGranted
                        case "Revoked": return !method.isGranted
                        default: return true
                        }
                    }()
                    guard statusOk else { return false }
                    guard !text.isEmpty else { return true }
                    return method.path.localizedStandardContains(text)
                        || method.key.localizedStandardContains(text)
                        || method.httpMethod.localizedStandardContains(text)
                        || controller.name.localizedStandardContains(text)
                        || module.name.localizedStandardContains(text)
                }
                guard !methods.isEmpty else { return nil }
                return GrantControllerSection(id: controller.id, name: controller.name, methods: methods)
            }
            guard !controllers.isEmpty else { return nil }
            return GrantModuleSection(id: module.id, name: module.name, controllers: controllers)
        }
    }

    private var counts: (all: Int, granted: Int, revoked: Int) {
        let methods = modules.flatMap { $0.controllers.flatMap(\.methods) }
        let granted = methods.filter(\.isGranted).count
        return (methods.count, granted, methods.count - granted)
    }

    var body: some View {
        GrantManagerChrome(
            title: "API Method Grants",
            subtitle: "Manage HTTP endpoint access for each permission group.",
            loading: loading,
            failure: failure,
            empty: !loading && visibleModules.isEmpty ? "No API methods match your filters." : nil
        ) {
            GrantGroupChipBar(groups: groups, selection: $selectedGroup) { group in
                selectedGroup = group
                Task { await loadGrants(resetExpanded: true) }
            }

            GrantSearchField(placeholder: "Search method, path, controller…", text: $query)

            GrantSegmentedFilter(
                options: [
                    ("All", counts.all),
                    ("Granted", counts.granted),
                    ("Revoked", counts.revoked)
                ],
                selection: $statusFilter
            )

            LazyVStack(spacing: 12) {
                ForEach(visibleModules) { module in
                    moduleBlock(module)
                }
            }
        }
        .task { await bootstrap() }
    }

    private func moduleBlock(_ module: GrantModuleSection) -> some View {
        let open = expandedModules.contains(module.id)
        return VStack(spacing: 0) {
            Button {
                withoutAnimation {
                    if open { expandedModules.remove(module.id) } else { expandedModules.insert(module.id) }
                }
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.bold))
                        .rotationEffect(.degrees(open ? 90 : 0))
                        .foregroundStyle(Brand.muted(colorScheme))
                    Image(systemName: "cube.box.fill")
                        .foregroundStyle(Brand.navy)
                    Text(spaced(module.name))
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Brand.text(colorScheme))
                    Spacer(minLength: 0)
                    CountChip("\(module.controllers.count) models")
                }
                .padding(14)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if open {
                VStack(spacing: 10) {
                    ForEach(module.controllers) { controller in
                        controllerBlock(moduleId: module.id, controller: controller)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 12)
            }
        }
        .grantSurface(colorScheme)
    }

    private func controllerBlock(moduleId: String, controller: GrantControllerSection) -> some View {
        let key = moduleId + "|" + controller.id
        let open = expandedControllers.contains(key)
        return VStack(spacing: 0) {
            Button {
                withoutAnimation {
                    if open { expandedControllers.remove(key) } else { expandedControllers.insert(key) }
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "chevron.right")
                        .font(.caption2.weight(.bold))
                        .rotationEffect(.degrees(open ? 90 : 0))
                        .foregroundStyle(Brand.action)
                    Image(systemName: "chevron.left.forwardslash.chevron.right")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Brand.action)
                    Text(controller.name)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Brand.text(colorScheme))
                    Spacer(minLength: 0)
                    CountChip("\(controller.methods.count) items", accent: true)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(
                    LinearGradient(
                        colors: [
                            Brand.backgroundSubtle(colorScheme),
                            Brand.backgroundMuted(colorScheme).opacity(0.55)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                )
            }
            .buttonStyle(.plain)

            if open {
                VStack(spacing: 8) {
                    ForEach(controller.methods) { method in
                        methodCard(method)
                    }
                }
                .padding(.top, 8)
            }
        }
    }

    private func methodCard(_ method: GrantMethodRow) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Method / Path")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Brand.muted(colorScheme))

            HStack(alignment: .center, spacing: 8) {
                Text(method.httpMethod.uppercased())
                    .font(.caption2.weight(.bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .foregroundStyle(.white)
                    .background(httpMethodColor(method.httpMethod), in: Capsule())
                Text(method.path)
                    .font(.caption.monospaced())
                    .foregroundStyle(Brand.text(colorScheme))
                    .lineLimit(2)
                Spacer(minLength: 0)
            }
            .padding(10)
            .background(Brand.backgroundSubtle(colorScheme), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

            HStack {
                Text(method.isGranted ? "Granted" : "Revoked")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(method.isGranted ? Color(hex: 0x15803D) : Color(hex: 0xB91C1C))
                Spacer()
                Toggle("", isOn: Binding(
                    get: { method.isGranted },
                    set: { next in Task { await setMethod(method, granted: next) } }
                ))
                .labelsHidden()
                .tint(Brand.action)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Brand.backgroundMuted(colorScheme).opacity(colorScheme == .dark ? 0.9 : 1))
                .overlay {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(Color.primary.opacity(colorScheme == .dark ? 0.14 : 0.07))
                }
        )
    }

    private func bootstrap() async {
        do {
            let data = try await session.collectionData(module: "identity-module", model: "permission-groups")
            // Web Api Method Grants lists every group including Public.
            groups = try decodePermissionGroups(data).sorted()
            if selectedGroup.isEmpty { selectedGroup = groups.first ?? "" }
            await loadGrants(resetExpanded: true)
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private func loadGrants(resetExpanded: Bool) async {
        guard !selectedGroup.isEmpty else {
            modules = []
            loading = false
            return
        }
        let showSpinner = modules.isEmpty || resetExpanded
        if showSpinner { loading = true }
        failure = nil
        do {
            let encoded = selectedGroup.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? selectedGroup
            let data = try await session.pathData(
                "/api/identity-module/api-method-definitions/get-api-permissions/\(encoded)"
            )
            modules = try decodeApiModulePermissions(data)
            if resetExpanded {
                expandedModules = Set(modules.prefix(1).map(\.id))
                expandedControllers = Set(
                    modules.prefix(1).flatMap { module in
                        module.controllers.prefix(1).map { module.id + "|" + $0.id }
                    }
                )
            }
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private func setMethod(_ method: GrantMethodRow, granted: Bool) async {
        do {
            _ = try await session.pathJSON(
                "/api/identity-module/api-method-definitions/update-api-permission",
                method: "POST",
                body: [
                    "permissionGroupName": selectedGroup,
                    "apiMethodDefinitionKey": method.key,
                    "value": granted ? 1 : 0
                ]
            )
            toast.show("\(method.httpMethod) \(granted ? "granted" : "revoked")")
            await loadGrants(resetExpanded: false)
        } catch {
            toast.show(PortalErrors.record(error))
            failure = PortalErrors.record(error)
        }
    }
}

// MARK: - Portal Page Grants

private enum PortalGrantTab: String, CaseIterable, Identifiable {
    case pages = "Pages"
    case reports = "Live Reports"
    var id: String { rawValue }
}

struct PortalPageGrantsManagerView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @State private var groups: [String] = []
    @State private var selectedGroup = ""
    @State private var pages: [PortalPageGrantRow] = []
    @State private var loading = true
    @State private var failure: String?
    @State private var query = ""
    @State private var tab: PortalGrantTab = .pages
    @State private var expandedModules: Set<String> = []
    @State private var expandedTables: Set<String> = []

    private var pageCardColumns: [GridItem] {
        horizontalSizeClass == .regular
            ? [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)]
            : [GridItem(.flexible())]
    }

    private var pageItems: [PortalPageGrantRow] { pages.filter { !$0.isQuery } }
    private var queryItems: [PortalPageGrantRow] { pages.filter(\.isQuery) }

    private var pageModules: [PortalPageModuleGroup] {
        groupedPages(pageItems, matching: query)
    }

    private var queryModules: [PortalPageQueryModuleGroup] {
        groupedQueries(queryItems, matching: query)
    }

    var body: some View {
        GrantManagerChrome(
            title: "Portal Page Grants",
            subtitle: "Manage page and live-report access for each permission group.",
            loading: loading,
            failure: failure,
            empty: emptyMessage
        ) {
            GrantGroupChipBar(groups: groups, selection: $selectedGroup) { group in
                selectedGroup = group
                Task { await loadGrants(resetExpanded: true) }
            }

            GrantSearchField(placeholder: "Search pages or reports…", text: $query)

            GrantTabBar(
                tabs: [
                    (PortalGrantTab.pages.rawValue, pageItems.count),
                    (PortalGrantTab.reports.rawValue, queryItems.count)
                ],
                selection: Binding(
                    get: { tab.rawValue },
                    set: { tab = $0 == PortalGrantTab.reports.rawValue ? .reports : .pages }
                ),
                accentFor: { name in
                    name == PortalGrantTab.reports.rawValue ? Color(hex: 0x0F766E) : Brand.navy
                }
            )

            if tab == .pages {
                LazyVStack(spacing: 12) {
                    ForEach(pageModules) { module in
                        pageModuleBlock(module)
                    }
                }
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    breadcrumb
                    LazyVStack(spacing: 12) {
                        ForEach(queryModules) { module in
                            queryModuleBlock(module)
                        }
                    }
                }
            }
        }
        .task { await bootstrap() }
        .onChange(of: query) { _, text in
            guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
            if tab == .pages {
                expandedModules = Set(pageModules.map(\.id))
            } else {
                expandedModules = Set(queryModules.map(\.id))
                expandedTables = Set(queryModules.flatMap { module in
                    module.tables.map { module.id + "|" + $0.id }
                })
            }
        }
    }

    private var emptyMessage: String? {
        guard !loading else { return nil }
        if tab == .pages, pageModules.isEmpty { return "No CRUD pages found for this permission group." }
        if tab == .reports, queryModules.isEmpty { return "No live report pages found for this permission group." }
        return nil
    }

    private var breadcrumb: some View {
        HStack(spacing: 6) {
            Text("Live Reports").font(.caption.weight(.semibold)).foregroundStyle(Color(hex: 0x0F766E))
            crumbSep
            Text("Module").font(.caption).foregroundStyle(Brand.muted(colorScheme))
            crumbSep
            Text("Tables").font(.caption).foregroundStyle(Brand.muted(colorScheme))
            crumbSep
            Text("Report page").font(.caption).foregroundStyle(Brand.muted(colorScheme))
        }
        .padding(.bottom, 2)
    }

    private var crumbSep: some View {
        Text("/")
            .font(.caption.weight(.bold))
            .foregroundStyle(Brand.muted(colorScheme).opacity(0.7))
    }

    private func pageModuleBlock(_ module: PortalPageModuleGroup) -> some View {
        let open = expandedModules.contains(module.id)
        return VStack(spacing: 0) {
            moduleHeader(
                title: spaced(module.name),
                symbol: "cube.box.fill",
                meta: "\(module.items.count) pages",
                open: open
            ) {
                withoutAnimation {
                    if open { expandedModules.remove(module.id) } else { expandedModules.insert(module.id) }
                }
            }

            if open {
                LazyVGrid(columns: pageCardColumns, spacing: 10) {
                    ForEach(module.items) { page in
                        pageCard(page)
                    }
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    LinearGradient(
                        colors: [
                            Brand.backgroundMuted(colorScheme).opacity(colorScheme == .dark ? 0.55 : 0.65),
                            Brand.backgroundSubtle(colorScheme).opacity(0.35)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            }
        }
        .grantSurface(colorScheme)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func pageCard(_ page: PortalPageGrantRow) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(spaced(page.title))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Brand.text(colorScheme))
                .lineLimit(2)
                .minimumScaleFactor(0.9)

            PermissionToggleStrip(actions: page.actions) { action, granted in
                applyLocal(pageId: page.id, action: action, granted: granted)
                Task { await setPage(page, action: action, granted: granted) }
            }
        }
        .padding(horizontalSizeClass == .regular ? 12 : 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(.clear)
                .glassEffect(
                    .regular.tint(Color.primary.opacity(colorScheme == .dark ? 0.06 : 0.03)),
                    in: RoundedRectangle(cornerRadius: 14, style: .continuous)
                )
        }
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(Color.primary.opacity(colorScheme == .dark ? 0.16 : 0.08), lineWidth: 1)
        }
    }

    private func queryModuleBlock(_ module: PortalPageQueryModuleGroup) -> some View {
        let open = expandedModules.contains(module.id)
        let reportCount = module.tables.reduce(0) { $0 + $1.items.count }
        return VStack(spacing: 0) {
            moduleHeader(
                title: spaced(module.name),
                symbol: "square.stack.3d.up.fill",
                meta: "\(reportCount) reports · \(module.tables.count) tables",
                open: open,
                accent: Color(hex: 0x0F766E)
            ) {
                withoutAnimation {
                    if open { expandedModules.remove(module.id) } else { expandedModules.insert(module.id) }
                }
            }

            if open {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(module.tables) { table in
                        tableBlock(moduleId: module.id, table: table)
                    }
                }
                .padding(12)
            }
        }
        .grantSurface(colorScheme)
    }

    private func tableBlock(moduleId: String, table: PortalPageQueryTableGroup) -> some View {
        let key = moduleId + "|" + table.id
        let open = expandedTables.contains(key)
        return VStack(alignment: .leading, spacing: 0) {
            Button {
                withoutAnimation {
                    if open { expandedTables.remove(key) } else { expandedTables.insert(key) }
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "chevron.right")
                        .font(.caption2.weight(.bold))
                        .rotationEffect(.degrees(open ? 90 : 0))
                        .foregroundStyle(Color(hex: 0x0F766E))
                    Image(systemName: "tablecells")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color(hex: 0x0F766E))
                        .frame(width: 24, height: 24)
                        .background(Color(hex: 0x0F766E).opacity(0.12), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
                    Text(spaced(table.name))
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Color(hex: 0x0F766E))
                    Spacer(minLength: 0)
                    CountChip("\(table.items.count)")
                }
                .padding(.vertical, 8)
                .padding(.horizontal, 6)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if open {
                VStack(spacing: 8) {
                    ForEach(table.items) { item in
                        queryRow(item)
                    }
                }
                .padding(.leading, 10)
                .overlay(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 1)
                        .fill(Color(hex: 0x0F766E).opacity(0.28))
                        .frame(width: 2)
                        .padding(.vertical, 4)
                }
                .padding(.top, 4)
            }
        }
    }

    private func queryRow(_ page: PortalPageGrantRow) -> some View {
        let granted = page.actions.first?.isGranted ?? false
        let action = page.actions.first?.name ?? "List"
        return HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text(spaced(page.title))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Brand.text(colorScheme))
                if !page.path.isEmpty {
                    HStack(spacing: 6) {
                        Text("Endpoint")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(Brand.muted(colorScheme))
                        Text(page.path)
                            .font(.caption2.monospaced())
                            .foregroundStyle(Brand.text(colorScheme))
                            .lineLimit(1)
                    }
                }
                Text([spaced(page.module), spaced(page.tableName), spaced(page.title)].filter { !$0.isEmpty }.joined(separator: " / "))
                    .font(.caption2)
                    .foregroundStyle(Brand.muted(colorScheme))
            }
            Spacer(minLength: 0)
            VStack(spacing: 4) {
                Text("Access")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(Brand.muted(colorScheme))
                    .textCase(.uppercase)
                Toggle("", isOn: Binding(
                    get: { granted },
                    set: { next in Task { await setPage(page, action: action, granted: next) } }
                ))
                .labelsHidden()
                .tint(Brand.action)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Brand.backgroundMuted(colorScheme).opacity(colorScheme == .dark ? 0.9 : 1))
                .overlay {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(Color.primary.opacity(colorScheme == .dark ? 0.14 : 0.07))
                }
        )
    }

    private func moduleHeader(
        title: String,
        symbol: String,
        meta: String,
        open: Bool,
        accent: Color = Brand.navy,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .rotationEffect(.degrees(open ? 90 : 0))
                    .foregroundStyle(Brand.muted(colorScheme))
                Image(systemName: symbol)
                    .foregroundStyle(accent)
                Text(title)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(Brand.text(colorScheme))
                Spacer(minLength: 0)
                CountChip(meta)
            }
            .padding(14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func bootstrap() async {
        do {
            let data = try await session.collectionData(module: "identity-module", model: "permission-groups")
            // Web Portal Page Grants hides storefront Public / Guest / Anonymous.
            groups = try decodePermissionGroups(data).filter { !isStorefrontPublic($0) }.sorted()
            if selectedGroup.isEmpty || isStorefrontPublic(selectedGroup) {
                selectedGroup = groups.first ?? ""
            }
            await loadGrants(resetExpanded: true)
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private func loadGrants(resetExpanded: Bool) async {
        guard !selectedGroup.isEmpty else {
            pages = []
            loading = false
            return
        }
        let showSpinner = pages.isEmpty || resetExpanded
        if showSpinner { loading = true }
        failure = nil
        do {
            let encoded = selectedGroup.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? selectedGroup
            let data = try await session.pathData(
                "/api/identity-module/portal-page-definitions/get-portal-page-definitions/\(encoded)"
            )
            pages = try decodePortalPageGrants(data)
            if resetExpanded {
                let firstPage = groupedPages(pageItems, matching: "").first?.id
                let firstQuery = groupedQueries(queryItems, matching: "").first
                expandedModules = Set([firstPage, firstQuery?.id].compactMap { $0 })
                if let firstQuery, let firstTable = firstQuery.tables.first {
                    expandedTables = [firstQuery.id + "|" + firstTable.id]
                } else {
                    expandedTables = []
                }
            }
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private func setPage(_ page: PortalPageGrantRow, action: String, granted: Bool) async {
        // Web Portal sends PortalPagePermissionName as "{module}{model}{PageAction}".
        let definitionKey = page.key.hasSuffix(action) ? page.key : page.key + action
        do {
            _ = try await session.pathJSON(
                "/api/identity-module/portal-page-definitions/update-portal-page-permission",
                method: "POST",
                body: [
                    "permissionGroupName": selectedGroup,
                    "portalPagePermissionName": definitionKey,
                    "portalPagePermissionType": action,
                    "value": granted ? 1 : 0
                ]
            )
            toast.show("\(spaced(page.title)) · \(action) \(granted ? "granted" : "revoked")")
            await loadGrants(resetExpanded: false)
        } catch {
            applyLocal(pageId: page.id, action: action, granted: !granted)
            toast.show(PortalErrors.record(error))
            failure = PortalErrors.record(error)
        }
    }

    private func applyLocal(pageId: String, action: String, granted: Bool) {
        guard let index = pages.firstIndex(where: { $0.id == pageId }) else { return }
        var updated = pages[index]
        updated.actions = updated.actions.map { row in
            row.name == action ? PortalPageActionRow(name: row.name, isGranted: granted) : row
        }
        pages[index] = updated
    }
}

// MARK: - Shared chrome

private struct GrantManagerChrome<Content: View>: View {
    let title: String
    let subtitle: String
    let loading: Bool
    let failure: String?
    let empty: String?
    var toolbar: [PortalSafeRail.Action] = []
    @ViewBuilder var content: () -> Content

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        ScreenCanvas {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(Brand.muted(colorScheme))

                    if loading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding(.top, 28)
                    } else if let failure {
                        Text(PortalErrors.sanitize(failure))
                            .font(.subheadline)
                            .foregroundStyle(.red)
                            .padding(.top, 8)
                    } else {
                        content()
                        if let empty {
                            Text(empty)
                                .font(.subheadline)
                                .foregroundStyle(Brand.muted(colorScheme))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 28)
                        }
                    }
                }
                .padding(.horizontal, ShellMetrics.screenPadding)
                .padding(.vertical, 16)
                .animation(.smooth(duration: 0.22), value: loading)
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.large)
        .portalSafeRail(toolbar)
    }
}

private func withoutAnimation(_ updates: () -> Void) {
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction, updates)
}

/// Grant-page search — same capsule chrome as `PortalSegmentedBar`.
private struct GrantSearchField: View {
    var placeholder: String
    @Binding var text: String
    @Environment(\.colorScheme) private var colorScheme
    @FocusState private var focused: Bool

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(focused ? Brand.action : Brand.text(colorScheme).opacity(0.55))
            TextField(placeholder, text: $text)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Brand.text(colorScheme))
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($focused)
            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.body)
                        .foregroundStyle(Brand.muted(colorScheme))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 9)
        .portalGlassCapsule(colorScheme)
        .overlay {
            if focused {
                Capsule(style: .continuous)
                    .strokeBorder(Brand.action.opacity(0.4), lineWidth: 1)
            }
        }
    }
}

/// Permission groups — Freytz-style segmented bar.
private struct GrantGroupChipBar: View {
    let groups: [String]
    @Binding var selection: String
    var onChange: (String) -> Void
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Permission Group")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Brand.muted(colorScheme))

            PortalSegmentedBar(
                items: groups.map { .init(id: $0, title: $0) },
                selection: $selection,
                accent: Brand.action,
                allowsEqualWidth: groups.count <= 4
            )
            .onChange(of: selection) { _, newValue in
                onChange(newValue)
            }
        }
    }
}

private struct GrantSegmentedFilter: View {
    let options: [(String, Int)]
    @Binding var selection: String

    var body: some View {
        PortalSegmentedBar(
            items: options.map { .init(id: $0.0, title: $0.0, count: $0.1) },
            selection: $selection,
            accent: Brand.action,
            allowsEqualWidth: options.count <= 4
        )
    }
}

private struct GrantTabBar: View {
    let tabs: [(String, Int)]
    @Binding var selection: String
    var accentFor: (String) -> Color

    var body: some View {
        PortalSegmentedBar(
            items: tabs.map {
                .init(
                    id: $0.0,
                    title: $0.0,
                    count: $0.1,
                    systemImage: $0.0 == "Live Reports" ? "chart.bar.fill" : "tablecells"
                )
            },
            selection: $selection,
            accent: accentFor(selection),
            allowsEqualWidth: true
        )
    }
}

/// Always a single equal-width row; local state keeps toggles responsive.
private struct PermissionToggleStrip: View {
    let actions: [PortalPageActionRow]
    let onChange: (String, Bool) -> Void
    @Environment(\.colorScheme) private var colorScheme
    @State private var values: [String: Bool] = [:]

    private var signature: String {
        actions.map { "\($0.name):\($0.isGranted ? 1 : 0)" }.joined(separator: "|")
    }

    var body: some View {
        HStack(spacing: 2) {
            ForEach(actions) { action in
                permissionCell(action)
                    .frame(maxWidth: .infinity)
            }
        }
        .onAppear { syncValues() }
        .onChange(of: signature) { _, _ in syncValues() }
    }

    private func syncValues() {
        var next: [String: Bool] = [:]
        for action in actions {
            next[action.name] = action.isGranted
        }
        values = next
    }

    private func permissionCell(_ action: PortalPageActionRow) -> some View {
        VStack(spacing: 2) {
            Text(action.name)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(Brand.text(colorScheme))
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            Toggle("", isOn: Binding(
                get: { values[action.name] ?? action.isGranted },
                set: { next in
                    values[action.name] = next
                    onChange(action.name, next)
                }
            ))
            .labelsHidden()
            .tint(Brand.action)
            .controlSize(.mini)
        }
        .frame(maxWidth: .infinity)
        .contentShape(Rectangle())
    }
}

private struct CountChip: View {
    let text: String
    var accent = false
    @Environment(\.colorScheme) private var colorScheme

    init(_ text: String, accent: Bool = false) {
        self.text = text
        self.accent = accent
    }

    var body: some View {
        Text(text)
            .font(.caption2.weight(.bold))
            .foregroundStyle(accent ? .white : Brand.muted(colorScheme))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule().fill(accent ? Brand.action : Brand.backgroundSubtle(colorScheme))
            )
            .overlay {
                if !accent {
                    Capsule().strokeBorder(Color.primary.opacity(0.06))
                }
            }
    }
}

private enum StatusTone {
    case success, muted
}

private struct GrantStatusPill: View {
    let text: String
    let tone: StatusTone

    var body: some View {
        Text(text)
            .font(.caption2.weight(.bold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .foregroundStyle(tone == .success ? Color(hex: 0x15803D) : Color(hex: 0x64748B))
            .background(
                Capsule().fill(tone == .success ? Color(hex: 0x15803D).opacity(0.12) : Color.primary.opacity(0.06))
            )
    }
}

private extension View {
    func grantSurface(_ scheme: ColorScheme) -> some View {
        glassPanel(scheme, tint: Brand.navy.opacity(scheme == .dark ? 0.16 : 0.05))
    }

    func glassPanel(_ scheme: ColorScheme, tint: Color = Color.primary.opacity(0.03)) -> some View {
        self
            .background {
                RoundedRectangle(cornerRadius: ShellMetrics.cardRadius, style: .continuous)
                    .fill(.clear)
                    .glassEffect(
                        .regular.tint(tint),
                        in: RoundedRectangle(cornerRadius: ShellMetrics.cardRadius, style: .continuous)
                    )
            }
            .overlay {
                RoundedRectangle(cornerRadius: ShellMetrics.cardRadius, style: .continuous)
                    .strokeBorder(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(scheme == .dark ? 0.22 : 0.55),
                                Brand.gold.opacity(scheme == .dark ? 0.18 : 0.12),
                                Color.primary.opacity(scheme == .dark ? 0.08 : 0.05)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            }
    }
}

// MARK: - Models / grouping / decode

private struct ApiKeyRow: Identifiable {
    let id: String
    let name: String
    let keyPrefix: String
    let permissionGroupName: String
    let status: String
    let isActive: Bool
    let expiresAtLabel: String?

    var isEffectivelyActive: Bool {
        guard isActive else { return false }
        return status.isEmpty
            || status == "0"
            || status.caseInsensitiveCompare("Active") == .orderedSame
    }
}

private struct GrantMethodRow: Identifiable {
    let id: String
    let key: String
    let httpMethod: String
    let path: String
    var isGranted: Bool
}

private struct GrantControllerSection: Identifiable {
    let id: String
    let name: String
    var methods: [GrantMethodRow]
}

private struct GrantModuleSection: Identifiable {
    let id: String
    let name: String
    var controllers: [GrantControllerSection]
}

private struct PortalPageActionRow: Identifiable {
    var id: String { name }
    let name: String
    var isGranted: Bool
}

private struct PortalPageGrantRow: Identifiable {
    let id: String
    let key: String
    let title: String
    let module: String
    let tableName: String
    let path: String
    let isQuery: Bool
    var actions: [PortalPageActionRow]
}

private struct PortalPageModuleGroup: Identifiable {
    let id: String
    let name: String
    let items: [PortalPageGrantRow]
}

private struct PortalPageQueryTableGroup: Identifiable {
    let id: String
    let name: String
    let items: [PortalPageGrantRow]
}

private struct PortalPageQueryModuleGroup: Identifiable {
    let id: String
    let name: String
    let tables: [PortalPageQueryTableGroup]
}

private func groupedPages(_ items: [PortalPageGrantRow], matching query: String) -> [PortalPageModuleGroup] {
    let text = query.trimmingCharacters(in: .whitespacesAndNewlines)
    let filtered = items.filter { page in
        guard !text.isEmpty else { return true }
        return page.title.localizedStandardContains(text)
            || page.module.localizedStandardContains(text)
            || page.key.localizedStandardContains(text)
            || page.path.localizedStandardContains(text)
    }
    let order = NSMutableOrderedSet()
    var bucket: [String: [PortalPageGrantRow]] = [:]
    for page in filtered {
        let module = page.module.isEmpty ? "Module" : page.module
        if bucket[module] == nil { order.add(module) }
        bucket[module, default: []].append(page)
    }
    return order.array.compactMap { raw in
        guard let name = raw as? String, let items = bucket[name] else { return nil }
        return PortalPageModuleGroup(id: name, name: name, items: items)
    }
}

private func groupedQueries(_ items: [PortalPageGrantRow], matching query: String) -> [PortalPageQueryModuleGroup] {
    let text = query.trimmingCharacters(in: .whitespacesAndNewlines)
    let filtered = items.filter { page in
        guard !text.isEmpty else { return true }
        return page.title.localizedStandardContains(text)
            || page.module.localizedStandardContains(text)
            || page.tableName.localizedStandardContains(text)
            || page.path.localizedStandardContains(text)
            || page.key.localizedStandardContains(text)
    }
    var modules: [String: [String: [PortalPageGrantRow]]] = [:]
    var moduleOrder: [String] = []
    var tableOrder: [String: [String]] = [:]
    for page in filtered {
        let module = page.module.isEmpty ? "Module" : page.module
        let table = page.tableName.isEmpty ? "Table" : page.tableName
        if modules[module] == nil {
            moduleOrder.append(module)
            modules[module] = [:]
            tableOrder[module] = []
        }
        if modules[module]?[table] == nil {
            tableOrder[module, default: []].append(table)
            modules[module]?[table] = []
        }
        modules[module]?[table, default: []].append(page)
    }
    return moduleOrder.compactMap { module in
        let tables = (tableOrder[module] ?? []).compactMap { table -> PortalPageQueryTableGroup? in
            guard let items = modules[module]?[table] else { return nil }
            return PortalPageQueryTableGroup(id: table, name: table, items: items)
        }
        guard !tables.isEmpty else { return nil }
        return PortalPageQueryModuleGroup(id: module, name: module, tables: tables)
    }
}

private func isStorefrontPublic(_ name: String) -> Bool {
    let value = name.trimmingCharacters(in: .whitespacesAndNewlines)
    return value.caseInsensitiveCompare("Public") == .orderedSame
        || value.caseInsensitiveCompare("Guest") == .orderedSame
        || value.caseInsensitiveCompare("Anonymous") == .orderedSame
}

private func decodePermissionGroups(_ data: Data) throws -> [String] {
    let json = try JSONSerialization.jsonObject(with: data)
    let rows: [[String: Any]]
    if let page = json as? [String: Any], let items = page["items"] as? [[String: Any]] {
        rows = items
    } else if let items = json as? [[String: Any]] {
        rows = items
    } else {
        return []
    }
    return rows.compactMap { row in
        (row["name"] as? String) ?? (row["Name"] as? String)
    }
}

private func decodeApiKeys(_ data: Data) throws -> [ApiKeyRow] {
    let json = try JSONSerialization.jsonObject(with: data)
    let rows: [[String: Any]]
    if let items = json as? [[String: Any]] {
        rows = items
    } else if let page = json as? [String: Any], let items = page["items"] as? [[String: Any]] {
        rows = items
    } else {
        return []
    }

    let display = DateFormatter()
    display.dateStyle = .medium
    display.timeStyle = .short

    return rows.compactMap { row in
        let id = stringValue(row["id"] ?? row["Id"]) ?? UUID().uuidString
        let name = stringValue(row["name"] ?? row["Name"]) ?? "API key"
        let prefix = stringValue(row["keyPrefix"] ?? row["KeyPrefix"]) ?? ""
        let group = stringValue(row["permissionGroupName"] ?? row["PermissionGroupName"]) ?? ""
        let status = stringValue(row["status"] ?? row["Status"]) ?? "Active"
        let active = boolValue(row["isActive"] ?? row["IsActive"]) ?? true
        let expiresRaw = stringValue(row["expiresAt"] ?? row["ExpiresAt"])
        let expiresLabel: String? = {
            guard let expiresRaw, let date = parseDate(expiresRaw) else { return expiresRaw }
            return display.string(from: date)
        }()
        return ApiKeyRow(
            id: id,
            name: name,
            keyPrefix: prefix,
            permissionGroupName: group,
            status: status,
            isActive: active,
            expiresAtLabel: expiresLabel
        )
    }
}

private func decodeApiModulePermissions(_ data: Data) throws -> [GrantModuleSection] {
    guard let root = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { return [] }
    let map = (root["apiModulePermissionList"] as? [String: Any])
        ?? (root["ApiModulePermissionList"] as? [String: Any])
        ?? [:]
    return map.keys.sorted().compactMap { moduleName in
        guard let controllers = map[moduleName] as? [String: Any] else { return nil }
        let controllerSections: [GrantControllerSection] = controllers.keys.sorted().compactMap { controllerName in
            guard let methods = controllers[controllerName] as? [[String: Any]] else { return nil }
            let rows: [GrantMethodRow] = methods.compactMap { method in
                let key = stringValue(method["key"] ?? method["Key"]) ?? ""
                guard !key.isEmpty else { return nil }
                return GrantMethodRow(
                    id: key,
                    key: key,
                    httpMethod: httpMethodName(method["httpMethod"] ?? method["HttpMethod"]),
                    path: stringValue(method["urlPath"] ?? method["UrlPath"] ?? method["path"] ?? method["Path"]) ?? key,
                    isGranted: boolValue(method["value"] ?? method["Value"]) ?? false
                )
            }
            guard !rows.isEmpty else { return nil }
            return GrantControllerSection(id: moduleName + "." + controllerName, name: controllerName, methods: rows)
        }
        guard !controllerSections.isEmpty else { return nil }
        return GrantModuleSection(id: moduleName, name: moduleName, controllers: controllerSections)
    }
}

private func decodePortalPageGrants(_ data: Data) throws -> [PortalPageGrantRow] {
    guard let root = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { return [] }
    let items = (root["portalPageDefinitions"] as? [[String: Any]])
        ?? (root["PortalPageDefinitions"] as? [[String: Any]])
        ?? []
    return items.compactMap { item in
        let key = stringValue(item["portalPagePermissionName"] ?? item["PortalPagePermissionName"]) ?? ""
        guard !key.isEmpty else { return nil }
        let isQuery = boolValue(item["isQuery"] ?? item["IsQuery"]) ?? false
        let model = stringValue(item["modelName"] ?? item["ModelName"]) ?? key
        let queryName = stringValue(item["queryName"] ?? item["QueryName"]) ?? ""
        let tableName = stringValue(item["tableName"] ?? item["TableName"]) ?? ""
        let module = stringValue(item["moduleName"] ?? item["ModuleName"]) ?? ""
        let path = stringValue(item["pagePath"] ?? item["PagePath"]) ?? ""
        let title = isQuery
            ? (queryName.isEmpty ? model : queryName)
            : (tableName.isEmpty ? model : tableName)
        let types = (item["portalPagePermissionTypes"] as? [[String: Any]])
            ?? (item["PortalPagePermissionTypes"] as? [[String: Any]])
            ?? []
        let actions: [PortalPageActionRow] = types.compactMap { type in
            let name = pageActionName(type["portalPagePermissionType"] ?? type["PortalPagePermissionType"])
            guard let name else { return nil }
            return PortalPageActionRow(
                name: name,
                isGranted: boolValue(type["value"] ?? type["Value"]) ?? false
            )
        }
        return PortalPageGrantRow(
            id: key,
            key: key,
            title: title,
            module: module,
            tableName: tableName,
            path: path,
            isQuery: isQuery || path.localizedCaseInsensitiveContains("/Queries/"),
            actions: actions
        )
    }
}

private func pageActionName(_ raw: Any?) -> String? {
    if let text = raw as? String, !text.isEmpty { return text }
    if let number = raw as? NSNumber {
        let names = ["List", "Detail", "Insert", "Update", "Delete"]
        let index = number.intValue
        return names.indices.contains(index) ? names[index] : nil
    }
    return nil
}

private func httpMethodName(_ raw: Any?) -> String {
    if let text = raw as? String, !text.isEmpty {
        let names = ["GET", "POST", "PUT", "DELETE", "PATCH"]
        if let number = Int(text), names.indices.contains(number) { return names[number] }
        return text.uppercased()
    }
    if let number = raw as? NSNumber {
        let names = ["GET", "POST", "PUT", "DELETE", "PATCH"]
        let index = number.intValue
        return names.indices.contains(index) ? names[index] : "GET"
    }
    return "GET"
}

private func httpMethodColor(_ method: String) -> Color {
    switch method.uppercased() {
    case "GET": return Color(hex: 0x15803D)
    case "POST": return Brand.action
    case "PUT": return Color(hex: 0xB45309)
    case "DELETE": return Color(hex: 0xB91C1C)
    case "PATCH": return Color(hex: 0x7C3AED)
    default: return Brand.navy
    }
}

private func stringValue(_ raw: Any?) -> String? {
    if let text = raw as? String { return text }
    if let number = raw as? NSNumber { return number.stringValue }
    if let uuid = raw as? UUID { return uuid.uuidString }
    return nil
}

private func boolValue(_ raw: Any?) -> Bool? {
    if let flag = raw as? Bool { return flag }
    if let number = raw as? NSNumber { return number.boolValue }
    if let text = raw as? String {
        return ["1", "true", "yes"].contains(text.lowercased())
    }
    return nil
}

private func parseDate(_ raw: String) -> Date? {
    let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    let iso = ISO8601DateFormatter()
    iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = iso.date(from: trimmed) { return date }
    iso.formatOptions = [.withInternetDateTime]
    if let date = iso.date(from: trimmed) { return date }
    let fallbacks = [
        "yyyy-MM-dd'T'HH:mm:ss",
        "yyyy-MM-dd'T'HH:mm:ssZ",
        "yyyy-MM-dd HH:mm:ss",
        "yyyy-MM-dd"
    ]
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    for format in fallbacks {
        formatter.dateFormat = format
        if let date = formatter.date(from: trimmed) { return date }
    }
    return nil
}

private func spaced(_ value: String) -> String {
    var result = ""
    for character in value {
        if character.isUppercase, let last = result.last, last.isLetter {
            result.append(" ")
        }
        result.append(character)
    }
    return result
}
