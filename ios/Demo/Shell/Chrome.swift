import SwiftUI
import UIKit

enum ShellMetrics {
    static let cardRadius: CGFloat = 22
    static let panelRadius: CGFloat = 26
    static let screenPadding: CGFloat = 22
    /// Gap between menu column and the right page panel (HStack spacing).
    static let panelGap: CGFloat = 8
    /// Outer inset around the right page panel (top / bottom). Flat split uses 0.
    static let pageInset: CGFloat = 0
    /// Leading inset inside the page panel — injected as safe-area so large titles + body share it.
    /// Duo zeroes system leading safe-area when the status strip is trailing; keep this generous.
    static let pageContentLeading: CGFloat = 28
    /// Max width for login / splash / auth columns on wide Duo / iPad panes.
    static let authContentMaxWidth: CGFloat = 440
    /// SideMenu column width on wide iPad split layouts.
    static let menuWidthPad: CGFloat = 292
    /// Sidebar width on iPhone Duo open.
    static let menuWidthDuo: CGFloat = 240
    /// Narrower mid-size iPad column.
    static let menuWidthCompactPad: CGFloat = 272
    /// Fallback phone drawer width before the first layout pass.
    static let menuWidthPhone: CGFloat = 300
    /// Content peek to the trailing edge of an open phone drawer (X-style).
    static let menuPhonePeek: CGFloat = 52
    /// Gap between menu and content in split layouts (0 = hairline Divider only).
    // panelGap kept above for compatibility
    /// iPad split needs real width; Duo open uses regular size class with a lower floor.
    static let splitLayoutMinimumWidth: CGFloat = 820
    /// Minimum width for Duo-open tablet chrome (menu + usable content).
    static let duoSplitMinimumWidth: CGFloat = 560
    /// Horizontal inset inside the menu column (logo, search, rows).
    static let menuInset: CGFloat = 8
    /// Row label inset inside the selection pill.
    static let menuRowInset: CGFloat = 6
    /// Vertical padding for menu rows — finger-friendly without looking oversized.
    static let menuRowVertical: CGFloat = 11
    /// Extra leading nudge for the wordmark so it clears the Duo bezel.
    static let menuLogoLeading: CGFloat = 2
    /// Account chip radius on split / wide columns.
    static let screenCornerRadius: CGFloat = 44
    /// Account chip radius inside the phone drawer (44 reads oversized on ~390pt).
    static let menuPhoneChipRadius: CGFloat = 18
    /// Default page size for portal list screens.
    static let listPageSize: Int = 20

    /// Folded Duo / compact iPhone → drawer. Open Duo (`.regular`) / iPad → collapsible sidebar.
    static func usesSplitLayout(width: CGFloat, horizontalSizeClass: UserInterfaceSizeClass?) -> Bool {
        guard horizontalSizeClass == .regular else { return false }
        guard width > 0 else { return false }
        if UIDevice.current.userInterfaceIdiom == .pad {
            return width >= splitLayoutMinimumWidth
        }
        // iPhone Duo inner display reports `.regular`.
        return width >= duoSplitMinimumWidth
    }

    static func menuColumnWidth(viewportWidth: CGFloat, split: Bool) -> CGFloat {
        guard split else {
            // Phone / folded Duo: scale to the viewport so the drawer fills the device.
            guard viewportWidth > 0 else { return menuWidthPhone }
            return max(280, viewportWidth - menuPhonePeek)
        }
        if UIDevice.current.userInterfaceIdiom == .phone {
            return menuWidthDuo
        }
        if viewportWidth < 980 { return menuWidthCompactPad }
        return menuWidthPad
    }
}

private struct ShellTrailingPadKey: EnvironmentKey {
    static let defaultValue: CGFloat = 0
}

private struct ShellLeadingPadKey: EnvironmentKey {
    static let defaultValue: CGFloat = 0
}

extension EnvironmentValues {
    /// Kept for swipe-row clearance; prefer Duo pinned toolbar placements for chrome.
    var shellTrailingPad: CGFloat {
        get { self[ShellTrailingPadKey.self] }
        set { self[ShellTrailingPadKey.self] = newValue }
    }

