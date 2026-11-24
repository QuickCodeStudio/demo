import SwiftUI
import UIKit

@MainActor
@Observable
final class PortalRouter {
    /// In-page detail pushes (row → detail). Cleared when the shell page changes.
    var path = NavigationPath()
    /// Menu-level history: Home → Products → Categories, etc.
    var shellStack: [ShellPage] = [AppShellContent.homePage]
    var menuSelection = AppShellContent.homePage.id

    var current: ShellPage { shellStack.last ?? AppShellContent.homePage }
    var root: ShellRoute { current.route }
    var canGoBack: Bool { shellStack.count > 1 }

    func open(page: ShellPage) {
        path = NavigationPath()
        if let index = shellStack.firstIndex(where: { $0.id == page.id }) {
            shellStack = Array(shellStack.prefix(through: index))
        } else {
            shellStack.append(page)
        }
        menuSelection = page.id
    }

    func back() {
        guard canGoBack else { return }
        path = NavigationPath()
        shellStack.removeLast()
        menuSelection = current.id
    }

    func goHome(_ home: ShellPage = AppShellContent.homePage) {
        path = NavigationPath()
        shellStack = [home]
        menuSelection = home.id
    }
}

private struct ViewportMetrics: Equatable {
    var width: CGFloat
    var top: CGFloat
    var bottom: CGFloat
    var trailing: CGFloat
    var leading: CGFloat
}

