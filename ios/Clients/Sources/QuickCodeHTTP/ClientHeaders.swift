import Foundation
import HTTPTypes
import OpenAPIRuntime
import Security
#if canImport(UIKit)
@preconcurrency import UIKit
#endif

/// Installation / request correlation headers (not auth).
/// `X-Client-Id` is a persisted UUID; `X-Vendor-Id` is optional platform vendor id (IDFV).
public enum ClientHeaders {
    public static let clientIdField = "X-Client-Id"
    public static let vendorIdField = "X-Vendor-Id"
    public static let platformField = "X-Client-Platform"
    public static let appField = "X-Client-App"
    public static let versionField = "X-Client-Version"

    private static let clientIdAccount = "qc.clientId"
    private static let keychainService = (Bundle.main.bundleIdentifier ?? "net.quickcode") + ".client"

    /// Stable per-install id (Keychain). Survives relaunch; cleared if app data wiped.
    public static var clientId: String {
        if let existing = keychainGet(clientIdAccount), !existing.isEmpty {
            return existing
        }
        let created = UUID().uuidString.lowercased()
        keychainSet(created, account: clientIdAccount)
        return created
    }

    /// iOS IDFV when available — correlation only, not the guest/cart key.
    /// Never blocks on the main queue (MainActor ≠ main thread; `main.sync` deadlocks).
    public static var vendorId: String? {
        if let cached = cachedVendorId { return cached }
        #if canImport(UIKit)
        guard Thread.isMainThread else {
            DispatchQueue.main.async { _ = ClientHeaders.vendorId }
            return nil
        }
        let value = UIDevice.current.identifierForVendor?.uuidString.lowercased()
        cachedVendorId = value
        return value
        #else
        return nil
        #endif
    }

    nonisolated(unsafe) private static var cachedVendorId: String?

    public static var platform: String { "ios" }

    /// `portal` when bundle id ends with `.Portal`; otherwise `storefront`.
    public static var app: String {
        if let override = Bundle.main.object(forInfoDictionaryKey: "QCClientApp") as? String,
           !override.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return override.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        }
        let bundle = Bundle.main.bundleIdentifier ?? ""
        return bundle.hasSuffix(".Portal") ? "portal" : "storefront"
    }

    public static var version: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
    }

    public static func apply(to request: inout URLRequest) {
        request.setValue(clientId, forHTTPHeaderField: clientIdField)
        if let vendorId {
            request.setValue(vendorId, forHTTPHeaderField: vendorIdField)
        }
        request.setValue(platform, forHTTPHeaderField: platformField)
        request.setValue(app, forHTTPHeaderField: appField)
        request.setValue(version, forHTTPHeaderField: versionField)
    }

    public static func apply(to request: inout HTTPRequest) {
        if let name = HTTPField.Name(clientIdField) {
            request.headerFields[name] = clientId
        }
        if let vendorId, let name = HTTPField.Name(vendorIdField) {
            request.headerFields[name] = vendorId
        }
        if let name = HTTPField.Name(platformField) {
            request.headerFields[name] = platform
        }
        if let name = HTTPField.Name(appField) {
            request.headerFields[name] = app
        }
        if let name = HTTPField.Name(versionField) {
            request.headerFields[name] = version
        }
    }

    private static func keychainSet(_ value: String, account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
        var insert = query
        insert[kSecValueData as String] = Data(value.utf8)
        insert[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(insert as CFDictionary, nil)
    }

    private static func keychainGet(_ account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let value = String(data: data, encoding: .utf8),
              !value.isEmpty
        else { return nil }
        return value
    }
}

public final class ClientHeadersMiddleware: ClientMiddleware, @unchecked Sendable {
    public init() {}

    public func intercept(
        _ request: HTTPRequest,
        body: HTTPBody?,
        baseURL: URL,
        operationID: String,
        next: @Sendable (HTTPRequest, HTTPBody?, URL) async throws -> (HTTPResponse, HTTPBody?)
    ) async throws -> (HTTPResponse, HTTPBody?) {
        var outbound = request
        ClientHeaders.apply(to: &outbound)
        return try await next(outbound, body, baseURL)
    }
}