    var shellLeadingPad: CGFloat {
        get { self[ShellLeadingPadKey.self] }
        set { self[ShellLeadingPadKey.self] = newValue }
    }
}

struct ShellAtmosphere: View {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.horizontalSizeClass) private var size
    var intensity: Double = 1

    var body: some View {
        ZStack {
            Brand.background(colorScheme)

            // Soft luminous wash — liquid-glass era depth without flat slabs.
            LinearGradient(
                colors: [
                    Brand.navy.opacity((colorScheme == .dark ? 0.28 : 0.10) * intensity),
                    Brand.background(colorScheme).opacity(0.0),
                    Brand.action.opacity((colorScheme == .dark ? 0.10 : 0.06) * intensity)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            Circle()
                .fill(Brand.navy.opacity((colorScheme == .dark ? 0.55 : 0.16) * intensity))
                .frame(width: size == .regular ? 480 : 380, height: size == .regular ? 480 : 380)
                .blur(radius: 72)
                .offset(x: size == .regular ? -240 : -160, y: size == .regular ? -260 : -300)

            Circle()
                .fill(Brand.gold.opacity((colorScheme == .dark ? 0.20 : 0.22) * intensity))
                .frame(width: size == .regular ? 360 : 280, height: size == .regular ? 360 : 280)
                .blur(radius: 70)
                .offset(x: size == .regular ? 280 : 170, y: size == .regular ? 140 : 40)

            Circle()
                .fill(Brand.action.opacity((colorScheme == .dark ? 0.22 : 0.10) * intensity))
                .frame(width: 280, height: 280)
                .blur(radius: 62)
                .offset(x: size == .regular ? 60 : -20, y: size == .regular ? 340 : 420)
        }
        .ignoresSafeArea()
    }
}

/// Phone / folded-Duo overlay drawer surface — not a flat slab; quieter than the full shell atmosphere.
struct PhoneMenuBackdrop: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        ZStack {
            Brand.backgroundSubtle(colorScheme)

            LinearGradient(
                colors: [
                    Brand.navy.opacity(colorScheme == .dark ? 0.42 : 0.14),
                    Brand.backgroundSubtle(colorScheme).opacity(0.92),
                    Brand.action.opacity(colorScheme == .dark ? 0.14 : 0.07)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            Circle()
                .fill(Brand.navy.opacity(colorScheme == .dark ? 0.40 : 0.12))
                .frame(width: 260, height: 260)
                .blur(radius: 48)
                .offset(x: -70, y: -140)

            Circle()
                .fill(Brand.gold.opacity(colorScheme == .dark ? 0.12 : 0.14))
                .frame(width: 200, height: 200)
                .blur(radius: 44)
                .offset(x: 110, y: 220)
        }
        .ignoresSafeArea()
    }
}

private struct ShellOwnsAtmosphereKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    /// When true, shell already paints the single full-screen atmosphere — do not nest another (avoids menu/page seam).
    var shellOwnsAtmosphere: Bool {
        get { self[ShellOwnsAtmosphereKey.self] }
        set { self[ShellOwnsAtmosphereKey.self] = newValue }
    }
}

struct ScreenCanvas<Content: View>: View {
    @Environment(\.shellOwnsAtmosphere) private var shellOwnsAtmosphere
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .scrollEdgeEffectStyle(.soft, for: .top)
            .scrollEdgeEffectStyle(.hard, for: .bottom)
            .contentMargins(.bottom, 0, for: .scrollContent)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background {
                if !shellOwnsAtmosphere {
                    ShellAtmosphere(intensity: 1)
                } else {
                    Color.clear
                }
            }
            .background {
                if shellOwnsAtmosphere {
                    ClearNavigationChrome()
                }
            }
            .modifier(PortalTransparentNavigation(enabled: shellOwnsAtmosphere))
    }
}

private struct PortalTransparentNavigation: ViewModifier {
    var enabled: Bool

