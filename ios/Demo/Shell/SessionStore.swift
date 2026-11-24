import Foundation
import IdentityClient
import QuickCodeHTTP

enum SessionAccess {
    case password
    case apiKey
}

@MainActor
@Observable
final class SessionStore {
    let access: SessionAccess
    var token: String?
    var permissionGroup = ""
    var name = ""
    var email = ""
    /// Buyer scope for Customer site screens (e.g. My orders → GET_BY_CUSTOMER_ID).
    var customerId: Int32 = 481

    private var refreshToken: String?
    private var expiresAt: Date = .distantPast
    private var refreshTask: Task<Void, Error>?
    private let authorizer = SessionAuthorizer()
    /// Short-lived Public JWT for storefront; exchanged after password login.
    private var anonymousToken: String?
    private var anonymousExpiresAt: Date = .distantPast

    let identity: IdentityClient.Client
    let securedIdentity: IdentityClient.Client

    init(access: SessionAccess = .password) {
        self.access = access
        let bearer = BearerMiddleware(authorizer: authorizer)
        identity = IdentityClient.makeClient()
        securedIdentity = IdentityClient.makeClient(middlewares: [bearer])
        authorizer.session = self
    }

    /// Storefront (non-Portal) may browse with a Public JWT before sign-in.
    private var usesStorefrontAnonymous: Bool {
        ClientHeaders.app != "portal"
    }

    private var hasSignedInUser: Bool {
        guard let token, !token.isEmpty else { return false }
        if Self.tokenUse(in: token) == "anonymous" { return false }
        let group = permissionGroup.isEmpty ? Self.permissionGroup(in: token) : permissionGroup
        return group.caseInsensitiveCompare("Public") != .orderedSame
    }

    /// Anonymous Public JWT (storefront Guest) — no password change / sign-out.
    var isGuest: Bool {
        access == .password && !hasSignedInUser
    }

    var initials: String {
        let parts = name.split(separator: " ").prefix(2)
        let letters = parts.compactMap { $0.first }
        if letters.isEmpty { return "Q" }
        return String(letters).uppercased()
    }

    func restore() async {
        if access == .apiKey {
            guard let key = KeychainStore.get("apiKey"), !key.isEmpty else { return }
            token = key
            name = KeychainStore.get("name") ?? "API key"
            if let stored = KeychainStore.get("customerId"), let value = Int32(stored) {
                customerId = value
            }
            return
        }
        if let storedAnon = KeychainStore.get("anonymousToken"), !storedAnon.isEmpty {
            anonymousToken = storedAnon
            anonymousExpiresAt = Date(timeIntervalSince1970: Double(KeychainStore.get("anonymousExpiresAt") ?? "") ?? 0)
        }
        guard let access = KeychainStore.get("accessToken"),
              let storedRefresh = KeychainStore.get("refreshToken")
        else {
            if usesStorefrontAnonymous {
                _ = try? await ensureAnonymous()
            }
            return
        }
        email = KeychainStore.get("email") ?? ""
        name = KeychainStore.get("name") ?? displayName(from: email)
        refreshToken = storedRefresh
        expiresAt = Date(timeIntervalSince1970: Double(KeychainStore.get("expiresAt") ?? "") ?? 0)
        if expiresAt.timeIntervalSinceNow > 30 {
            token = access
            permissionGroup = Self.permissionGroup(in: access)
        } else {
            do {
                try await self.refresh()
            } catch {
                clear()
                if usesStorefrontAnonymous {
                    _ = try? await ensureAnonymous()
                }
                return
            }
        }
        await loadProfile()
    }

