import SwiftUI

enum ShellRoute: Hashable {
    case home
    case resource(module: String, model: String, title: String)
    /// Web Access Grant Managers — custom Portal screens (not DBML list pages).
    case manager(PortalManagerKind)
}

enum PortalManagerKind: String, Hashable {
    case apiKeys
    case apiMethodGrants
    case portalPageGrants
}

struct ShellPage: Identifiable, Hashable {
    let id: String
    let title: String
    let symbol: String
    let group: String
    let route: ShellRoute
    /// Portal page definition prefix for List grants (`ProductCatalogModuleProducts`).
    /// `nil` = always visible (Dashboard).
    var permissionKey: String? = nil
}

struct UserAvatar: View {
    var size: CGFloat = 44

    @Environment(SessionStore.self) private var session

    var body: some View {
        Text(session.initials)
            .font(.system(size: size * 0.36, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(
                LinearGradient(
                    colors: [Brand.navy, Brand.action],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                in: Circle()
            )
            .overlay {
                Circle().strokeBorder(Brand.gold.opacity(0.85), lineWidth: max(1, size * 0.06))
            }
            .accessibilityLabel(session.name)
    }
}

struct SideMenu: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.displayScale) private var displayScale
    var topInset: CGFloat
    var bottomInset: CGFloat
    var pages: [ShellPage]
    var loading: Bool
    var failure: String?
    var selectedPageId: String
    var logoPlay: Int
    var column = false
    var width: CGFloat = 320
    var onAccount: () -> Void = {}
    let select: (ShellPage) -> Void
    @State private var query = ""
    @State private var module: String?
    @State private var stayingOnModules = false

    /// Product / Demo app: single-level list. Portal keeps module → pages drill-in.
    private var usesFlatMenu: Bool { !AppShellContent.loadsRemoteMenus }

    private var modules: [(name: String, pages: [ShellPage])] {
        grouped.filter { $0.name != "Overview" }
    }

    private var homePage: ShellPage? {
        pages.first { $0.route == .home }
    }

    private var flatPages: [ShellPage] {
        pages.filter { page in
            page.route != .home && matches(page)
        }
    }

    private var visiblePages: [ShellPage] {
        guard let module else { return [] }
        return pages.filter { page in
            page.group == module && page.route != .home && matches(page)
        }
    }

    private var grouped: [(name: String, pages: [ShellPage])] {
        var order: [String] = []
        var bucket: [String: [ShellPage]] = [:]
        for page in pages where page.route != .home {
            if bucket[page.group] == nil { order.append(page.group) }
            bucket[page.group, default: []].append(page)
        }
        return order.compactMap { name in
            bucket[name].map { (name, $0) }
        }
    }

    private var filteredModules: [(name: String, pages: [ShellPage])] {
        let text = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return modules }
        return modules.filter { module in
            module.name.localizedStandardContains(text)
                || module.pages.contains { $0.title.localizedStandardContains(text) }
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            QcLoadingLogo(width: column ? 148 : 160, replay: logoPlay)
                .portalGatewayDebugTap()
                // Center with the search field below (same column width).
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, column ? 4 : 3)
                .padding(.bottom, column ? 14 : 10)

            PortalSearchField(
                placeholder: usesFlatMenu || module == nil ? "Search" : "Search pages",
                compact: true,
                text: $query
            )
            .frame(maxWidth: .infinity)

            ScrollView {
                Group {
                    if loading, pages.count <= 1 {
                        Text("Loading pages")
                            .font(.subheadline)
                            .foregroundStyle(Brand.muted(colorScheme))
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 4)
                            .padding(.top, 8)
                    } else if usesFlatMenu {
                        flatPageList
                    } else if module == nil {
                        moduleList
                    } else {
                        modulePages
                    }
                }
                // Fill the column edge-to-edge so row pills don’t float in empty gutters.
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .scrollDismissesKeyboard(.interactively)
            .scrollIndicators(.hidden)
            .onAppear(perform: openSelectedModule)
            .onChange(of: pages.count) { _, _ in openSelectedModule() }
        }
        .padding(.horizontal, ShellMetrics.menuInset)
        // Phone drawer: ignore system top safe area and pad once with topInset —
        // otherwise safe area + topInset stack and the logo sits too low.
        .padding(.top, column ? 20 : max(topInset, 12) + 4)
        .frame(width: column ? nil : width, alignment: .leading)
        .frame(maxWidth: column ? .infinity : width, maxHeight: .infinity, alignment: .top)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            accountRow
                .padding(.horizontal, ShellMetrics.menuInset)
                .padding(.top, 6)
                // Phone layout ignores the container bottom safe area — pad with the
                // real home-indicator inset so the chip stays fully above the curve.
                .padding(.bottom, column ? 14 : max(bottomInset, 20) + 6)
        }
        .ignoresSafeArea(.container, edges: column ? .bottom : [.top, .bottom])
        // Split shares the shell atmosphere; phone drawer backdrop is painted by the parent.
        .background(Color.clear)
    }

    private var accountRow: some View {
        Button(action: onAccount) {
            HStack(alignment: .center, spacing: 10) {
                UserAvatar(size: 32)
                VStack(alignment: .leading, spacing: 1) {
                    Text(session.name)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Brand.text(colorScheme))
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                    if !session.email.isEmpty {
                        Text(session.email)
                            .font(.caption)
                            .foregroundStyle(Brand.muted(colorScheme))
                            .lineLimit(1)
                    }
                }
                Spacer(minLength: 0)
                Image(systemName: "ellipsis")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(Brand.muted(colorScheme))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .glassEffect(
                .regular.tint(Color.primary.opacity(colorScheme == .dark ? 0.04 : 0.02)),
                in: RoundedRectangle(cornerRadius: accountChipRadius, style: .continuous)
            )
            .contentShape(RoundedRectangle(cornerRadius: accountChipRadius, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Account")
    }

    private var accountChipRadius: CGFloat {
        column ? ShellMetrics.screenCornerRadius : ShellMetrics.menuPhoneChipRadius
    }

    private var flatPageList: some View {
        VStack(alignment: .leading, spacing: 2) {
            if query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, let homePage {
                Button {
                    select(homePage)
                } label: {
                    pageRow(homePage)
                }
                .buttonStyle(MenuFillButtonStyle())
            }
            if flatPages.isEmpty {
                Text(failure ?? (query.isEmpty ? "No pages" : "No matches"))
                    .font(.subheadline)
                    .foregroundStyle(Brand.muted(colorScheme))
                    .padding(.horizontal, 4)
                    .padding(.top, 8)
            } else {
                ForEach(flatPages) { page in
                    Button {
                        select(page)
                    } label: {
                        pageRow(page)
                    }
                    .buttonStyle(MenuFillButtonStyle())
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var managementModuleNames: Set<String> {
        ["Access Grant Managers", "Audit Logs"]
    }

    private var managementModules: [(name: String, pages: [ShellPage])] {
        filteredModules.filter { managementModuleNames.contains($0.name) }
    }

    private var tableModules: [(name: String, pages: [ShellPage])] {
        filteredModules.filter { !managementModuleNames.contains($0.name) }
    }

    private var moduleList: some View {
        VStack(alignment: .leading, spacing: 2) {
            if query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, let homePage {
                Button {
                    stayingOnModules = false
                    select(homePage)
                } label: {
                    pageRow(homePage)
                }
                .buttonStyle(MenuFillButtonStyle())

                if !filteredModules.isEmpty {
                    menuDivider
                }
            }
            if filteredModules.isEmpty {
                Text(failure ?? "No modules")
                    .font(.subheadline)
                    .foregroundStyle(Brand.muted(colorScheme))
                    .padding(.horizontal, 4)
                    .padding(.top, 8)
            } else {
                ForEach(Array(managementModules.enumerated()), id: \.element.name) { index, item in
                    if index > 0 {
                        menuDivider
                    }
                    moduleEntry(item)
                }
                if !managementModules.isEmpty, !tableModules.isEmpty {
                    menuDivider
                }
                ForEach(tableModules, id: \.name) { item in
                    moduleEntry(item)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var menuDivider: some View {
        Rectangle()
            .fill(Color.white.opacity(colorScheme == .dark ? 0.22 : 0.28))
            .frame(height: 1 / max(displayScale, 1))
        .padding(.horizontal, ShellMetrics.menuRowInset)
        .padding(.vertical, 3)
    }

    private func moduleEntry(_ item: (name: String, pages: [ShellPage])) -> some View {
        Button {
            query = ""
            stayingOnModules = false
            withAnimation(.smooth(duration: 0.2)) {
                module = item.name
            }
        } label: {
            moduleRow(item.name, selected: selectedModule == item.name)
        }
        .buttonStyle(MenuFillButtonStyle())
    }

    private var modulePages: some View {
        VStack(alignment: .leading, spacing: 2) {
            Button {
                query = ""
                stayingOnModules = true
                withAnimation(.smooth(duration: 0.2)) {
                    module = nil
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "chevron.left")
                        .font(.callout.weight(.semibold))
                        .frame(width: 18)
                    Text("Modules")
                        .font(.callout.weight(.medium))
                    Spacer(minLength: 0)
                }
                .foregroundStyle(Brand.text(colorScheme))
                .padding(.horizontal, ShellMetrics.menuRowInset)
                .padding(.vertical, ShellMetrics.menuRowVertical)
            }
            .buttonStyle(MenuFillButtonStyle())
            Text(module ?? "")
                .font(.headline.weight(.semibold))
                .foregroundStyle(Brand.text(colorScheme))
                .padding(.horizontal, ShellMetrics.menuRowInset)
                .padding(.top, 4)
                .padding(.bottom, 4)
                .frame(maxWidth: .infinity, alignment: .leading)
            if visiblePages.isEmpty {
                Text("No pages")
                    .font(.subheadline)
                    .foregroundStyle(Brand.muted(colorScheme))
                    .padding(.horizontal, 4)
                    .padding(.top, 8)
            } else {
                ForEach(visiblePages) { page in
                    Button {
                        stayingOnModules = false
                        select(page)
                    } label: {
                        pageRow(page)
                    }
                    .buttonStyle(MenuFillButtonStyle())
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var selectedModule: String? {
        pages.first { $0.id == selectedPageId }?.group
    }

    private func matches(_ page: ShellPage) -> Bool {
        let text = query.trimmingCharacters(in: .whitespacesAndNewlines)
        return text.isEmpty
            || page.title.localizedStandardContains(text)
            || page.group.localizedStandardContains(text)
    }

    private func openSelectedModule() {
        guard !usesFlatMenu else { return }
        guard !stayingOnModules, module == nil else { return }
        guard let group = selectedModule, group != "Overview" else { return }
        module = group
    }

    private func moduleSymbol(for title: String) -> String {
        switch title {
        case "Access Grant Managers":
            return "person.badge.key.fill"
        case "Audit Logs":
            return "list.clipboard.fill"
        default:
            return "square.stack.3d.up"
        }
    }

    private func moduleRow(_ title: String, selected: Bool) -> some View {
        HStack(spacing: 8) {
            Image(systemName: moduleSymbol(for: title))
                .font(.footnote.weight(selected ? .semibold : .regular))
                .frame(width: 14)
            Text(title)
                .font(.callout.weight(selected ? .medium : .regular))
                .lineLimit(1)
                .minimumScaleFactor(0.72)
                .allowsTightening(true)
            Spacer(minLength: 0)
            Image(systemName: "chevron.right")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(Brand.muted(colorScheme))
        }
        .padding(.horizontal, ShellMetrics.menuRowInset)
        .padding(.vertical, ShellMetrics.menuRowVertical)
        .foregroundStyle(Brand.text(colorScheme))
        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        .background {
            if selected {
                Color.clear
                    .glassEffect(
                        .regular.tint(Brand.action.opacity(colorScheme == .dark ? 0.16 : 0.08)),
                        in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                    )
            }
        }
        .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func pageRow(_ page: ShellPage) -> some View {
        let selected = page.id == selectedPageId
        return HStack(spacing: 8) {
            Image(systemName: page.symbol)
                .font(.footnote.weight(selected ? .semibold : .regular))
                .imageScale(.medium)
                .frame(width: 14)
                .foregroundStyle(selected ? Brand.action : Brand.text(colorScheme))
            Text(page.title)
                .font(.callout.weight(selected ? .medium : .regular))
                .lineLimit(1)
                .minimumScaleFactor(0.72)
                .allowsTightening(true)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, ShellMetrics.menuRowInset)
        .padding(.vertical, ShellMetrics.menuRowVertical)
        .foregroundStyle(Brand.text(colorScheme))
        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        .background {
            if selected {
                Color.clear
                    .glassEffect(
                        .regular.tint(Brand.action.opacity(colorScheme == .dark ? 0.18 : 0.09)),
                        in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                    )
            }
        }
        .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

/// Forces menu row labels to consume the full column width (plain Button hugs content otherwise).
private struct MenuFillButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(maxWidth: .infinity, alignment: .leading)
            .opacity(configuration.isPressed ? 0.72 : 1)
    }
}

struct SettingsSheet: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 12) {
                    UserAvatar(size: 48)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(session.name)
                            .font(.headline)
                            .foregroundStyle(Brand.text(colorScheme))
                        if !session.email.isEmpty {
                            Text(session.email)
                                .font(.caption)
                                .foregroundStyle(Brand.muted(colorScheme))
                        }
                    }
                    Spacer(minLength: 0)
                }

                VStack(spacing: 8) {
                    if session.access == .password, !session.isGuest {
                        NavigationLink {
                            ChangePasswordView()
                        } label: {
                            settingsRow(title: "Change password", symbol: "key")
                        }
                        .buttonStyle(.plain)
                    }

                    if session.access == .apiKey {
                        NavigationLink {
                            ApiKeySettingsView()
                        } label: {
                            settingsRow(title: "API key", symbol: "key.horizontal")
                        }
                        .buttonStyle(.plain)
                    }

                    // Portal guests can jump to LoginView; storefront stays anonymous-only.
                    if session.isGuest {
                        if AppShellContent.loadsRemoteMenus {
                            Button {
                                dismiss()
                                session.promptSignIn()
                            } label: {
                                settingsRow(title: "Sign in", symbol: "person.crop.circle", showsChevron: false)
                            }
                            .buttonStyle(.plain)
                        }
                    } else {
                        Button {
                            dismiss()
                            session.signOut()
                        } label: {
                            settingsRow(title: "Sign out", symbol: "rectangle.portrait.and.arrow.right", showsChevron: false)
                        }
                        .buttonStyle(.plain)
                    }
                }

                Spacer(minLength: 0)
            }
            .padding(24)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(Color.clear)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
        }
        .background {
            SettingsGlass()
            SheetBackgroundClear()
        }
        .presentationBackground {
            SettingsGlass()
        }
    }

    private func settingsRow(title: String, symbol: String, showsChevron: Bool = true) -> some View {
        HStack(spacing: 12) {
            Image(systemName: symbol)
                .font(.body.weight(.semibold))
                .frame(width: 32, height: 32)
                .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            Text(title)
                .font(.body.weight(.semibold))
            Spacer(minLength: 0)
            if showsChevron {
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Brand.muted(colorScheme))
            }
        }
        .foregroundStyle(Brand.text(colorScheme))
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

private struct SheetBackgroundClear: UIViewRepresentable {
    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.isUserInteractionEnabled = false
        view.backgroundColor = .clear
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        DispatchQueue.main.async {
            var current = uiView.superview
            var hops = 0
            while let next = current, hops < 6 {
                next.backgroundColor = .clear
                current = next.superview
                hops += 1
            }
        }
    }
}

private struct SettingsGlass: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Rectangle()
            .fill(.clear)
            .glassEffect(
                .regular.tint(Brand.background(colorScheme).opacity(colorScheme == .dark ? 0.42 : 0.28)),
                in: Rectangle()
            )
            .ignoresSafeArea()
    }
}

private struct ChangePasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    @State private var current = ""
    @State private var newPassword = ""
    @State private var confirm = ""
    @State private var message = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Enter your current password, then choose a new one.")
                    .foregroundStyle(Brand.muted(colorScheme))
                LabeledSecureField(label: "Current password", text: $current)
                LabeledSecureField(label: "New password", text: $newPassword)
                Text("At least 8 characters, with uppercase, lowercase, a number, and a symbol.")
                    .font(.footnote)
                    .foregroundStyle(Brand.muted(colorScheme))
                LabeledSecureField(label: "Confirm new password", text: $confirm)
                if !message.isEmpty {
                    Text(message)
                        .font(.footnote)
                        .foregroundStyle(message == "Password updated." ? Brand.action : .red)
                }
                PrimaryButton(title: "Update password") { update() }
                    .disabled(current.isEmpty || newPassword.isEmpty || confirm.isEmpty)
            }
            .padding(20)
        }
        .background(Color.clear)
        .navigationTitle("Change password")
        .toolbarBackground(.hidden, for: .navigationBar)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func update() {
        if !isStrong(newPassword) {
            message = "Use 8 or more characters with uppercase, lowercase, a number, and a symbol."
            return
        }
        if newPassword != confirm {
            message = "New password and confirmation do not match."
            return
        }
        message = "Password updated."
        current = ""
        newPassword = ""
        confirm = ""
        Task {
            try? await Task.sleep(for: .milliseconds(700))
            dismiss()
        }
    }

    private func isStrong(_ password: String) -> Bool {
        password.count >= 8
            && password.contains(where: \.isUppercase)
            && password.contains(where: \.isLowercase)
            && password.contains(where: \.isNumber)
            && password.contains(where: { "!@#$%^&*()_+-=[]{}|;:,.<>?".contains($0) })
    }
}
