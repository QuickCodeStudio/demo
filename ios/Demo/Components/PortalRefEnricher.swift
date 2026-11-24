import Foundation

/// Resolves FK fields to display labels like web Portal `GetComboBoxValue`.
/// Targets come from generated `PortalRefMap` (DBML Ref) — not per-screen hand wiring.
enum PortalRefEnricher {
    private actor MapCache {
        private var maps: [String: [String: String]] = [:]

        func get(_ key: String) -> [String: String]? { maps[key] }

        func set(_ key: String, _ value: [String: String]) { maps[key] = value }
    }

    private static let cache = MapCache()

    static func enrich(_ row: GatewayRow, module: String, session: SessionStore) async -> GatewayRow {
        let fields = await enrich(fields: row.fields, module: module, session: session)
        return GatewayRow(
            id: row.id,
            recordId: row.recordId,
            keys: row.keys,
            title: enrichedTitle(row.title, fields: fields, module: module),
            subtitle: row.subtitle,
            image: row.image,
            fields: fields
        )
    }

    static func enrich(_ rows: [GatewayRow], module: String, session: SessionStore) async -> [GatewayRow] {
        guard !rows.isEmpty else { return rows }
        let models = Set(rows.flatMap(\.fields).compactMap { refModel(for: $0.id, module: module) })
        for model in models {
            _ = await lookupMap(module: module, model: model, session: session)
        }
        return await withTaskGroup(of: (Int, GatewayRow).self) { group in
            for (index, row) in rows.enumerated() {
                group.addTask {
                    (index, await enrich(row, module: module, session: session))
                }
            }
            var next = Array(repeating: rows[0], count: rows.count)
            for await (index, row) in group {
                next[index] = row
            }
            return next
        }
    }

    static func enrich(fields: [PortalValue], module: String, session: SessionStore) async -> [PortalValue] {
        var result: [PortalValue] = []
        result.reserveCapacity(fields.count)
        for field in fields {
            guard let model = refModel(for: field.id, module: module) else {
                result.append(field)
                continue
            }
            let map = await lookupMap(module: module, model: model, session: session)
            let key = field.text.trimmingCharacters(in: .whitespacesAndNewlines)
            let label = refLabel(for: field.id)
            if let name = map[key], !name.isEmpty {
                result.append(PortalValue(id: field.id, label: label, text: name, kind: .text, quiet: false))
            } else {
                result.append(PortalValue(id: field.id, label: label, text: field.text, kind: field.kind, quiet: false))
            }
        }
        return result
    }

    private static func enrichedTitle(_ current: String, fields: [PortalValue], module: String) -> String {
        let trimmed = current.trimmingCharacters(in: .whitespacesAndNewlines)
        let weak = trimmed.isEmpty || trimmed == "Item" || trimmed.hasPrefix("#")
        guard weak else { return current }
        let parts = fields
            .filter { refModel(for: $0.id, module: module) != nil }
            .map { $0.text.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty && $0 != "—" }
        return parts.isEmpty ? current : parts.joined(separator: " · ")
    }

    static func isForeignKey(_ fieldId: String, module: String = "") -> Bool {
        refModel(for: fieldId, module: module) != nil
    }

    /// Prefer generated DBML Ref map; heuristic only when module is unknown (gateway fallback screens).
    static func refModel(for fieldId: String, module: String = "") -> String? {
        let raw = fieldId.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !raw.isEmpty else { return nil }
        if !module.isEmpty {
            return PortalRefMap.model(module: module, field: raw)
        }
        return heuristicRefModel(raw)
    }

