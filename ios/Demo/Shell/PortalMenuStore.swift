import Foundation

@MainActor
@Observable
final class PortalMenuStore {
    var pages: [ShellPage] = [AppShellContent.homePage]
    var loading = false
    var failure: String?

    func load(session: SessionStore) async {
        guard session.token != nil else { return }
        if pages.count > 1 { return }
        if !AppShellContent.loadsRemoteMenus {
            pages = [AppShellContent.homePage] + AppShellContent.menuPages
            loading = false
            failure = nil
            return
        }
        loading = true
        failure = nil
        do {
            let data = try await session.collectionData(module: "identity-module", model: "portal-menus")
            let result = try JSONDecoder().decode(PortalMenuPage.self, from: data)
            pages = [AppShellContent.homePage] + Self.pages(from: result.items ?? [])
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    private static func pages(from rows: [PortalMenuRow]) -> [ShellPage] {
        var built: [ShellPage] = []
        built.append(contentsOf: accessGrantPages(from: rows))
        built.append(contentsOf: auditLogPages(from: rows))
        built.append(contentsOf: moduleListPages(from: rows))
        return built
    }

    /// Web MANAGEMENT → Access Grant Managers.
    private static func accessGrantPages(from rows: [PortalMenuRow]) -> [ShellPage] {
        rows
            .filter { ($0.parentName ?? "").caseInsensitiveCompare("AccessGrantManagers") == .orderedSame }
            .filter { !($0.actionName ?? "").isEmpty }
            .sorted { ($0.orderNo ?? 0) < ($1.orderNo ?? 0) }
            .compactMap { row -> ShellPage? in
                guard let kind = managerKind(for: row) else { return nil }
                let title = managerTitle(for: row, kind: kind)
                return ShellPage(
                    id: row.key ?? "AccessGrantManagers.\(kind.rawValue)",
                    title: title,
                    symbol: managerSymbol(kind),
                    group: "Access Grant Managers",
                    route: .manager(kind),
                    // ApiKeyGrands is a custom portal screen — grants are seeded on IdentityModuleApiKeys.
                    permissionKey: managerPermissionKey(kind)
                )
            }
    }

    /// Web MANAGEMENT → Audit Logs (one entry per module AuditLogs table).
    private static func auditLogPages(from rows: [PortalMenuRow]) -> [ShellPage] {
        rows
            .filter { ($0.name ?? "").caseInsensitiveCompare("AuditLogs") == .orderedSame }
            .filter { ($0.parentName ?? "").hasSuffix("Module") }
            .filter { ($0.actionName ?? "").hasSuffix("/List") }
            .sorted { ($0.parentName ?? "") < ($1.parentName ?? "") }
            .map { row in
                let module = row.parentName ?? "IdentityModule"
                let moduleLabel = groupTitle(module)
                let title = "\(moduleLabel) Audit Logs"
                return ShellPage(
                    id: row.key ?? "\(module).AuditLogs",
                    title: title,
                    symbol: "list.clipboard",
                    group: "Audit Logs",
                    route: .resource(module: module, model: "AuditLogs", title: title),
                    permissionKey: permissionKey(from: row.actionName) ?? "\(module)AuditLogs"
                )
            }
    }

    /// Web MODULES → Tables (exclude AuditLogs — they live under Audit Logs).
    private static func moduleListPages(from rows: [PortalMenuRow]) -> [ShellPage] {
        rows
            .filter { row in
                let parent = row.parentName ?? ""
                let action = row.actionName ?? ""
                let name = row.name ?? ""
                return parent.hasSuffix("Module")
                    && !parent.hasSuffix("Queries")
                    && action.hasSuffix("/List")
                    && name.caseInsensitiveCompare("AuditLogs") != .orderedSame
            }
            .sorted { ($0.orderNo ?? 0) < ($1.orderNo ?? 0) }
            .map { row in
                let module = row.parentName ?? ""
                let model = row.name ?? ""
                let title = spaced(row.text ?? model)
                return ShellPage(
                    id: row.key ?? "\(module).\(model)",
                    title: title,
                    symbol: symbol(for: model),
                    group: groupTitle(module),
                    route: .resource(module: module, model: model, title: title),
                    permissionKey: permissionKey(from: row.actionName) ?? "\(module)\(model)"
                )
            }
    }

    /// `/ProductCatalogModuleProducts/List` → `ProductCatalogModuleProducts`.
    private static func permissionKey(from actionName: String?) -> String? {
        guard let action = actionName?.trimmingCharacters(in: CharacterSet(charactersIn: "/")),
              !action.isEmpty else { return nil }
        return action.split(separator: "/").map(String.init).first
    }

    private static func managerKind(for row: PortalMenuRow) -> PortalManagerKind? {
        let name = (row.name ?? "").lowercased()
        let action = (row.actionName ?? "").lowercased()
        let text = (row.text ?? "").lowercased()
        if name.contains("apikey") || action.contains("apikeygrands") || text.contains("api key") {
            return .apiKeys
        }
        if name.contains("apimethod") || action.contains("apimethodaccessgrants") {
            return .apiMethodGrants
        }
        if name.contains("portalpage") || action.contains("portalpageaccessgrants") {
            return .portalPageGrants
        }
        return nil
    }

    private static func managerTitle(for row: PortalMenuRow, kind: PortalManagerKind) -> String {
        switch kind {
        case .apiKeys:
            return "API Keys"
        case .apiMethodGrants:
            return "API Method Grants"
        case .portalPageGrants:
            return "Portal Page Grants"
        }
    }

    private static func managerSymbol(_ kind: PortalManagerKind) -> String {
        switch kind {
        case .apiKeys: return "key.horizontal"
        case .apiMethodGrants: return "shield.lefthalf.filled"
        case .portalPageGrants: return "doc.badge.gearshape"
        }
    }

    /// Portal Page Grant keys that actually exist in seed data (not custom controller route names).
    private static func managerPermissionKey(_ kind: PortalManagerKind) -> String {
        switch kind {
        case .apiKeys: return "IdentityModuleApiKeys"
        case .apiMethodGrants: return "IdentityModuleApiMethodAccessGrants"
        case .portalPageGrants: return "IdentityModulePortalPageAccessGrants"
        }
    }

    private static func symbol(for model: String) -> String {
        switch model {
        case "Products": "shippingbox"
        case "Brands": "seal"
        case "Categories": "square.grid.2x2"
        case "AuditLogs": "list.clipboard"
        case "PermissionGroups": "person.3"
        case "AspNetUsers", "Users": "person.crop.circle"
        default: "square.stack"
        }
    }

    private static func groupTitle(_ module: String) -> String {
        var name = module
        if name.hasSuffix("Module") { name.removeLast("Module".count) }
        return spaced(name)
    }

    private static func spaced(_ value: String) -> String {
        var result = ""
        for character in value {
            if character.isUppercase, let last = result.last, last.isLetter {
                result.append(" ")
            }
            result.append(character)
        }
        return result
    }
}

struct PortalMenuRow: Decodable {
    let key: String?
    let name: String?
    let text: String?
    let actionName: String?
    let orderNo: Int?
    let parentName: String?
}

struct PortalMenuPage: Decodable {
    let items: [PortalMenuRow]?
    let totalCount: Int?
}
