import Foundation
import HTTPTypes
import OpenAPIRuntime

public enum GatewayServer {
    private static let overrideDefaultsKey = "qc.gateway.overrideURL"

    /// Info.plist `GatewayURL` (Debug → local, Release → cloud).
    public static var bundleURL: URL {
        url(fromInfoKey: "GatewayURL", required: true)!
    }

    /// Simulator / local Docker gateway (falls back to Info.plist GatewayURL, not a hard-coded port).
    public static var localPresetURL: URL {
        url(fromInfoKey: "LocalGatewayURL", required: false)
            ?? bundleURL
    }

    /// Hosted demo / project gateway.
    public static var cloudPresetURL: URL {
        url(fromInfoKey: "CloudGatewayURL", required: false)
            ?? bundleURL
    }

    /// Active gateway. Debug may override via picker; Release always uses `bundleURL`.
    public static var url: URL {
        #if DEBUG
        if let override = savedOverride { return override }
        #endif
        return bundleURL
    }

    public static var allowsEndpointPicker: Bool {
        #if DEBUG
        true
        #else
        false
        #endif
    }

    /// True when the user has already confirmed a Debug gateway (persisted across launches).
    public static var hasSavedOverride: Bool {
        #if DEBUG
        savedOverride != nil
        #else
        false
        #endif
    }

    /// Last picker choice, or a sensible Debug default (local on simulator, cloud on device).
    public static var preferredPickerURL: URL {
        #if DEBUG
        if let override = savedOverride { return override }
        #if targetEnvironment(simulator)
        return localPresetURL
        #else
        return cloudPresetURL
        #endif
        #else
        return bundleURL
        #endif
    }

    public static func setOverride(_ url: URL?) {
        #if DEBUG
        if let url {
            UserDefaults.standard.set(url.absoluteString, forKey: overrideDefaultsKey)
            UserDefaults.standard.synchronize()
        } else {
            UserDefaults.standard.removeObject(forKey: overrideDefaultsKey)
            UserDefaults.standard.synchronize()
        }
        #endif
    }

    private static var savedOverride: URL? {
        guard let saved = UserDefaults.standard.string(forKey: overrideDefaultsKey),
              let url = URL(string: saved),
              !saved.isEmpty
        else { return nil }
        return url
    }

    private static func url(fromInfoKey key: String, required: Bool) -> URL? {
        let value = Bundle.main.object(forInfoDictionaryKey: key) as? String
        if let value, let url = URL(string: value), !value.isEmpty {
            return url
        }
        if required {
            preconditionFailure("\(key) is missing from Info.plist.")
        }
        return nil
    }
}

public typealias GatewayPayload = UndocumentedPayload

public struct APIFailure: Error, LocalizedError, Sendable {
    public let status: Int
    public let message: String

    public init(status: Int, message: String) {
        self.status = status
        self.message = message
    }

    public var errorDescription: String? { message }

    public static func from(status: Int, detail: String? = nil) -> APIFailure {
        if status == 401 { return APIFailure(status: status, message: "Your session ended. Sign in again.") }
        if status == 403 { return APIFailure(status: status, message: "You don't have access to this page.") }
        if status == 404 { return APIFailure(status: status, message: "The record was not found.") }
        if status == 502 || status == 503 || status == 504 {
            return APIFailure(status: status, message: "Something went wrong. Please try again.")
        }
        if let detail, !detail.isEmpty, detail != "Failed", !isTechnicalDetail(detail) {
            return APIFailure(status: status, message: detail)
        }
        if status == 0 {
            return APIFailure(status: 400, message: "Couldn't load this page. Check your connection and try again.")
        }
        return APIFailure(status: status, message: "Something went wrong. Please try again.")
    }

    private static func isTechnicalDetail(_ text: String) -> Bool {
        let markers = [
            "NSURLErrorDomain", "Client error", "Transport threw", "operationID",
            "LocalUploadTask", "OpenAPIRuntime", "http://localhost", "0x", "nw_connection"
        ]
        return text.count > 160 || markers.contains { text.localizedCaseInsensitiveContains($0) }
    }

    public static func reading(status: Int, payload: UndocumentedPayload, login: Bool = false) async -> APIFailure {
        if login, status == 401 { return APIFailure(status: 401, message: "Email or password is incorrect.") }
        if login, status == 403 { return APIFailure(status: 403, message: "Confirm your email before signing in.") }
        let data: Data?
        if let body = payload.body {
            data = try? await Data(collecting: body, upTo: 65_536)
        } else {
            data = nil
        }
        return from(status: status, detail: problemText(data))
    }

