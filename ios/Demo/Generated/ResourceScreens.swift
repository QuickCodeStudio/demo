import SwiftUI

struct ResourceLink: Hashable {
    let path: String
    let title: String
}

struct ResourceListView: View {
    let module: String
    let model: String
    let title: String

    @Environment(SessionStore.self) private var session
    @State private var rows: [ResourceRow] = []
    @State private var pageNumber = 1
    @State private var totalCount: Int?
    @State private var search = ""
    @State private var loading = true
    @State private var failure: String?

    private var listPath: String {
        "/api/\(Self.kebab(module))/\(Self.kebab(model))"
    }

    private var visible: [ResourceRow] {
        let needle = search.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !needle.isEmpty else { return rows }
        return rows.filter {
            $0.title.localizedStandardContains(needle) || $0.subtitle.localizedStandardContains(needle)
        }
    }

    var body: some View {
        Group {
            if loading, rows.isEmpty, failure == nil {
                LoadingState()
            } else if let failure, rows.isEmpty {
                ErrorState(message: failure, retry: { Task { await load() } })
            } else {
                ScreenCanvas {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 12) {
                            PortalSearchField(text: $search)
                            PortalListSummary(page: pageNumber, rowCount: rows.count, totalCount: totalCount)
                            if visible.isEmpty {
                                EmptyState(title: "No records", actionTitle: "Try again") {
                                    Task { await load() }
                                }
                            } else {
                                ForEach(visible) { row in
                                    rowLink(row)
                                }
                            }
                            PortalListPager(
                                page: pageNumber,
                                rowCount: rows.count,
                                totalCount: totalCount,
                                loading: loading,
                                onSelect: { next in
                                    guard next != pageNumber else { return }
                                    pageNumber = next
                                    Task { await load() }
                                }
                            )
                        }
                        .padding(.vertical, ShellMetrics.screenPadding)
                        .padding(.horizontal, ShellMetrics.screenPadding)
                    }
                    .portalStretchRefresh { await load(reset: true) }
                }
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.large)
        .portalShellChrome()
        .navigationDestination(for: ResourceLink.self) { link in
            ResourceDetailView(path: link.path, title: link.title)
        }
        .task { await load() }
    }

    @ViewBuilder
    private func rowLink(_ row: ResourceRow) -> some View {
        let card = RecordListRow(title: row.title, fields: row.fields)
        if let key = row.recordKey {
            NavigationLink(value: ResourceLink(path: "\(listPath)/\(key)", title: row.title)) {
                card
            }
            .buttonStyle(.plain)
        } else {
            card
        }
    }

    private func load(reset: Bool = false) async {
        if reset { pageNumber = 1 }
        if rows.isEmpty { loading = true }
        failure = nil
        do {
            let result = try await Self.page(session: session, path: listPath, page: pageNumber)
            rows = result.rows
            totalCount = result.total
            loading = false
        } catch {
            failure = PortalErrors.record(error)
            loading = false
        }
    }

    @MainActor
    private static func page(session: SessionStore, path: String, page: Int) async throws -> (rows: [ResourceRow], total: Int?) {
        let parts = path.split(separator: "/").map(String.init)
        guard parts.count >= 3 else { throw GatewayError(message: "This page is not available.", status: 404) }
        let data = try await session.collectionData(
            module: parts[1],
            model: parts[2],
            page: page,
            size: ShellMetrics.listPageSize
        )
        let result = try JSONDecoder().decode(ResourcePage.self, from: data)
        let rows = (result.items ?? []).map(ResourceRow.init)
        let total = result.totalCount ?? (rows.count < ShellMetrics.listPageSize ? rows.count : nil)
        return (rows, total)
    }

    static func kebab(_ value: String) -> String {
        var result = ""
        for character in value {
            if character.isUppercase, !result.isEmpty { result.append("-") }
            result.append(character.lowercased())
        }
        return result
    }
}

struct ResourceDetailView: View {
    let path: String
    let title: String

    @Environment(SessionStore.self) private var session
    @State private var fields: [PortalValue] = []
    @State private var images: [String] = []
    @State private var subtitle = ""
    @State private var loading = true
    @State private var failure: String?