struct PortalMenuView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.horizontalSizeClass) private var size
    @State private var router = PortalRouter()
    @State private var menus = PortalMenuStore()
    @State private var access = PortalAccess()
    @State private var toast = PortalToast()
    @State private var menuOpen = false
    @State private var dragOffset: CGFloat = 0
    @State private var settingsOpen = false
    @State private var settingsDetent: PresentationDetent = .large
    @State private var logoPlay = 0
    @State private var pageToken = 0
    @State private var sized = false
    @State private var wasSplit = false
    @State private var safeTop: CGFloat = 0
    @State private var safeBottom: CGFloat = 0
    @State private var safeTrailing: CGFloat = 0
    @State private var safeLeading: CGFloat = 0
    @State private var viewportWidth: CGFloat = 0

    /// Persistent sidebar only when there is enough width (not every `.regular` — iPhone Duo open portrait is regular but narrow).
    private var usesSplitLayout: Bool {
        ShellMetrics.usesSplitLayout(width: viewportWidth, horizontalSizeClass: size)
    }

    private var menuWidth: CGFloat {
        ShellMetrics.menuColumnWidth(viewportWidth: viewportWidth, split: usesSplitLayout)
    }

    /// X-style drawer: menu slides over content. 0 = fully closed (off-screen), 1 = fully open.
    private var drawerProgress: CGFloat {
        guard !usesSplitLayout, menuWidth > 0 else { return menuOpen ? 1 : 0 }
        let base: CGFloat = menuOpen ? 0 : -menuWidth
        let offset = min(0, max(-menuWidth, base + dragOffset))
        return (menuWidth + offset) / menuWidth
    }

    private var drawerOffset: CGFloat {
        guard !usesSplitLayout else { return 0 }
        let base: CGFloat = menuOpen ? 0 : -menuWidth
        return min(0, max(-menuWidth, base + dragOffset))
    }

    private var drawerVisible: Bool { !usesSplitLayout && drawerProgress > 0.02 }

    private var pageKey: String {
        "\(router.current.id)-\(router.shellStack.count)-\(pageToken)"
    }

    var body: some View {
        @Bindable var router = router
        Group {
            if usesSplitLayout {
                padLayout
            } else {
                phoneLayout
            }
        }
        // Prefer onGeometryChange over a root GeometryReader — the latter expands under Duo's
        // trailing status edge and flattens safe-area padding.
        .onGeometryChange(for: ViewportMetrics.self) { proxy in
            ViewportMetrics(
                width: proxy.size.width,
                top: proxy.safeAreaInsets.top,
                bottom: proxy.safeAreaInsets.bottom,
                trailing: proxy.safeAreaInsets.trailing,
                leading: proxy.safeAreaInsets.leading
            )
        } action: { _, metrics in
            updateViewportWidth(metrics.width)
            if metrics.top > 0 { safeTop = metrics.top }
            if metrics.bottom > 0 { safeBottom = metrics.bottom }
            // Never shrink — SwiftUI geometry often reports 0 once the view is already inset,
            // while Duo's window still has a large lateral status inset the nav bar ignores.
            if metrics.trailing > 0 {
                safeTrailing = max(safeTrailing, metrics.trailing)
            }
            if metrics.leading > 0 {
                safeLeading = max(safeLeading, metrics.leading)
            }
        }
        .environment(router)
        .environment(access)
        .environment(toast)
        .environment(\.portalShellActions, PortalShellActions(
            openMenu: toggleMenu,
            openDashboard: openDashboard,
            openSettings: { settingsOpen = true },
            goBack: { backPage() },
            menuOpen: menuOpen,
            showsDashboard: router.root != .home || !router.path.isEmpty,
            canGoBack: router.canGoBack && router.path.isEmpty,
            // Lateral status inset ⇒ system shared vertical bar can host toolbar items.
            prefersVerticalStrip: UIDevice.current.userInterfaceIdiom == .phone && safeTrailing >= 24
        ))
        // Swipe actions: only pad when the window reports a real lateral status inset.
        .environment(\.shellTrailingPad, safeTrailing >= 20 ? min(safeTrailing, 56) : 0)
        .background {
            WindowSafeArea { insets in
                if insets.top > 0 { safeTop = insets.top }
                if insets.bottom > 0 { safeBottom = insets.bottom }
                if insets.right > 0 { safeTrailing = max(safeTrailing, insets.right) }
                if insets.left > 0 { safeLeading = max(safeLeading, insets.left) }
            }
        }
        .overlay(alignment: .top) {
            PortalToastBanner()
                .environment(toast)
                .padding(.top, max(safeTop, 12) + 4)
                .padding(.trailing, max(safeTrailing, 8))
        }
        .task {
            await menus.load(session: session)
            await access.load(session: session)
        }
        .onAppear {
            if !sized {
                menuOpen = usesSplitLayout
                wasSplit = usesSplitLayout
                sized = true
            }
        }
        .onChange(of: size) { _, _ in
            reconcileMenuForViewport()
        }
        .sheet(isPresented: $settingsOpen) {
            SettingsSheet()
                .portalSheetPresentation($settingsDetent)
                .onAppear { settingsDetent = .large }
        }
    }

    private func updateViewportWidth(_ width: CGFloat) {
        guard width > 0 else { return }
        let previous = viewportWidth
        viewportWidth = width
        if abs(previous - width) > 0.5 {
            reconcileMenuForViewport()
        }
    }

    private func reconcileMenuForViewport() {
        let split = usesSplitLayout
        if split, !wasSplit {
            // Entering tablet / Duo-open: open sidebar once (user can collapse after).
            menuOpen = true
            dragOffset = 0
        } else if !split, wasSplit {
            // Leaving a split layout (fold / resize): close the drawer so content isn't offset.
            menuOpen = false
            dragOffset = 0
        }
        wasSplit = split
    }

    /// Tablet / Duo-open: one continuous atmosphere behind menu + page (no opaque split chrome).
    private var padLayout: some View {
        HStack(spacing: 0) {
            menuPanel(column: true)
                .frame(width: menuWidth)
                .frame(maxHeight: .infinity, alignment: .top)
                .frame(width: menuOpen ? menuWidth : 0, alignment: .leading)
                .clipped()
                .opacity(menuOpen ? 1 : 0)
                .accessibilityHidden(!menuOpen)

            pageStack
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background {
            ShellAtmosphere(intensity: 1)
        }
        .ignoresSafeArea(.container, edges: .bottom)
        .animation(.smooth(duration: 0.30), value: menuOpen)
        .environment(\.shellOwnsAtmosphere, true)
    }

    /// Folded Duo / phone: X-style drawer — menu slides OVER content; scrim dims the page.
    /// Content stays put (no offset). Menu is the top layer; shadow casts onto content only.
    private var phoneLayout: some View {
        ZStack(alignment: .leading) {
            ShellAtmosphere(intensity: 1)

            pageStack
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .overlay {
                    if drawerVisible {
                        Color.black.opacity(0.45 * Double(drawerProgress))
                            .ignoresSafeArea()
                            .onTapGesture { closeMenu() }
                            .gesture(closeDrag)
                    }
                }
                .overlay(alignment: .leading) {
                    if !menuOpen {
                        Color.clear
                            .frame(width: 24)
                            .contentShape(Rectangle())
                            .highPriorityGesture(openDrag)
                    }
                }
                .zIndex(1)

            menuPanel(column: false)
                .frame(width: menuWidth)
                .frame(maxHeight: .infinity, alignment: .top)
                // Phone drawer: tonal backdrop (not a flat slab). Split uses shared atmosphere.
                .background {
                    PhoneMenuBackdrop()
                }
                .shadow(color: .black.opacity(0.35 * Double(drawerProgress)), radius: 24, x: 10, y: 0)
                .compositingGroup()
                .offset(x: drawerOffset)
                .gesture(closeDrag)
                .accessibilityHidden(!drawerVisible)
                .zIndex(20)
        }
        .ignoresSafeArea(.container, edges: .bottom)
        .environment(\.shellOwnsAtmosphere, true)
    }

    /// Portal: hide pages without List grant (Dashboard always kept).
    /// Demo/product: curated `menuPages` have no portal grant keys — show them as-is.
    private var menuPages: [ShellPage] {
        if AppShellContent.loadsRemoteMenus {
            return menus.pages.filter(access.allowsMenu)
        }
        return menus.pages
    }

    private func menuPanel(column: Bool) -> some View {
        SideMenu(
            topInset: safeTop,
            bottomInset: safeBottom,
            pages: menuPages,
            loading: menus.loading || !access.isLoaded,
            failure: menus.failure,
            selectedPageId: router.menuSelection,
            logoPlay: logoPlay,
            column: column,
            width: menuWidth,
            onAccount: {
                if !usesSplitLayout { closeMenu() }
                settingsOpen = true
            }
        ) { page in
            openPage(page)
        }
    }

    private var pageStack: some View {
        @Bindable var router = router
        return NavigationStack(path: $router.path) {
            pageRoot
                // Toolbar on destinations via portalSafeRail / portalShellChrome (inside stack).
                // Keep navigation chrome automatic so Duo can host symbol toolbar items
                // in the shared vertical bar (hidden chrome left an empty frosted strip).
                .toolbarBackgroundVisibility(.automatic, for: .navigationBar)
        }
        .id(pageKey)
        // Duo zeroes the leading safe area when the status bar is trailing — keep titles/content off the hard edge.
        .safeAreaInset(edge: .leading, spacing: 0) {
            Color.clear
                .frame(width: ShellMetrics.pageContentLeading)
                .accessibilityHidden(true)
        }
        // Must stay clear: a second ShellAtmosphere here would seam against the full-screen shell layer.
        .containerBackground(.clear, for: .navigation)
        // Do NOT use backgroundExtensionEffect here — on Duo it paints a frosted
        // “reflection” into the trailing status strip without hosting toolbar items.
        .scrollEdgeEffectStyle(.soft, for: .top)
        .scrollEdgeEffectStyle(.hard, for: .bottom)
    }

    @ViewBuilder
    private var pageRoot: some View {
        switch router.root {
        case .home:
            AppShellContent.homeDashboard(pages: menuPages, open: openPage)
        case .resource(let module, let model, let title):
            AppShellContent.resourcePage(module: module, model: model, title: title)
        case .manager(let kind):
            AppShellContent.managerPage(kind)
        }
    }

    private func openPage(_ page: ShellPage) {
        router.open(page: page)
        pageToken += 1
        if !usesSplitLayout {
            closeMenu()
        }
    }

    private func backPage() {
        router.back()
        pageToken += 1
    }

    private func openDashboard() {
        let home = menus.pages.first { $0.route == .home } ?? AppShellContent.homePage
        router.goHome(home)
        pageToken += 1
        if !usesSplitLayout {
            closeMenu()
        }
    }

    private func toggleMenu() {
        if menuOpen {
            closeMenu()
        } else {
            openMenu()
        }
    }

    private func openMenu() {
        logoPlay += 1
        withAnimation(.smooth(duration: 0.28)) {
            menuOpen = true
            dragOffset = 0
        }
    }

    private func closeMenu() {
        withAnimation(.smooth(duration: 0.28)) {
            menuOpen = false
            dragOffset = 0
        }
    }

    private var openDrag: some Gesture {
        DragGesture(minimumDistance: 12)
            .onChanged { value in
                // Closed base is -menuWidth; positive dragOffset pulls the drawer on-screen.
                dragOffset = min(menuWidth, max(0, value.translation.width))
            }
            .onEnded { value in
                let shouldOpen = value.translation.width > 72 || value.predictedEndTranslation.width > 120
                if shouldOpen { logoPlay += 1 }
                withAnimation(.smooth(duration: 0.28)) {
                    menuOpen = shouldOpen
                    dragOffset = 0
                }
            }
    }

    private var closeDrag: some Gesture {
        DragGesture(minimumDistance: 12)
            .onChanged { value in
                guard menuOpen || drawerVisible else { return }
                guard abs(value.translation.width) > abs(value.translation.height) else { return }
                dragOffset = max(-menuWidth, min(0, value.translation.width))
            }
            .onEnded { value in
                guard menuOpen || drawerVisible else { return }
                guard abs(value.translation.width) > abs(value.translation.height) else {
                    withAnimation(.smooth(duration: 0.28)) { dragOffset = 0 }
                    return
                }
                let shouldStayOpen = value.translation.width > -72 && value.predictedEndTranslation.width > -120
                withAnimation(.smooth(duration: 0.28)) {
                    menuOpen = shouldStayOpen
                    dragOffset = 0
                }
            }
    }
}
