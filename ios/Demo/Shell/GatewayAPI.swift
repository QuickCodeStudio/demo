import Foundation

struct GatewayRow: Identifiable {
    let id: String
    let recordId: Int?
    let keys: [String]
    let title: String
    let subtitle: String
    let image: String?
    let fields: [PortalValue]
}

enum GatewayRows {
    static func decode(_ data: Data) -> (rows: [GatewayRow], total: Int?) {
        guard let json = try? JSONSerialization.jsonObject(with: data) else { return ([], nil) }
        let records: [Any]
        var total: Int?
        if let page = json as? [String: Any] {
            records = page["items"] as? [Any] ?? page["value"] as? [Any] ?? []
            total = page["totalCount"] as? Int ?? page["total"] as? Int
        } else if let list = json as? [Any] {
            records = list
        } else if let one = json as? [String: Any] {
            records = [one]
        } else {
            records = []
        }
        let rows = records.compactMap { $0 as? [String: Any] }.map(row)
        return (rows, total)
    }

    static func row(_ record: [String: Any]) -> GatewayRow {
        let recordId = intValue(value(record, "id"))
        let title = headline(record) ?? recordId.map { "#\($0)" } ?? "Item"
        let secondary = subtitle(record, title: title)
        let fields = record.keys.sorted().compactMap { key -> PortalValue? in
            guard let raw = record[key] else { return nil }
            return PortalValue(id: key, label: label(key), text: string(raw), kind: kind(key, raw))
        }
        return GatewayRow(
            id: recordId.map(String.init) ?? title,
            recordId: recordId,
            keys: recordId.map { [String($0)] } ?? [],
            title: title,
            subtitle: secondary,
            image: picture(record),
            fields: fields
        )
    }

    private static func headline(_ record: [String: Any]) -> String? {
        for name in ["name", "title", "text", "label", "displayname"] {
            if let found = short(value(record, name)) { return found }
        }
        for key in record.keys.sorted() where key.lowercased().hasSuffix("name") || key.lowercased().hasSuffix("title") {
            if let found = short(record[key]) { return found }
        }
        for name in ["code", "sku", "slug", "key", "email"] {
            if let found = short(value(record, name)) { return found }
        }
        for key in record.keys.sorted() where !hidden(key) {
            if let found = short(record[key]) { return found }
        }
        return nil
    }

    private static func subtitle(_ record: [String: Any], title: String) -> String {
        for key in record.keys where key.caseInsensitiveCompare("status") == .orderedSame || key.lowercased().hasSuffix("status") {
            if let found = short(record[key]), found != title { return found }
        }
        for name in ["code", "sku", "email"] {
            if let found = short(value(record, name)), found != title { return found }
        }
        return ""
    }

    private static func picture(_ record: [String: Any]) -> String? {
        for name in ["photo", "logo", "icon", "banner", "image"] {
            if let found = value(record, name).map(string), remoteMediaURL(found) != nil { return found }
        }
        return nil
    }

    private static func value(_ record: [String: Any], _ name: String) -> Any? {
        record.first { $0.key.caseInsensitiveCompare(name) == .orderedSame }?.value
    }

    private static func short(_ value: Any?) -> String? {
        guard let value, let text = value as? String else { return nil }
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.count < 120, trimmed != "—",
              !trimmed.hasPrefix("{"), !trimmed.hasPrefix("["), !trimmed.contains("<") else { return nil }
        return trimmed
    }

    private static func hidden(_ key: String) -> Bool {
        let name = key.lowercased()
        if name == "id" || name.hasSuffix("id") { return true }
        return name.contains("password") || name.contains("created") || name.contains("updated") || name.contains("deleted")
    }

    private static func kind(_ key: String, _ value: Any) -> PortalValue.Kind {
        let name = key.lowercased()
        if value is [Any] || value is [String: Any] { return .json }
        if value is Bool { return .bool }
        if value is NSNumber { return .number }
        let text = string(value).trimmingCharacters(in: .whitespacesAndNewlines)
        if name.contains("html") || (text.contains("<") && text.contains(">")) { return .html }
        if name.contains("json") || name.contains("yaml") || text.hasPrefix("{") || text.hasPrefix("[") { return .json }
        if name.contains("email") { return .email }
        if name.contains("phone") { return .phone }
        if name.contains("photo") || name.contains("logo") || name.contains("icon") || name.contains("banner") || name.contains("image") || name.contains("avatar") { return .image }
        if name.contains("pdf") || name.contains("datasheet") || name.contains("catalog") || name.hasSuffix("doc") { return .pdf }
        if name.contains("video") { return .video }
        if name.contains("file") || name.contains("attachment") { return .file }
        if name.contains("url") || name.contains("link") || text.hasPrefix("http://") || text.hasPrefix("https://") { return .url }
        if name.contains("lat") || name.contains("lng") || name.contains("geo") { return .geo }
        if text.count > 160 { return .long }
        return .text
    }

    private static func intValue(_ value: Any?) -> Int? {
        switch value {
        case let number as Int: return number
        case let number as Int64: return Int(number)
        case let number as Double: return Int(number)
        case let number as NSNumber: return number.intValue
        default: return nil
        }
    }

    private static func string(_ value: Any) -> String {
        switch value {
        case let text as String: return text
        case let number as NSNumber: return number.stringValue
        case is NSNull: return ""
        default: return String(describing: value)
        }
    }

    private static func label(_ key: String) -> String {
        var result = ""
        for character in key {
            if character.isUppercase, let last = result.last, last.isLetter { result.append(" ") }
            result.append(character)
        }
        return result.prefix(1).uppercased() + result.dropFirst()
    }
}