    var body: some View {
        Group {
            if loading {
                LoadingState()
            } else if let failure {
                ErrorState(message: failure, retry: { Task { await load() } })
            } else {
                ScreenCanvas {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            if !images.isEmpty { GalleryView(urls: images) }
                            PortalRecordHeader(title: title, subtitle: subtitle)
                            if !fields.isEmpty { PortalValueList(values: fields) }
                        }
                        .padding(.vertical, ShellMetrics.screenPadding)
                    }
                }
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .portalShellChrome()
        .task { await load() }
    }

    private func load() async {
        do {
            let parts = path.split(separator: "/").map(String.init)
            guard parts.count >= 4 else {
                throw GatewayError(message: "This record cannot be opened.", status: 404)
            }
            let id = parts[3...].joined(separator: "/")
            guard !id.isEmpty else {
                throw GatewayError(message: "This record cannot be opened.", status: 404)
            }
            let data = try await session.recordData(module: parts[1], model: parts[2], id: id)
            let record = try JSONDecoder().decode([String: JSONValue].self, from: data)
            let row = ResourceRow(record)
            let enriched = await PortalRefEnricher.enrich(
                fields: row.fields,
                module: parts[1],
                session: session
            )
            fields = enriched
            images = row.images
            let titleParts = enriched
                .filter { PortalRefEnricher.isForeignKey($0.id) }
                .map(\.text)
                .filter { !$0.isEmpty }
            subtitle = titleParts.isEmpty ? row.subtitle : titleParts.joined(separator: " · ")
            failure = nil
        } catch {
            failure = PortalErrors.record(error)
        }
        loading = false
    }
}

private struct ResourcePage: Decodable {
    let items: [[String: JSONValue]]?
    let totalCount: Int?
}

