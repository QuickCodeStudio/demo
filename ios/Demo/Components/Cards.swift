import SwiftUI

struct ProductCardLabel: View {
    let imageURL: String?
    let title: String
    let price: String
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ImagePreview(url: imageURL)
                .frame(height: 168)
                .frame(maxWidth: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            HStack(alignment: .firstTextBaseline) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(Brand.text(colorScheme))
                Spacer()
                if !price.isEmpty {
                    StatusPill(title: price)
                }
            }
        }
        .padding(14)
        .glassEffect(.regular.tint(Color.primary.opacity(0.02)), in: RoundedRectangle(cornerRadius: ShellMetrics.cardRadius, style: .continuous))
    }
}

struct ProductCard: View {
    let imageURL: String?
    let title: String
    let price: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ProductCardLabel(imageURL: imageURL, title: title, price: price)
        }
        .buttonStyle(.plain)
    }
}

struct RowCard: View {
    let title: String
    let subtitle: String

    var body: some View {
        RecordListRow(title: title, fields: subtitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? []
            : [PortalValue(id: "subtitle", label: "", text: subtitle, kind: .text)])
    }
}

/// Compact-layout list row (column priority): title + status badge + typed facts.
/// Phone keeps 2 facts; regular width keeps 4. Remaining fields live on the detail screen.
struct RecordListRow: View {
    let title: String
    let fields: [PortalValue]
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.horizontalSizeClass) private var size

    init(row: GatewayRow) {
        title = row.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Item" : row.title
        fields = row.fields
    }

    init(title: String, fields: [PortalValue]) {
        self.title = title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Item" : title
        self.fields = fields
    }

    private var corner: CGFloat { ShellMetrics.cardRadius }
    private var padX: CGFloat { size == .regular ? 18 : 14 }
    private var padY: CGFloat { size == .regular ? 14 : 12 }
    /// Compact layout budget — mirrors responsive column priority.
    private var columnBudget: Int { size == .regular ? 4 : 2 }

    /// Quiet fields stay detail-only unless the row has no visible facts (junction / FK-only tables).
    private var effectiveFields: [PortalValue] {
        let open = fields.filter { !$0.quiet }
        if open.contains(where: { usableIgnoringQuiet($0) }) {
            return fields
        }
        return fields.map { field in
            guard field.quiet, usableIgnoringQuiet(field) else { return field }
            let key = field.id.lowercased()
            if key == "id" { return field }
            return PortalValue(id: field.id, label: field.label, text: field.text, kind: field.kind, quiet: false)
        }
    }

    private var status: PortalValue? {
        let usableFields = effectiveFields.filter(usable)
        if let named = usableFields.first(where: isStatusField) {
            return named
        }
        return usableFields.first { $0.kind == .bool }
    }

    /// Prefer a meaningful title: never bare id, never duplicate of status when better facts exist.
    private var displayTitle: String {
        let candidates = effectiveFields.filter(usable)
        let raw = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let statusText = status?.text
        let rawIsStatus = statusText.map { raw.caseInsensitiveCompare($0) == .orderedSame } ?? false
        let rawIsWeak = raw.isEmpty || raw == "Item" || looksLikeBareId(raw) || rawIsStatus

        if !rawIsWeak { return raw }

        let preferred = candidates
            .filter { field in
                if field.id == status?.id { return false }
                if looksLikeBareId(field.text) && field.kind == .integer { return false }
                return true
            }
            .sorted { factPriority($0) < factPriority($1) }

        if let best = preferred.first {
            if best.kind == .decimal || best.kind == .number || best.kind == .integer || best.kind == .date {
                return best.label.isEmpty ? best.text : "\(best.label): \(best.text)"
            }
            return best.text
        }

        // Junction fallback: "Product Id 12 · Category Id 4"
        let keys = candidates.filter { $0.kind == .integer || $0.id.lowercased().hasSuffix("id") }.prefix(2)
        if !keys.isEmpty {
            return keys.map { key in
                key.label.isEmpty ? key.text : "\(key.label) \(key.text)"
            }.joined(separator: " · ")
        }

        return raw.isEmpty ? "Item" : raw
    }

    private var columns: [PortalValue] {
        let titleText = displayTitle
        return effectiveFields
            .filter { field in
                guard usable(field) else { return false }
                if field.id == status?.id { return false }
                if field.text.caseInsensitiveCompare(titleText) == .orderedSame { return false }
                // Avoid repeating the promoted title value
                if titleText.contains(field.text), field.text.count > 2 { return false }
                return true
            }
            .sorted { lhs, rhs in
                let lp = factPriority(lhs)
                let rp = factPriority(rhs)
                if lp != rp { return lp < rp }
                return false
            }
            .prefix(columnBudget)
            .map { truncateIfNeeded($0) }
    }

    private var showBadge: Bool {
        guard let status else { return false }
        return status.text.caseInsensitiveCompare(displayTitle) != .orderedSame
    }

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: size == .regular ? 12 : 8) {
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text(displayTitle)
                        .font(size == .regular ? .title3.weight(.semibold) : .headline)
                        .foregroundStyle(Brand.text(colorScheme))
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    Spacer(minLength: 8)
                    if showBadge, let status {
                        recordBadge(status)
                    }
                }

                if !columns.isEmpty {
                    if size == .regular {
                        HStack(alignment: .top, spacing: 14) {
                            ForEach(columns) { column in
                                columnBlock(column)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                    } else {
                        VStack(alignment: .leading, spacing: 6) {
                            ForEach(columns) { column in
                                HStack(alignment: .firstTextBaseline, spacing: 8) {
                                    if !column.label.isEmpty {
                                        Text(column.label)
                                            .font(.caption.weight(.semibold))
                                            .foregroundStyle(Brand.muted(colorScheme))
                                            .frame(width: 88, alignment: .leading)
                                            .lineLimit(1)
                                    }
                                    Text(column.text)
                                        .font(.subheadline.weight(.medium))
                                        .foregroundStyle(Brand.text(colorScheme))
                                        .lineLimit(2)
                                    Spacer(minLength: 0)
                                }
                            }
                        }
                    }
                }
            }
            Image(systemName: "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Brand.muted(colorScheme).opacity(0.7))
        }
        .padding(.horizontal, padX)
        .padding(.vertical, padY)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
        .glassEffect(
            .regular.tint(Color.primary.opacity(colorScheme == .dark ? 0.06 : 0.03)),
            in: RoundedRectangle(cornerRadius: corner, style: .continuous)
        )
        .overlay {
            RoundedRectangle(cornerRadius: corner, style: .continuous)
                .strokeBorder(Color.primary.opacity(colorScheme == .dark ? 0.10 : 0.06), lineWidth: 1)
        }
    }

    private func columnBlock(_ column: PortalValue) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            if !column.label.isEmpty {
                Text(column.label.uppercased())
                    .font(.caption2.weight(.bold))
                    .tracking(0.5)
                    .foregroundStyle(Brand.muted(colorScheme))
                    .lineLimit(1)
            }
            Text(column.text)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Brand.text(colorScheme))
                .lineLimit(2)
        }
    }

    @ViewBuilder
    private func recordBadge(_ value: PortalValue) -> some View {
        let raw = value.text.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalized = raw.lowercased()
        let boolOn = value.kind == .bool && (normalized == "yes" || normalized == "true" || normalized == "1")
        let namedOn = normalized == "active" || normalized == "enabled"
        let namedOff = normalized == "inactive" || normalized == "disabled"
        let isOnOff = value.kind == .bool || namedOn || namedOff
        let on = value.kind == .bool ? boolOn : namedOn
        let label = value.kind == .bool ? (on ? "Active" : "Inactive") : raw

        if isOnOff {
            onOffBadge(label: label, on: on)
        } else {
            Text(label)
                .font(.caption.weight(.bold))
                .foregroundStyle(Brand.text(colorScheme))
                .padding(.horizontal, 11)
                .padding(.vertical, 6)
                .background(Brand.action.opacity(colorScheme == .dark ? 0.28 : 0.16), in: Capsule())
                .overlay {
                    Capsule().strokeBorder(Brand.action.opacity(0.55), lineWidth: 1)
                }
        }
    }

    private func onOffBadge(label: String, on: Bool) -> some View {
        let fill = on ? Color(hex: 0x16A34A) : Brand.backgroundMuted(colorScheme)
        let ink = on ? Color.white : Brand.text(colorScheme)
        return Text(label)
            .font(.caption.weight(.bold))
            .foregroundStyle(ink)
            .padding(.horizontal, 11)
            .padding(.vertical, 6)
            .background(fill, in: Capsule())
            .overlay {
                Capsule().strokeBorder(
                    on ? Color.white.opacity(0.18) : Brand.muted(colorScheme).opacity(0.55),
                    lineWidth: 1
                )
            }
            .accessibilityLabel(label)
    }

    private func usable(_ field: PortalValue) -> Bool {
        if field.quiet { return false }
        return usableIgnoringQuiet(field)
    }

    private func usableIgnoringQuiet(_ field: PortalValue) -> Bool {
        let text = field.text.trimmingCharacters(in: .whitespacesAndNewlines)
        if text.isEmpty || text == "—" || text == "…" { return false }
        if field.kind == .image || field.kind == .file || field.kind == .json || field.kind == .html || field.kind == .geo {
            return false
        }
        return true
    }

    private func looksLikeBareId(_ text: String) -> Bool {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return false }
        if trimmed.allSatisfy(\.isNumber) { return true }
        if trimmed.count <= 8, UUID(uuidString: trimmed) != nil { return true }
        return false
    }

    private func isStatusField(_ field: PortalValue) -> Bool {
        let key = field.id.lowercased()
        if key == "status" || key.hasSuffix("status") || key == "state" || key == "isactive" || key == "active" {
            return true
        }
        return false
    }

    /// Lower = higher priority (money → date → enum/text → contact → int → long).
    private func factPriority(_ field: PortalValue) -> Int {
        let key = field.id.lowercased()
        if key.contains("amount") || key.contains("price") || key.contains("total") || key.contains("balance") || key.contains("cost") {
            return 8
        }
        switch field.kind {
        case .decimal, .number:
            return 10
        case .date:
            return 20
        case .email, .phone, .url:
            return 30
        case .bool:
            return 55
        case .integer:
            return 60
        case .long:
            return 70
        case .text:
            if key.contains("code") || key.contains("sku") || key.contains("type") || key.contains("action") {
                return 35
            }
            return 40
        default:
            return 90
        }
    }

    private func truncateIfNeeded(_ field: PortalValue) -> PortalValue {
        let limit = field.kind == .long ? 72 : 96
        guard field.text.count > limit else { return field }
        let end = field.text.index(field.text.startIndex, offsetBy: limit)
        return PortalValue(
            id: field.id,
            label: field.label,
            text: String(field.text[..<end]).trimmingCharacters(in: .whitespacesAndNewlines) + "…",
            kind: field.kind,
            quiet: field.quiet
        )
    }
}

