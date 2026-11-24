import Foundation
import QuickCodeHTTP

@MainActor
@Observable
final class PortalAccess {
    private var grants: Set<String> = []
    /// False until the first successful (or empty-group) load finishes.
    private(set) var isLoaded = false

    func load(session: SessionStore) async {
        let group = session.permissionGroup.trimmingCharacters(in: .whitespacesAndNewlines)
        guard session.token != nil else {
            isLoaded = true
            return
        }
        guard !group.isEmpty else {
            grants = []
            isLoaded = true
            return
        }

        do {
            try await session.ensureValidAccessToken()
        } catch {
            // Keep any previously loaded grants if refresh failed mid-session.
            isLoaded = true
            return
        }

        let root = GatewayServer.url.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let encoded = group.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? group
        guard let url = URL(string: root + "/api/identity-module/portal-page-access-grants/get-portal-page-access-grants/" + encoded) else {
            isLoaded = true
            return
        }

        do {
            let rows = try await fetchGrantRows(url: url, session: session, allowRefresh: true)
            let next = Set(rows.compactMap(Self.grantKey(from:)))
            // Only replace on success — empty wipe was hiding Add/Edit/Delete after a failed load.
            grants = next
            isLoaded = true
        } catch {
            // Preserve prior grants.
            isLoaded = true
        }
    }

    func allows(_ page: String, _ action: String) -> Bool {
        grants.contains(page + action)
    }

    /// Menu visibility: Dashboard always; others require an active List grant.
    func allowsMenu(_ page: ShellPage) -> Bool {
        if page.route == .home { return true }
        guard isLoaded else { return false }
        guard let key = page.permissionKey, !key.isEmpty else { return false }
        if allows(key, "List") { return true }
        // Access Grant Managers: fall back if custom route name differs from seeded page key.
        if case .manager(let kind) = page.route {
            return allows(managerFallbackKey(kind), "List")
        }
        return false
    }

    private func managerFallbackKey(_ kind: PortalManagerKind) -> String {
        switch kind {
        case .apiKeys: return "IdentityModuleApiKeys"
        case .apiMethodGrants: return "IdentityModuleApiMethodAccessGrants"
        case .portalPageGrants: return "IdentityModulePortalPageAccessGrants"
        }
    }

    private func fetchGrantRows(url: URL, session: SessionStore, allowRefresh: Bool) async throws -> [[String: Any]] {
        var request = URLRequest(url: url)
        ClientHeaders.apply(to: &request)
        if let token = session.token, !token.isEmpty {
            request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 401, allowRefresh, session.access == .password {
            try await session.refresh()
            return try await fetchGrantRows(url: url, session: session, allowRefresh: false)
        }
        guard status == 200 else {
            throw APIFailure.from(status: status)
        }
        guard let rows = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            throw APIFailure.from(status: status, detail: "Invalid access grants payload.")
        }
        return rows
    }

    /// Seed keys are `{Module}{Model}{Action}` (e.g. `…ProductVariantAttributesInsert`).
    private static func grantKey(from row: [String: Any]) -> String? {
        let active: Bool = {
            if let flag = row["isActive"] as? Bool { return flag }
            if let number = row["isActive"] as? NSNumber { return number.boolValue }
            return false
        }()
        guard active else { return nil }

        let page = (row["portalPageDefinitionKey"] as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !page.isEmpty else { return nil }

        let action = pageActionName(row["pageAction"])
        if let action, !action.isEmpty, !page.hasSuffix(action) {
            return page + action
        }
        return page
    }

    private static func pageActionName(_ raw: Any?) -> String? {
        if let text = raw as? String {
            return text.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let number = raw as? NSNumber {
            // PageActionType ordinal fallback — uncommon for JSON APIs.
            let names = ["List", "Detail", "Insert", "Update", "Delete"]
            let index = number.intValue
            return names.indices.contains(index) ? names[index] : nil
        }
        return nil
    }
}
