import SwiftUI

/// Portal target content: identity portal-menus + generated/DBML resource pages.
enum AppShellContent {
    static let loadsRemoteMenus = true
    static var menuPages: [ShellPage] { [] }

    static var homePage: ShellPage {
        ShellPage(
            id: "home",
            title: "Dashboard",
            symbol: "rectangle.3.group.fill",
            group: "Overview",
            route: .home
        )
    }

    @ViewBuilder
    static func homeDashboard(pages: [ShellPage], open: @escaping (ShellPage) -> Void) -> some View {
        PortalDashboardView(pages: pages, open: open)
    }

    @ViewBuilder
    static func resourcePage(module: String, model: String, title: String) -> some View {
        // IosMobileGenerator rewrites ResourceListView → portalPage(...) when PortalPageMap exists.
        portalPage(module: module, model: model, title: title)
    }

    @ViewBuilder
    static func managerPage(_ kind: PortalManagerKind) -> some View {
        switch kind {
        case .apiKeys:
            ApiKeysManagerView()
        case .apiMethodGrants:
            ApiMethodGrantsManagerView()
        case .portalPageGrants:
            PortalPageGrantsManagerView()
        }
    }
}
