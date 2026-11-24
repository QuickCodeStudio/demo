import Foundation
import QuickCodeHTTP
import UIKit

/// Maps raw transport / OpenAPI dumps to short user copy, and keeps tech details for shake-to-report.
enum PortalErrors {
    struct Entry: Identifiable, Sendable {
        let id: UUID
        let date: Date
        let userMessage: String
        let technical: String
    }

    private static let lock = NSLock()
    private static var buffer: [Entry] = []
    private static let limit = 40

    static var recent: [Entry] {
        lock.lock()
        defer { lock.unlock() }
        return buffer.reversed()
    }

    /// Record a thrown error; returns the message safe to show in UI.
    @discardableResult
    static func record(_ error: Error) -> String {
        let technical = technicalDump(error)
        let user = userMessage(for: error)
        append(Entry(id: UUID(), date: Date(), userMessage: user, technical: technical))
        return user
    }

    /// Sanitize a string already stored in `failure` / toast state.
    static func sanitize(_ text: String) -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return generic }
        if looksTechnical(trimmed) || trimmed.count > 160 || looksOpsSpeak(trimmed) {
            return generic
        }
        return trimmed
    }

    static let generic = "Something went wrong. Please try again."

    /// Soften ops/infra phrasing that still leaks into UI copy.
    private static func looksOpsSpeak(_ text: String) -> Bool {
        let markers = [
            "temporarily unavailable",
            "bad gateway",
            "service unavailable",
            "gateway timeout",
            "internal server error",
            "upstream"
        ]
        return markers.contains { text.localizedCaseInsensitiveContains($0) }
    }

    static func userMessage(for error: Error) -> String {
        if let api = error as? APIFailure {
            return sanitize(api.message)
        }
        if let gateway = error as? GatewayError {
            return sanitize(gateway.message)
        }
        if let url = urlError(from: error) {
            return message(forURLError: url)
        }
        return sanitize(error.localizedDescription)
    }

    static func clear() {
        lock.lock()
        buffer.removeAll()
        lock.unlock()
    }

    private static func append(_ entry: Entry) {
        lock.lock()
        buffer.append(entry)
        if buffer.count > limit {
            buffer.removeFirst(buffer.count - limit)
        }
        lock.unlock()
    }

    private static func technicalDump(_ error: Error) -> String {
        var lines: [String] = []
        lines.append(String(describing: type(of: error)))
        lines.append(error.localizedDescription)
        let ns = error as NSError
        lines.append("domain=\(ns.domain) code=\(ns.code)")
        if !ns.userInfo.isEmpty {
            lines.append("userInfo=\(ns.userInfo)")
        }
        if let underlying = ns.userInfo[NSUnderlyingErrorKey] as? Error {
            lines.append("--- underlying ---")
            lines.append(String(describing: underlying))
            lines.append(underlying.localizedDescription)
        }
        lines.append(String(describing: error))
        return lines.joined(separator: "\n")
    }

    private static func urlError(from error: Error) -> URLError? {
        if let url = error as? URLError { return url }
        let ns = error as NSError
        if ns.domain == NSURLErrorDomain {
            return URLError(URLError.Code(rawValue: ns.code))
        }
        if let underlying = ns.userInfo[NSUnderlyingErrorKey] as? Error {
            return urlError(from: underlying)
        }
        // OpenAPI ClientError often embeds the URLError text only.
        return nil
    }

    private static func message(forURLError error: URLError) -> String {
        switch error.code {
        case .notConnectedToInternet, .networkConnectionLost, .dataNotAllowed:
            return "No internet connection. Check your network and try again."
        case .timedOut:
            return "The request timed out. Please try again."
        case .cannotConnectToHost, .cannotFindHost, .dnsLookupFailed:
            return "Couldn't reach the server. Try again in a moment."
        case .secureConnectionFailed, .serverCertificateUntrusted, .serverCertificateHasBadDate:
            return "A secure connection could not be established."
        case .cancelled:
            return "The request was cancelled."
        default:
            return "Something went wrong. Please try again."
        }
    }

    static func looksTechnical(_ text: String) -> Bool {
        let markers = [
            "NSURLErrorDomain",
            "Client error",
            "ClientError",
            "Transport threw",
            "operationID",
            "LocalUploadTask",
            "HTTPClient",
            "OpenAPIRuntime",
            "NSUnderlyingError",
            "nw_connection",
            "en0[",
            "http://localhost",
            "https://localhost",
            "0x",
            "stack dump",
            "thrownError",
            "api-auth-",
            "-1001",
            "-1004",
            "-1009"
        ]
        return markers.contains { text.localizedCaseInsensitiveContains($0) }
    }
}

extension Notification.Name {
    static let portalDeviceDidShake = Notification.Name("portalDeviceDidShake")
}

extension UIWindow {
    open override func motionEnded(_ motion: UIEvent.EventSubtype, with event: UIEvent?) {
        if motion == .motionShake {
            NotificationCenter.default.post(name: .portalDeviceDidShake, object: nil)
        }
        super.motionEnded(motion, with: event)
    }
}