    private static func problemText(_ data: Data?) -> String? {
        guard let data, !data.isEmpty else { return nil }
        struct Problem: Decodable {
            let title: String?
            let detail: String?
            let message: String?
        }
        guard let problem = try? JSONDecoder().decode(Problem.self, from: data) else {
            return String(data: data, encoding: .utf8)
        }
        return problem.detail ?? problem.message ?? problem.title
    }
}

public protocol AccessAuthorizing: Sendable {
    func accessToken() async -> String?
    func usesApiKey() async -> Bool
    func refreshAccessToken() async throws
    func endSession() async
}

public final class BearerMiddleware: ClientMiddleware, @unchecked Sendable {
    private let authorizer: any AccessAuthorizing

    public init(authorizer: any AccessAuthorizing) {
        self.authorizer = authorizer
    }

    public func intercept(
        _ request: HTTPRequest,
        body: HTTPBody?,
        baseURL: URL,
        operationID: String,
        next: @Sendable (HTTPRequest, HTTPBody?, URL) async throws -> (HTTPResponse, HTTPBody?)
    ) async throws -> (HTTPResponse, HTTPBody?) {
        let payload: Data?
        if let body {
            payload = try await Data(collecting: body, upTo: 2_000_000)
        } else {
            payload = nil
        }

        func send(_ request: HTTPRequest, allowRefresh: Bool) async throws -> (HTTPResponse, HTTPBody?) {
            var authorized = request
            ClientHeaders.apply(to: &authorized)
            let apiKey = await authorizer.usesApiKey()
            if let token = await authorizer.accessToken(), !token.isEmpty {
                if apiKey, let name = HTTPField.Name("X-Api-Key") {
                    authorized.headerFields[name] = token
                } else if !apiKey {
                    authorized.headerFields[.authorization] = "Bearer \(token)"
                }
            }
            let outbound = payload.map { HTTPBody($0) }
            let (response, responseBody) = try await next(authorized, outbound, baseURL)
            let canRefresh = allowRefresh && !apiKey
            guard response.status.code == 401, canRefresh else {
                if response.status.code == 401 { await authorizer.endSession() }
                return (response, responseBody)
            }
            do {
                try await authorizer.refreshAccessToken()
            } catch {
                await authorizer.endSession()
                throw error
            }
            return try await send(request, allowRefresh: false)
        }

        return try await send(request, allowRefresh: true)
    }
}

public struct GatewayDateTranscoder: DateTranscoder {
    public init() {}

    public func encode(_ date: Date) throws -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: date)
    }

    public func decode(_ string: String) throws -> Date {
        for candidate in Self.candidates(string) {
            if let date = Self.parse(candidate) { return date }
        }
        throw DecodingError.dataCorrupted(.init(codingPath: [], debugDescription: "Unreadable date \(string)"))
    }

    private static func parse(_ value: String) -> Date? {
        let internet = ISO8601DateFormatter()
        internet.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = internet.date(from: value) { return date }
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        if let date = plain.date(from: value) { return date }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        for format in ["yyyy-MM-dd'T'HH:mm:ss.SSSXXXXX", "yyyy-MM-dd'T'HH:mm:ssXXXXX", "yyyy-MM-dd'T'HH:mm:ss.SSS", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd"] {
            formatter.dateFormat = format
            if let date = formatter.date(from: value) { return date }
        }
        return nil
    }

    private static func candidates(_ value: String) -> [String] {
        var seeds = [value]
        if let expression = try? NSRegularExpression(pattern: #"(\.\d{3})\d+"#) {
            let range = NSRange(value.startIndex..., in: value)
            let truncated = expression.stringByReplacingMatches(in: value, range: range, withTemplate: "$1")
            if truncated != value { seeds.append(truncated) }
        }
        if let expression = try? NSRegularExpression(pattern: #"\.\d+"#) {
            let range = NSRange(value.startIndex..., in: value)
            seeds.append(expression.stringByReplacingMatches(in: value, range: range, withTemplate: ""))
        }
        var results: [String] = []
        for seed in seeds {
            results.append(seed)
            let hasZone = seed.hasSuffix("Z") || seed.contains("+") || seed.range(of: #"T\d{2}:\d{2}:\d{2}-"#, options: .regularExpression) != nil
            if !hasZone { results.append(seed + "Z") }
        }
        return results
    }
}

public enum GatewayJSON {
    public static func data(_ value: some Encodable) throws -> Data {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .custom { date, encoder in
            var container = encoder.singleValueContainer()
            try container.encode(try GatewayDateTranscoder().encode(date))
        }
        return try encoder.encode(value)
    }

    public static func collection(_ value: some Encodable) throws -> Data {
        let encoded = try data(value)
        guard encoded.first == UInt8(ascii: "[") else { return encoded }
        var wrapped = Data(#"{"items":"#.utf8)
        wrapped.append(encoded)
        wrapped.append(Data("}".utf8))
        return wrapped
    }
}