struct MediaCard: View {
    let imageURL: String?
    let title: String

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            ImagePreview(url: imageURL)
                .frame(height: 200)
                .frame(maxWidth: .infinity)
            Text(title)
                .font(.headline)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .portalCardSurface(corner: 999)
                .padding(12)
        }
        .clipShape(RoundedRectangle(cornerRadius: ShellMetrics.cardRadius, style: .continuous))
    }
}

struct PortalSearchField: View {
    var placeholder = "Search"
    /// Tighter control for the side menu — list screens keep the default height.
    var compact = false
    @Binding var text: String
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        HStack(spacing: compact ? 6 : 8) {
            Image(systemName: "magnifyingglass")
                .font(compact ? .footnote.weight(.semibold) : .subheadline.weight(.semibold))
                .foregroundStyle(Brand.text(colorScheme).opacity(0.7))
            TextField(placeholder, text: $text)
                .font(compact ? .subheadline : .body)
                .foregroundStyle(Brand.text(colorScheme))
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
        }
        .padding(.horizontal, compact ? 12 : 14)
        .padding(.vertical, compact ? 7 : 9)
        .portalGlassCapsule(colorScheme)
    }
}

private struct PortalCardSurface: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme
    var corner: CGFloat = 22

    func body(content: Content) -> some View {
        content
            .background {
                RoundedRectangle(cornerRadius: corner, style: .continuous)
                    .fill(colorScheme == .dark ? Color.white.opacity(0.08) : Color.white.opacity(0.92))
            }
            .overlay {
                RoundedRectangle(cornerRadius: corner, style: .continuous)
                    .strokeBorder(Color.primary.opacity(colorScheme == .dark ? 0.12 : 0.06), lineWidth: 1)
            }
            .shadow(color: Brand.navy.opacity(colorScheme == .dark ? 0.28 : 0.08), radius: 14, y: 6)
    }
}

private extension View {
    func portalCardSurface(corner: CGFloat = 22) -> some View {
        modifier(PortalCardSurface(corner: corner))
    }
}