    @ViewBuilder
    func body(content: Content) -> some View {
        if enabled {
            content
                // Keep toolbar chrome visible so Duo’s shared vertical bar can show
                // symbol items; only clear the page fill under the atmosphere.
                .toolbarBackgroundVisibility(.automatic, for: .navigationBar)
                .containerBackground(.clear, for: .navigation)
        } else {
            content
        }
    }
}


struct WindowSafeArea: UIViewRepresentable {
    var onChange: (UIEdgeInsets) -> Void

    func makeUIView(context: Context) -> Probe {
        let view = Probe()
        view.isUserInteractionEnabled = false
        view.onChange = onChange
        return view
    }

    func updateUIView(_ uiView: Probe, context: Context) {
        uiView.onChange = onChange
        uiView.report()
    }

    final class Probe: UIView {
        var onChange: ((UIEdgeInsets) -> Void)?
        private var last: UIEdgeInsets = .zero

        override func didMoveToWindow() {
            super.didMoveToWindow()
            report()
        }

        override func layoutSubviews() {
            super.layoutSubviews()
            report()
        }

        override func safeAreaInsetsDidChange() {
            super.safeAreaInsetsDidChange()
            report()
        }

        func report() {
            let insets = window?.safeAreaInsets ?? safeAreaInsets
            guard insets.top > 0 || insets.bottom > 0 || insets.left > 0 || insets.right > 0 else { return }
            guard insets != last else { return }
            last = insets
            let callback = onChange
            DispatchQueue.main.async {
                callback?(insets)
            }
        }
    }
}

/// Clears NavigationStack / UIHostingController fills (root + every pushed detail).
struct ClearNavigationChrome: UIViewRepresentable {
    func makeUIView(context: Context) -> Probe {
        let view = Probe()
        view.isUserInteractionEnabled = false
        view.backgroundColor = .clear
        return view
    }

    func updateUIView(_ uiView: Probe, context: Context) {
        uiView.clearChrome()
    }

    final class Probe: UIView {
        override func didMoveToWindow() {
            super.didMoveToWindow()
            clearChrome()
        }

        override func didMoveToSuperview() {
            super.didMoveToSuperview()
            clearChrome()
        }

        override func layoutSubviews() {
            super.layoutSubviews()
            clearChrome()
        }

        func clearChrome() {
            guard window != nil else { return }
            let apply = { [weak self] in
                guard let self else { return }
                Self.clear(from: self)
            }
            if Thread.isMainThread {
                apply()
            } else {
                DispatchQueue.main.async(execute: apply)
            }
        }

        private static func clear(from view: UIView) {
            guard let controller = view.nearestViewController else { return }
            // Only the page canvas — never touch UINavigationBar / bar-item hosts
            // (clearing those made Duo vertical-bar glyphs invisible while taps still worked).
            wipe(controller.view)
            if let nav = controller.navigationController {
                nav.view.backgroundColor = .clear
                nav.view.isOpaque = false
                nav.navigationBar.isTranslucent = true
            }
        }

        private static func wipe(_ view: UIView?) {
            guard let view else { return }
            view.backgroundColor = .clear
            view.isOpaque = false
        }
    }
}

private extension UIView {
    var nearestViewController: UIViewController? {
        var responder: UIResponder? = self
        while let current = responder {
            if let controller = current as? UIViewController { return controller }
            responder = current.next
        }
        return nil
    }
}

/// Page action for the system toolbar (Edit / Delete / Add / …).
/// Must be attached with `.toolbar` on a view *inside* `NavigationStack` —
/// Duo only remaps container-owned bars into the trailing vertical strip.
struct PortalSafeRail {
    struct Action: Identifiable {
        let id: String
        let systemName: String
        var role: ButtonRole? = nil
        var accessibilityLabel: String = ""
        /// When true (e.g. Add), use `topBarPinnedTrailing`.
        var pinned: Bool = false
        let perform: () -> Void

        var isPinnedPrimary: Bool { pinned || systemName == "plus" }
    }
}