    private static func heuristicRefModel(_ fieldId: String) -> String? {
        guard fieldId.count > 2 else { return nil }
        let lower = fieldId.lowercased()
        guard lower != "id", lower.hasSuffix("id") else { return nil }
        if lower.hasSuffix("uuid") || lower == "guid" { return nil }
        var base = String(fieldId.dropLast(2))
        guard !base.isEmpty else { return nil }
        for prefix in ["Primary", "Parent", "Secondary", "Default", "Main", "Owner"] {
            if base.hasPrefix(prefix), base.count > prefix.count {
                let next = base[base.index(base.startIndex, offsetBy: prefix.count)]
                if next.isUppercase {
                    base = String(base.dropFirst(prefix.count))
                    break
                }
            }
        }
        guard !base.isEmpty else { return nil }
        return kebab(pluralize(base))
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

    static func refLabel(for fieldId: String) -> String {
        let raw = fieldId.trimmingCharacters(in: .whitespacesAndNewlines)
        guard raw.count > 2, raw.lowercased().hasSuffix("id") else {
            return spaced(raw)
        }
        return spaced(String(raw.dropLast(2)))
    }

    private static func lookupMap(module: String, model: String, session: SessionStore) async -> [String: String] {
        let cacheKey = module + "/" + model
        if let cached = await cache.get(cacheKey) {
            return cached
        }

        var built: [String: String] = [:]
        do {
            let data = try await session.collectionData(module: module, model: model, page: 1, size: 500)
            let records = decodeRecords(data)
            for record in records {
                guard let id = recordId(record) else { continue }
                if let title = displayTitle(record) {
                    built[id] = title
                }
            }
        } catch {
            built = [:]
        }

        await cache.set(cacheKey, built)
        return built
    }

    private static func decodeRecords(_ data: Data) -> [[String: Any]] {
        guard let json = try? JSONSerialization.jsonObject(with: data) else { return [] }
        if let page = json as? [String: Any] {
            let items = page["items"] as? [Any] ?? page["value"] as? [Any] ?? []
            return items.compactMap { $0 as? [String: Any] }
        }
        if let list = json as? [Any] {
            return list.compactMap { $0 as? [String: Any] }
        }
        if let one = json as? [String: Any] {
            return [one]
        }
        return []
    }

    private static func recordId(_ record: [String: Any]) -> String? {
        for name in ["id", "Id", "ID"] {
            if let value = record[name] {
                return stringify(value)
            }
        }
        if let pair = record.first(where: { $0.key.caseInsensitiveCompare("id") == .orderedSame }) {
            return stringify(pair.value)
        }
        return nil
    }

    private static func displayTitle(_ record: [String: Any]) -> String? {
        for name in ["name", "title", "text", "label", "displayName", "displayname"] {
            if let value = short(record[name] ?? record.first { $0.key.caseInsensitiveCompare(name) == .orderedSame }?.value) {
                return value
            }
        }
        for key in record.keys.sorted() where key.lowercased().hasSuffix("name") || key.lowercased().hasSuffix("title") {
            if let value = short(record[key]) { return value }
        }
        for name in ["code", "sku", "slug", "key", "email"] {
            if let value = short(record.first { $0.key.caseInsensitiveCompare(name) == .orderedSame }?.value) {
                return value
            }
        }
        return nil
    }

    private static func short(_ value: Any?) -> String? {
        guard let value else { return nil }
        let text: String
        if let string = value as? String {
            text = string
        } else if let number = value as? NSNumber {
            text = number.stringValue
        } else {
            return nil
        }
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.count < 160, trimmed != "—" else { return nil }
        return trimmed
    }

    private static func stringify(_ value: Any) -> String? {
        if let string = value as? String {
            let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : trimmed
        }
        if let number = value as? NSNumber {
            return number.stringValue
        }
        if let int = value as? Int {
            return String(int)
        }
        return nil
    }

    private static func pluralize(_ singular: String) -> String {
        let lower = singular.lowercased()
        if lower.hasSuffix("y"), singular.count > 1 {
            let vowels = "aeiou"
            let before = singular[singular.index(singular.endIndex, offsetBy: -2)]
            if !vowels.contains(before.lowercased()) {
                return String(singular.dropLast()) + "ies"
            }
        }
        if lower.hasSuffix("s") || lower.hasSuffix("x") || lower.hasSuffix("z")
            || lower.hasSuffix("ch") || lower.hasSuffix("sh") {
            return singular + "es"
        }
        return singular + "s"
    }

    private static func spaced(_ value: String) -> String {
        var result = ""
        for character in value {
            if character.isUppercase, let last = result.last, last.isLetter {
                result.append(" ")
            }
            result.append(character)
        }
        guard let first = result.first else { return result }
        return String(first).uppercased() + result.dropFirst()
    }
}