    /// Mint / reuse anonymous Public JWT. Portal apps keep it only for post-login exchange.
    @discardableResult
    func ensureAnonymous() async throws -> String {
        guard access == .password else {
            throw GatewayError(message: "Anonymous sessions require password access mode.", status: 400)
        }
        if hasSignedInUser, let token {
            return token
        }
        if let anonymousToken, anonymousExpiresAt.timeIntervalSinceNow > 30 {
            if usesStorefrontAnonymous, !hasSignedInUser {
                self.token = anonymousToken
                permissionGroup = "Public"
                if name.isEmpty { name = "Guest" }
            }
            return anonymousToken
        }

        let root = GatewayServer.url.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let url = URL(string: root + "/api/auth/anonymous") else {
            throw GatewayError(message: "Anonymous auth is not available.", status: 404)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = Data("{}".utf8)
        ClientHeaders.apply(to: &request)

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            throw APIFailure.from(status: status, detail: String(data: data, encoding: .utf8))
        }
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let accessToken = (json["accessToken"] as? String) ?? (json["AccessToken"] as? String),
              !accessToken.isEmpty
        else {
            throw GatewayError(message: "Anonymous token response was invalid.", status: 502)
        }
        let expiresIn = (json["expiresIn"] as? Int)
            ?? (json["ExpiresIn"] as? Int)
            ?? 900
        anonymousToken = accessToken
        anonymousExpiresAt = Date().addingTimeInterval(TimeInterval(expiresIn))
        KeychainStore.set(accessToken, account: "anonymousToken")
        KeychainStore.set(String(anonymousExpiresAt.timeIntervalSince1970), account: "anonymousExpiresAt")
        if usesStorefrontAnonymous, !hasSignedInUser {
            token = accessToken
            permissionGroup = "Public"
            expiresAt = anonymousExpiresAt
            if name.isEmpty { name = "Guest" }
        }
        return accessToken
    }

    /// After password login: swap anon JWT → user JWT with guest_client_id, then merge guest cart.
    private func exchangeAnonymousIfNeeded() async {
        let subject = anonymousToken
            ?? (Self.tokenUse(in: token) == "anonymous" ? token : nil)
        guard let subject, !subject.isEmpty, hasSignedInUser else { return }

        let root = GatewayServer.url.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let url = URL(string: root + "/api/auth/exchange") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["subjectToken": subject])
        applyAuth(to: &request)

        if let (data, response) = try? await URLSession.shared.data(for: request),
           let http = response as? HTTPURLResponse,
           (200..<300).contains(http.statusCode),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let accessToken = (json["accessToken"] as? String) ?? (json["AccessToken"] as? String),
           !accessToken.isEmpty
        {
            let expiresIn = (json["expiresIn"] as? Int) ?? (json["ExpiresIn"] as? Int) ?? 3600
            token = accessToken
            expiresAt = Date().addingTimeInterval(TimeInterval(expiresIn))
            KeychainStore.set(accessToken, account: "accessToken")
            KeychainStore.set(String(expiresAt.timeIntervalSince1970), account: "expiresAt")
            permissionGroup = Self.permissionGroup(in: accessToken)
        }