/// Menu / settings callbacks for every destination inside the stack.
struct PortalShellActions {
    var openMenu: () -> Void = {}
    var openDashboard: () -> Void = {}
    var openSettings: () -> Void = {}
    var goBack: () -> Void = {}
    var menuOpen = false
    /// Hide Dashboard chrome while already on the home root.
    var showsDashboard = true
    /// Menu-level history has a previous shell page (not an in-page detail).
    var canGoBack = false
    /// Duo trailing status strip is active — shared vertical bar can host toolbar items.
    var prefersVerticalStrip = false
}

private struct PortalShellActionsKey: EnvironmentKey {
    static let defaultValue = PortalShellActions()
}

extension EnvironmentValues {
    var portalShellActions: PortalShellActions {
        get { self[PortalShellActionsKey.self] }
        set { self[PortalShellActionsKey.self] = newValue }
    }
}

/// System toolbar on the current NavigationStack destination (never outside the stack).
struct PortalPageToolbar: ViewModifier {
    var actions: [PortalSafeRail.Action] = []
    var showsShell = true
    /// Pushed detail / sub-page — Back in the shared vertical bar (not the root menu).
    var showsBack = false
    @Environment(\.portalShellActions) private var shell
    @Environment(\.dismiss) private var dismiss

    func body(content: Content) -> some View {
        content
            .toolbar {
                // Duo strip is two parts (Apple: top placements vs bottomBar, with a system spacer):
                // 1) Top under status: Menu + Dashboard
                // 2) Bottom group: Add / Edit / Delete + Settings
                // Important: page actions must share one ToolbarItemGroup — separate
                // bottomBar ToolbarItems were overflowing / dropping while Settings stayed.
                if showsBack {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Back", systemImage: "chevron.backward", action: { dismiss() })
                    }
                } else if shell.canGoBack {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Back", systemImage: "chevron.backward", action: shell.goBack)
                    }
                }

