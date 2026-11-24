import SwiftUI

/// Demo / product app: Customer site screens from analysis (project-context modules[].screens).
enum AppShellContent {
    static let loadsRemoteMenus = false

    static var homePage: ShellPage {
        ShellPage(
            id: "home",
            title: "Home",
            symbol: "rectangle.3.group.fill",
            group: "Overview",
            route: .home
        )
    }

    static var menuPages: [ShellPage] {
        [
            ShellPage(
                id: "ProductCatalogModule.Products",
                title: "Products",
                symbol: "shippingbox",
                group: "Browse",
                route: .resource(module: "ProductCatalogModule", model: "Products", title: "Products")
            ),
            ShellPage(
                id: "ProductCatalogModule.Brands",
                title: "Brands",
                symbol: "seal",
                group: "Browse",
                route: .resource(module: "ProductCatalogModule", model: "Brands", title: "Brands")
            ),
            ShellPage(
                id: "ProductCatalogModule.Categories",
                title: "Categories",
                symbol: "square.grid.2x2",
                group: "Browse",
                route: .resource(module: "ProductCatalogModule", model: "Categories", title: "Categories")
            ),
            ShellPage(
                id: "OrderManagementModule.MyOrders",
                title: "My orders",
                symbol: "list.bullet.rectangle",
                group: "Browse",
                route: .resource(module: "OrderManagementModule", model: "Orders", title: "My orders")
            ),
            ShellPage(
                id: "OrderManagementModule.AllOrders",
                title: "All orders",
                symbol: "list.bullet.rectangle.fill",
                group: "Browse",
                route: .resource(module: "OrderManagementModule", model: "Orders", title: "All orders")
            ),
            ShellPage(
                id: "OrderManagementModule.Checkout",
                title: "Checkout",
                symbol: "cart",
                group: "Browse",
                route: .resource(module: "OrderManagementModule", model: "ShippingMethods", title: "Checkout")
            )
        ]
    }

    @ViewBuilder
    static func homeDashboard(pages: [ShellPage], open: @escaping (ShellPage) -> Void) -> some View {
        ProductHomeView(pages: pages, open: open)
    }

    @ViewBuilder
    static func resourcePage(module: String, model: String, title: String) -> some View {
        switch (module, model, title) {
        case ("OrderManagementModule", "Orders", "My orders"):
            MyOrdersListView()
        case ("OrderManagementModule", "Orders", "All orders"):
            AllOrdersListView()
        default:
            portalPage(module: module, model: model, title: title)
        }
    }

    /// Access Grant Managers are Portal-only; product target keeps the ShellRoute exhaustive.
    @ViewBuilder
    static func managerPage(_ kind: PortalManagerKind) -> some View {
        ContentUnavailableView(
            "Portal only",
            systemImage: "lock.shield",
            description: Text("Access Grant Managers are available in the Portal app.")
        )
        .navigationTitle(kind.rawValue)
        .portalShellChrome()
    }
}

/// End-user home — no admin metrics, no module filter.
struct ProductHomeView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.colorScheme) private var colorScheme
    let pages: [ShellPage]
    let open: (ShellPage) -> Void

    private var destinations: [ShellPage] {
        pages.filter { $0.route != .home }
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let hello = hour < 12 ? "Good morning" : (hour < 18 ? "Good afternoon" : "Good evening")
        let name = session.name.trimmingCharacters(in: .whitespacesAndNewlines)
        return name.isEmpty ? hello : "\(hello), \(name)"
    }

    var body: some View {
        ScreenCanvas {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(greeting)
                            .font(.title2.weight(.semibold))
                            .foregroundStyle(Brand.text(colorScheme))
                        Text("Browse catalog items and open the screens you need.")
                            .font(.subheadline)
                            .foregroundStyle(Brand.muted(colorScheme))
                    }

                    if destinations.isEmpty {
                        Text("No screens are available yet.")
                            .font(.subheadline)
                            .foregroundStyle(Brand.muted(colorScheme))
                            .padding(.vertical, 24)
                    } else {
                        VStack(spacing: 10) {
                            ForEach(destinations) { page in
                                Button {
                                    open(page)
                                } label: {
                                    HStack(spacing: 14) {
                                        Image(systemName: page.symbol)
                                            .font(.title3.weight(.semibold))
                                            .foregroundStyle(Brand.action)
                                            .frame(width: 36, height: 36)
                                            .background(Brand.action.opacity(colorScheme == .dark ? 0.22 : 0.12), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(page.title)
                                                .font(.body.weight(.semibold))
                                                .foregroundStyle(Brand.text(colorScheme))
                                            Text(page.group)
                                                .font(.caption)
                                                .foregroundStyle(Brand.muted(colorScheme))
                                        }
                                        Spacer(minLength: 0)
                                        Image(systemName: "chevron.right")
                                            .font(.footnote.weight(.semibold))
                                            .foregroundStyle(Brand.muted(colorScheme))
                                    }
                                    .padding(14)
                                    .background(Color.primary.opacity(colorScheme == .dark ? 0.08 : 0.04), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .topLeading)
                .padding(.vertical, ShellMetrics.screenPadding)
                .padding(.horizontal, ShellMetrics.screenPadding)
            }
            .contentMargins(.horizontal, 0, for: .scrollContent)
            .contentMargins(.top, 0, for: .scrollContent)
            .contentMargins(.bottom, 0, for: .scrollContent)
            .ignoresSafeArea(.container, edges: .bottom)
        }
        .navigationTitle(AppShellContent.homePage.title)
        .navigationBarTitleDisplayMode(.large)
        .portalShellChrome()
    }
}