struct ResourceRow: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let image: String?
    /// String key (uuid / int / code) used for GetItem navigation — AuditLogs use uuid strings.
    let recordKey: String?
    let recordId: Int?
    let fields: [PortalValue]
    let images: [String]

    init(_ record: [String: JSONValue]) {
        let recordKey = Self.key(Self.named(record, "id")?.1)
        let recordId = Self.int(Self.named(record, "id")?.1)
        self.recordKey = recordKey
        self.recordId = recordId
        id = recordKey ?? String(record.keys.sorted().joined(separator: "|").hashValue)
        title = Self.headline(record) ?? (recordKey.map { $0.count <= 12 ? "#\($0)" : String($0.prefix(8)) + "…" } ?? "Item")
        subtitle = Self.secondary(record, title: title)
        image = remoteMediaURL(Self.picture(record))
        images = ["photo", "logo", "icon", "banner", "image"].compactMap { remoteMediaURL(Self.named(record, $0)?.1.text) }
        fields = record.keys.sorted().compactMap { key in
            guard let value = record[key] else { return nil }
            return PortalValue(id: key, label: Self.label(key), text: Self.payload(value), kind: Self.kind(key, value))
        }
    }

    private static func headline(_ record: [String: JSONValue]) -> String? {
        for name in ["name", "title", "text", "label", "displayname"] {
            if let value = short(named(record, name)?.1) { return value }
        }
        for pair in record where pair.key.lowercased().hasSuffix("name") || pair.key.lowercased().hasSuffix("title") {
            if let value = short(pair.value) { return value }
        }
        for name in ["code", "sku", "slug", "key", "email"] {
            if let value = short(named(record, name)?.1) { return value }
        }
        for pair in record.sorted(by: { $0.key < $1.key }) where !hidden(pair.key) {
            if let value = short(pair.value) { return value }
        }
        return nil
    }

    private static func secondary(_ record: [String: JSONValue], title: String) -> String {
        for pair in record where pair.key.caseInsensitiveCompare("status") == .orderedSame || pair.key.lowercased().hasSuffix("status") {
            if let value = short(pair.value), value != title { return value }
        }
        for name in ["code", "sku", "email"] {
            if let value = short(named(record, name)?.1), value != title { return value }
        }
        return ""
    }

    private static func picture(_ record: [String: JSONValue]) -> String? {
        for name in ["photo", "logo", "icon", "banner", "image"] {
            if let value = named(record, name)?.1.text, remoteMediaURL(value) != nil { return value }
        }
        return nil
    }

    private static func named(_ record: [String: JSONValue], _ name: String) -> (String, JSONValue)? {
        guard let pair = record.first(where: { $0.key.caseInsensitiveCompare(name) == .orderedSame }) else { return nil }
        return (pair.key, pair.value)
    }

    private static func short(_ value: JSONValue?) -> String? {
        guard case .string(let text) = value else { return nil }
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

    private static func payload(_ value: JSONValue) -> String {
        switch value {
        case .object, .array:
            guard let data = try? JSONSerialization.data(withJSONObject: object(value), options: [.prettyPrinted, .sortedKeys]),
                  let text = String(data: data, encoding: .utf8) else { return value.text }
            return text
        default:
            return value.text
        }
    }

    private static func object(_ value: JSONValue) -> Any {
        switch value {
        case .string(let text): return text
        case .int(let number): return number
        case .double(let number): return number
        case .bool(let flag): return flag
        case .null: return NSNull()
        case .array(let items): return items.map(object)
        case .object(let fields): return fields.mapValues(object)
        }
    }

    private static func kind(_ key: String, _ value: JSONValue) -> PortalValue.Kind {
        let name = key.lowercased()
        switch value {
        case .bool: return .bool
        case .int, .double: return .number
        case .object, .array: return .json
        case .string(let text):
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            if name.contains("html") || (trimmed.contains("<") && trimmed.contains(">")) { return .html }
            if name.contains("json") || name.contains("yaml") || trimmed.hasPrefix("{") || trimmed.hasPrefix("[") { return .json }
            if name.contains("email") { return .email }
            if name.contains("phone") { return .phone }
            if name.contains("photo") || name.contains("logo") || name.contains("icon") || name.contains("banner") || name.contains("image") || name.contains("avatar") { return .image }
            if name.contains("pdf") || name.contains("datasheet") || name.contains("catalog") || name.hasSuffix("doc") { return .pdf }
            if name.contains("video") { return .video }
            if name.contains("file") || name.contains("attachment") { return .file }
            if name.contains("url") || name.contains("link") || trimmed.hasPrefix("http://") || trimmed.hasPrefix("https://") { return .url }
            if name.contains("lat") || name.contains("lng") || name.contains("geo") { return .geo }
            if trimmed.count > 160 { return .long }
            return .text
        case .null:
            return .text
        }
    }

    private static func key(_ value: JSONValue?) -> String? {
        switch value {
        case .string(let text):
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : trimmed
        case .int(let number):
            return String(number)
        case .double(let number) where number.rounded() == number:
            return String(Int(number))
        default:
            return nil
        }
    }

    private static func int(_ value: JSONValue?) -> Int? {
        switch value {
        case .int(let number):
            return number
        case .double(let number) where number.rounded() == number:
            return Int(number)
        case .string(let text):
            return Int(text)
        default:
            return nil
        }
    }

    private static func label(_ key: String) -> String {
        var result = ""
        for character in key {
            if character.isUppercase, let last = result.last, last.isLetter {
                result.append(" ")
            }
            result.append(character)
        }
        return result.prefix(1).uppercased() + result.dropFirst()
    }
}

enum JSONValue: Decodable, Hashable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case null
    case array([JSONValue])
    case object([String: JSONValue])

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Int.self) {
            self = .int(value)
        } else if let value = try? container.decode(Double.self) {
            self = .double(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else if let value = try? container.decode([String: JSONValue].self) {
            self = .object(value)
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unsupported JSON value")
        }
    }

    var text: String {
        switch self {
        case .string(let value): value
        case .int(let value): String(value)
        case .double(let value):
            value.rounded() == value ? String(Int(value)) : String(format: "%.2f", value)
        case .bool(let value): value ? "Yes" : "No"
        case .null: "—"
        case .array, .object: "…"
        }
    }
}