        clearAnonymous()
        await mergeGuestCart()
    }

    private func mergeGuestCart() async {
        let root = GatewayServer.url.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let url = URL(string: root + "/api/gateway/guest-cart/merge") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = Data("{}".utf8)
        applyAuth(to: &request)
        _ = try? await URLSession.shared.data(for: request)
    }

    private func clearAnonymous() {
        anonymousToken = nil
        anonymousExpiresAt = .distantPast
        KeychainStore.remove("anonymousToken")
        KeychainStore.remove("anonymousExpiresAt")
    }

    func connect(apiKey: String) async throws {
        let trimmed = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        let output = try await identity.api_hyphen_auth_hyphen_validate_hyphen_api_hyphen_key_hyphen_post(
            .init(body: .json(.init(value1: .init(
                apiKey: trimmed,
                httpMethod: "GET",
                urlPath: "/api/product-catalog-module/products"
            ))))
        )
        switch output {
        case .ok(let ok):
            let result = try ok.body.json
            guard result.isValid == true else {
                throw GatewayError(message: result.failureReason ?? "The API key was rejected.", status: 401)
            }
            let label = result.name?.trimmingCharacters(in: .whitespacesAndNewlines)
            token = trimmed
            name = (label?.isEmpty == false ? label : nil) ?? "API key"
            email = ""
            KeychainStore.set(trimmed, account: "apiKey")
            KeychainStore.set(name, account: "name")
        case .undocumented(let code, let payload):
            throw await gatewayError(status: code, payload: payload, login: false)
        }
    }

    func signIn(email: String, password: String) async throws {
        if anonymousToken == nil, usesStorefrontAnonymous {
            _ = try? await ensureAnonymous()
        }
        let output = try await identity.api_hyphen_auth_hyphen_login_hyphen_post(
            .init(body: .json(.init(value1: .init(email: email, password: password))))
        )
        switch output {
        case .ok(let ok):
            let tokens = try ok.body.json
            store(tokens, email: email, name: displayName(from: email))
            await exchangeAnonymousIfNeeded()
            await loadProfile()
        case .undocumented(let code, let payload):
            throw await gatewayError(status: code, payload: payload, login: true)
        }
    }

    func register(email: String, password: String, firstName: String, lastName: String) async throws {
        let output = try await identity.api_hyphen_auth_hyphen_register_hyphen_post(
            .init(body: .json(.init(value1: .init(email: email, password: password, firstName: firstName, lastName: lastName))))
        )
        switch output {
        case .ok:
            return
        case .badRequest(let bad):
            throw GatewayError(message: problemText(try bad.body.application_problem_plus_json), status: 400)
        case .undocumented(let code, let payload):
            throw await gatewayError(status: code, payload: payload, login: false)
        }
    }

    func requestReset(email: String) async throws {
        let output = try await identity.api_hyphen_auth_hyphen_forgotPassword_hyphen_post(
            .init(body: .json(.init(value1: .init(email: email))))
        )
        switch output {
        case .ok:
            return
        case .badRequest(let bad):
            throw GatewayError(message: problemText(try bad.body.application_problem_plus_json), status: 400)
        case .undocumented(let code, let payload):
            throw await gatewayError(status: code, payload: payload, login: false)
        }
    }

    func refresh() async throws {
        if let refreshTask {
            try await refreshTask.value
            return
        }
        let task = Task { @MainActor in
            try await self.performRefresh()
        }
        refreshTask = task
        defer { refreshTask = nil }
        try await task.value
    }

    /// Refresh when the access token is missing expiry headroom (password sessions only).
    func ensureValidAccessToken(leeway: TimeInterval = 60) async throws {
        guard access == .password else { return }
        guard token != nil else {
            throw GatewayError(message: "Your session ended. Sign in again.", status: 401)
        }
        if expiresAt.timeIntervalSinceNow > leeway { return }
        try await refresh()
    }

    func signOut() {
        clear()
        if usesStorefrontAnonymous {
            Task { _ = try? await ensureAnonymous() }
        }
    }

    /// Leave Guest browsing and show the password login screen.
    func promptSignIn() {
        clear()
    }

    func collectionData(module: String, model: String) async throws -> Data {
        try await gatewayData(module: module, model: model, id: nil, page: nil, size: nil)
    }

    func collectionData(module: String, model: String, page: Int, size: Int) async throws -> Data {
        try await gatewayData(module: module, model: model, id: nil, page: page, size: size)
    }

    /// Authenticated GET for an absolute gateway path (e.g. `/api/.../stats-hourly-...`).
    func pathData(_ path: String) async throws -> Data {
        let root = GatewayServer.url.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let normalized = path.hasPrefix("/") ? path : "/" + path
        guard let url = URL(string: root + normalized) else {
            throw GatewayError(message: "This page is not available.", status: 404)
        }
        return try await authorizedData(URLRequest(url: url))
    }

    /// Authenticated JSON request for an absolute gateway path (POST/PUT/PATCH/DELETE).
    func pathJSON(_ path: String, method: String, body: [String: Any]? = nil) async throws -> Data {
        let root = GatewayServer.url.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let normalized = path.hasPrefix("/") ? path : "/" + path
        guard let url = URL(string: root + normalized) else {
            throw GatewayError(message: "This page is not available.", status: 404)
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        return try await authorizedData(request)
    }

    static func kebabModule(_ value: String) -> String {
        kebab(value)
    }

    func recordData(module: String, model: String, id: Int) async throws -> Data {
        try await recordData(module: module, model: model, id: String(id))
    }

    func recordData(module: String, model: String, id: String) async throws -> Data {
        try await gatewayData(module: module, model: model, id: id, page: nil, size: nil)
    }

    private func gatewayData(module: String, model: String, id: String?, page: Int?, size: Int?) async throws -> Data {
        let encodedId = id.flatMap { $0.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) }
        let path = "/api/" + Self.kebab(module) + "/" + Self.kebab(model) + (encodedId.map { "/" + $0 } ?? "")
        let root = GatewayServer.url.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let query: String
        // Module OpenAPI uses page/size/includeCount (not pageNumber/pageSize).
        if id == nil, let page, let size {
            query = "?page=" + String(page) + "&size=" + String(size) + "&includeCount=true"
        } else {
            query = ""
        }
        guard let url = URL(string: root + path + query) else {
            throw GatewayError(message: "This page is not available.", status: 404)
        }
        return try await authorizedData(URLRequest(url: url))
    }

    func saveData(module: String, model: String, fields: [String: String]) async throws {
        let path = "/api/" + Self.kebab(module) + "/" + Self.kebab(model)
        let root = GatewayServer.url.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let url = URL(string: root + path) else {
            throw GatewayError(message: "This page is not available.", status: 404)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: fields)
        _ = try await authorizedData(request)
    }

    /// Password sessions: refresh before expiry; on 401 refresh once and retry.
    private func authorizedData(_ request: URLRequest, allowRefresh: Bool = true) async throws -> Data {
        try await ensureValidAccessToken()
        var outbound = request
        applyAuth(to: &outbound)
        let (data, response) = try await URLSession.shared.data(for: outbound)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 401, allowRefresh, access == .password {
            try await refresh()
            return try await authorizedData(request, allowRefresh: false)
        }
        guard (200..<300).contains(status) else {
            throw APIFailure.from(status: status, detail: String(data: data, encoding: .utf8))
        }
        return data
    }

    private func applyAuth(to request: inout URLRequest) {
        ClientHeaders.apply(to: &request)
        guard let token, !token.isEmpty else { return }
        if access == .apiKey {
            request.setValue(token, forHTTPHeaderField: "X-Api-Key")
        } else {
            request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        }
    }

    private static func kebab(_ value: String) -> String {
        var result = ""
        for character in value {
            if character.isUppercase, let last = result.last, last.isLetter {
                result.append("-")
            }
            result.append(character.lowercased())
        }
        return result.replacingOccurrences(of: " ", with: "-")
    }

    private func performRefresh() async throws {
        guard let refreshToken, !refreshToken.isEmpty else {
            throw GatewayError(message: "Your session ended. Sign in again.", status: 401)
        }
        let output = try await identity.api_hyphen_auth_hyphen_refresh_hyphen_post(
            .init(body: .json(.init(value1: .init(refreshToken: refreshToken))))
        )
        switch output {
        case .ok(let ok):
            store(try ok.body.json, email: email, name: name)
        case .unauthorized:
            throw GatewayError(message: "Your session ended. Sign in again.", status: 401)
        case .undocumented(let code, let payload):
            throw await gatewayError(status: code, payload: payload, login: false)
        }
    }

    private func loadProfile() async {
        guard !email.isEmpty else { return }
        guard let output = try? await securedIdentity.AspNetUsersGetUser(.init(path: .init(aspNetUserEmail: email))),
              case .ok(let ok) = output,
              let user = try? ok.body.json
        else { return }
        let joined = [user.firstName, user.lastName]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        if !joined.isEmpty { name = joined }
        if let address = user.email, !address.isEmpty { email = address }
        KeychainStore.set(name, account: "name")
        KeychainStore.set(email, account: "email")
    }

    private func store(_ tokens: IdentityClient.Components.Schemas.Microsoft_period_AspNetCore_period_Authentication_period_BearerToken_period_AccessTokenResponse, email: String, name: String) {
        token = tokens.accessToken
        refreshToken = tokens.refreshToken
        expiresAt = Date().addingTimeInterval(TimeInterval(tokens.expiresIn))
        self.email = email
        if self.name.isEmpty { self.name = name }
        KeychainStore.set(tokens.accessToken, account: "accessToken")
        KeychainStore.set(tokens.refreshToken, account: "refreshToken")
        KeychainStore.set(String(expiresAt.timeIntervalSince1970), account: "expiresAt")
        KeychainStore.set(email, account: "email")
        KeychainStore.set(self.name, account: "name")
        permissionGroup = Self.permissionGroup(in: tokens.accessToken)
    }

    private static func permissionGroup(in token: String?) -> String {
        guard let token else { return "" }
        let json = jwtPayload(token) ?? [:]
        let value = (json["PermissionGroupName"] as? String) ?? (json["permissionGroupName"] as? String) ?? ""
        return value.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func tokenUse(in token: String?) -> String {
        guard let token, let json = jwtPayload(token) else { return "" }
        let value = (json["token_use"] as? String) ?? (json["tokenUse"] as? String) ?? ""
        return value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    private static func jwtPayload(_ token: String) -> [String: Any]? {
        let parts = token.split(separator: ".")
        guard parts.count > 1 else { return nil }
        var text = parts[1]
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let remainder = text.count % 4
        if remainder > 0 { text += String(repeating: "=", count: 4 - remainder) }
        guard let data = Data(base64Encoded: text),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return json
    }

    /// Wipe auth keychain when Debug gateway endpoint changes.
    static func clearPersistedAuth() {
        for account in [
            "accessToken", "refreshToken", "expiresAt", "email", "name", "apiKey",
            "anonymousToken", "anonymousExpiresAt"
        ] {
            KeychainStore.remove(account)
        }
    }

    private func clear() {
        token = nil
        permissionGroup = ""
        refreshToken = nil
        expiresAt = .distantPast
        name = ""
        email = ""
        permissionGroup = ""
        clearAnonymous()
        Self.clearPersistedAuth()
    }

    private func displayName(from email: String) -> String {
        let local = email.split(separator: "@").first.map(String.init) ?? "Member"
        return local.prefix(1).uppercased() + local.dropFirst()
    }

    private func gatewayError(status: Int, payload: GatewayPayload, login: Bool) async -> GatewayError {
        let failure = await APIFailure.reading(status: status, payload: payload, login: login)
        return GatewayError(message: failure.message, status: failure.status)
    }

    private func problemText(_ problem: IdentityClient.Components.Schemas.Microsoft_period_AspNetCore_period_Http_period_HttpValidationProblemDetails) -> String {
        let lines = problem.errors?.additionalProperties.values.flatMap { $0 } ?? []
        if let first = lines.first(where: { !$0.isEmpty }) { return first }
        if let detail = problem.detail, !detail.isEmpty, detail != "Failed" { return detail }
        if let title = problem.title, !title.isEmpty, title != "Failed" { return title }
        return "The request failed (400)."
    }
}

final class SessionAuthorizer: AccessAuthorizing, @unchecked Sendable {
    weak var session: SessionStore?

    init() {}

    init(session: SessionStore) {
        self.session = session
    }

    func accessToken() async -> String? {
        guard let session else { return nil }
        try? await session.ensureValidAccessToken()
        return await MainActor.run { session.token }
    }

    func usesApiKey() async -> Bool {
        await MainActor.run { session?.access == .apiKey }
    }

    func refreshAccessToken() async throws {
        guard let session else { throw APIFailure.from(status: 401) }
        try await session.refresh()
    }

    func endSession() async {
        await MainActor.run { session?.signOut() }
    }
}