                if showsShell {
                    // Duo vertical strip is trailing-only — `topBarLeading` never appears there.
                    // When the side menu is hidden, show the open control in the strip.
                    if shell.prefersVerticalStrip {
                        if !shell.menuOpen {
                            ToolbarItem(placement: .topBarTrailing) {
                                Button("Open menu", systemImage: "sidebar.left", action: shell.openMenu)
                            }
                        } else {
                            ToolbarItem(placement: .topBarTrailing) {
                                Button("Close menu", systemImage: "sidebar.left", action: shell.openMenu)
                            }
                        }
                    } else {
                        ToolbarItem(placement: .topBarLeading) {
                            Button(
                                shell.menuOpen ? "Close menu" : "Open menu",
                                systemImage: "sidebar.left",
                                action: shell.openMenu
                            )
                        }
                    }
                    if shell.showsDashboard {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button(action: shell.openDashboard) {
                                Label(AppShellContent.homePage.title, systemImage: AppShellContent.homePage.symbol)
                            }
                            .imageScale(.small)
                            .accessibilityLabel(AppShellContent.homePage.title)
                        }
                    }
                }

                if shell.prefersVerticalStrip {
                    // Add is pinned — Apple keeps topBarPinnedTrailing visible under strip pressure.
                    // Edit/Delete/other + Settings share one bottomBar group (overflow was dropping
                    // separate bottomBar items after Menu/Dashboard moved to the top).
                    if let add = duoPinnedAdd {
                        if #available(iOS 27.0, *) {
                            ToolbarItem(placement: .topBarPinnedTrailing) {
                                railButton(add)
                            }
                        } else {
                            ToolbarItem(placement: .bottomBar) {
                                railButton(add)
                            }
                        }
                    }
                    duoBottomGroup
                } else {
                    classicTrailingChrome
                }
            }
            .navigationBarBackButtonHidden(showsBack || shell.canGoBack)
    }

    private var duoPinnedAdd: PortalSafeRail.Action? {
        guard !showsBack else { return nil }
        return actions.first(where: \.isPinnedPrimary)
    }

    private var duoBottomActions: [PortalSafeRail.Action] {
        if showsBack { return actions }
        return actions.filter { !$0.isPinnedPrimary }
    }

    /// Part 2 — bottom of strip: Edit/Delete/filters + Settings (Add is pinned above).
    /// Hide the user/settings control while the side menu is open — account chip is already there.
    @ToolbarContentBuilder
    private var duoBottomGroup: some ToolbarContent {
        if #available(iOS 27.0, *) {
            ToolbarItemGroup(placement: .bottomBar) {
                ForEach(duoBottomActions) { action in
                    railButton(action)
                }
                if showsShell, !shell.menuOpen {
                    Button("Settings", systemImage: "person.crop.circle.fill", action: shell.openSettings)
                }
            }
            .visibilityPriority(.high)
        } else {
            ToolbarItemGroup(placement: .bottomBar) {
                ForEach(duoBottomActions) { action in
                    railButton(action)
                }
                if showsShell, !shell.menuOpen {
                    Button("Settings", systemImage: "person.crop.circle.fill", action: shell.openSettings)
                }
            }
        }
    }

    /// Classic iPhone / iPad — top trailing chrome (no vertical strip).
    @ToolbarContentBuilder
    private var classicTrailingChrome: some ToolbarContent {
        if showsShell, !shell.menuOpen {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: shell.openSettings) {
                    UserAvatar(size: 28)
                }
                .accessibilityLabel("Settings")
            }
        }

        ForEach(classicSecondaryActions) { action in
            if #available(iOS 27.0, *) {
                ToolbarItem(placement: .topBarTrailing) {
                    railButton(action)
                }
                .visibilityPriority(.high)
            } else {
                ToolbarItem(placement: .topBarTrailing) {
                    railButton(action)
                }
            }
        }

        if let primary = classicPrimaryAction {
            if #available(iOS 27.0, *) {
                ToolbarItem(placement: .topBarPinnedTrailing) {
                    railButton(primary)
                }
            } else {
                ToolbarItem(placement: .topBarTrailing) {
                    railButton(primary)
                }
            }
        }
    }

    private var classicPrimaryAction: PortalSafeRail.Action? {
        guard !showsBack else { return nil }
        return actions.first(where: \.isPinnedPrimary)
    }

    private var classicSecondaryActions: [PortalSafeRail.Action] {
        if showsBack { return actions }
        return actions.filter { !$0.isPinnedPrimary }
    }

    private func railButton(_ action: PortalSafeRail.Action) -> some View {
        let title = action.accessibilityLabel.isEmpty ? action.systemName : action.accessibilityLabel
        // Must stay symbol+title Button — Apple excludes custom views from the vertical bar.
        return Button(title, systemImage: action.systemName, role: action.role, action: action.perform)
    }
}

extension View {
    /// Menu + avatar on the current stack destination.
    func portalShellChrome() -> some View {
        modifier(PortalPageToolbar(actions: [], showsShell: true, showsBack: false))
    }

    /// Root list chrome: menu + avatar + page actions (Add in the Duo vertical strip when Insert is allowed).
    func portalSafeRail(_ actions: [PortalSafeRail.Action]) -> some View {
        modifier(PortalPageToolbar(actions: actions, showsShell: true, showsBack: false))
    }

    /// Pushed detail / sub-page: Back + Edit/Delete in the shared vertical bar.
    func portalSafeRail(_ actions: [PortalSafeRail.Action], showsBack: Bool) -> some View {
        modifier(PortalPageToolbar(actions: actions, showsShell: true, showsBack: showsBack))
    }

    /// Bottom sheets must open at `.large` — bare `[.medium, .large]` starts at medium (~half).
    func portalSheetPresentation(
        _ detent: Binding<PresentationDetent>,
        detents: Set<PresentationDetent> = [.large, .medium]
    ) -> some View {
        self
            .presentationDetents(detents, selection: detent)
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(28)
            .presentationContentInteraction(.scrolls)
    }
}


struct GlassPanel<Content: View>: View {
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .padding(ShellMetrics.screenPadding)
            .glassEffect(.regular, in: RoundedRectangle(cornerRadius: ShellMetrics.panelRadius, style: .continuous))
    }
}
