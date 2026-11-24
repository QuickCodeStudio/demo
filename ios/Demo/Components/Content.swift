import SwiftUI

struct DetailTitle: View {
    let title: String
    let price: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.largeTitle.bold())
            StatusPill(title: price)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct TextBlock: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.body)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct KeyValueList: View {
    let rows: [(String, String)]

    var body: some View {
        GlassPanel {
            VStack(spacing: 0) {
                ForEach(Array(rows.enumerated()), id: \.offset) { index, row in
                    HStack {
                        Text(row.0)
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text(row.1)
                            .fontWeight(.medium)
                    }
                    .padding(.vertical, 10)
                    if index < rows.count - 1 {
                        Divider()
                    }
                }
            }
        }
    }
}

struct StatusPill: View {
    let title: String
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Text(title.uppercased())
            .font(.caption2.weight(.bold))
            .tracking(1.1)
            .foregroundStyle(Brand.action)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Brand.action.opacity(colorScheme == .dark ? 0.18 : 0.1))
            )
            .overlay {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .strokeBorder(Brand.action.opacity(0.22), lineWidth: 1)
            }
    }
}

struct PortalRecordHeader: View {
    let title: String
    var subtitle: String = ""
    var image: String? = nil
    /// Optional hero metric (e.g. money) shown under the title.
    var metric: String? = nil
    var metricLabel: String? = nil
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.horizontalSizeClass) private var size
    @State private var appeared = false

    private var metaIsId: Bool {
        let text = subtitle.trimmingCharacters(in: .whitespacesAndNewlines)
        return !text.isEmpty && text.allSatisfy { $0.isNumber || $0 == "-" }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            if let image, remoteMediaURL(image) != nil {
                ImagePreview(url: image, enablesLightbox: true, showsPlaceholderWhenEmpty: false)
                    .frame(height: size == .regular ? 240 : 190)
                    .frame(maxWidth: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }

            VStack(alignment: .leading, spacing: 12) {
                if !subtitle.isEmpty, !metaIsId {
                    StatusPill(title: subtitle)
                        .opacity(appeared ? 1 : 0)
                        .offset(y: appeared ? 0 : 6)
                }

                Text(title.isEmpty ? "Item" : title)
                    .font(.system(size: size == .regular ? 40 : 34, weight: .bold, design: .default))
                    .foregroundStyle(Brand.text(colorScheme))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentTransition(.opacity)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 10)

                if metaIsId {
                    Text("#" + subtitle)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Brand.muted(colorScheme))
                }

                if let metric, !metric.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        if let metricLabel, !metricLabel.isEmpty {
                            Text(metricLabel.uppercased())
                                .font(.caption2.weight(.bold))
                                .tracking(1.0)
                                .foregroundStyle(Brand.muted(colorScheme))
                        }
                        Text(metric)
                            .font(.system(size: 28, weight: .semibold, design: .rounded))
                            .foregroundStyle(Brand.text(colorScheme))
                            .monospacedDigit()
                            .contentTransition(.numericText())
                    }
                    .padding(.top, 4)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 8)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .onAppear {
            withAnimation(.snappy(duration: 0.42)) { appeared = true }
        }
    }
}

/// Full-width action dock for detail screens (confirmable Update/Delete).
struct PortalDetailActionBar: View {
    struct Item: Identifiable {
        let id: String
        let title: String
        var destructive = false
        var disabled = false
        let perform: () -> Void
    }

    let items: [Item]
    var busy = false
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(spacing: 10) {
            if busy {
                HStack(spacing: 10) {
                    ProgressView()
                        .controlSize(.small)
                    Text("Updating…")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Brand.muted(colorScheme))
                    Spacer(minLength: 0)
                }
                .transition(.opacity.combined(with: .move(edge: .bottom)))
            }

            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                Button(action: item.perform) {
                    Text(item.title)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(item.destructive ? Color.white : Brand.text(colorScheme))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background {
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(item.destructive
                                      ? Color.red.opacity(colorScheme == .dark ? 0.85 : 0.9)
                                      : Brand.action.opacity(colorScheme == .dark ? 0.92 : 1))
                        }
                        .overlay {
                            if !item.destructive {
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .strokeBorder(Color.white.opacity(colorScheme == .dark ? 0.12 : 0.2), lineWidth: 1)
                            }
                        }
                        // Text hit-tests glyphs only — make the whole pill tappable.
                        .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)
                .opacity(item.disabled || busy ? 0.55 : 1)
                .disabled(item.disabled || busy)
                .scaleEffect(busy && index == 0 ? 0.99 : 1)
                .animation(.snappy(duration: 0.28), value: busy)
            }
        }
        .padding(.top, 8)
    }
}

struct PortalRelatedSection<Destination: View>: View {
    let title: String
    let rows: [GatewayRow]
    @ViewBuilder var destination: ([String]) -> Destination
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.horizontalSizeClass) private var size

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.title3.weight(.semibold))
                .foregroundStyle(Brand.text(colorScheme))
            if rows.isEmpty {
                Text("No related records")
                    .font(.subheadline)
                    .foregroundStyle(Brand.muted(colorScheme))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 14)
                    .padding(.horizontal, size == .regular ? 18 : 14)
                    .glassEffect(.regular.tint(Color.primary.opacity(0.02)), in: RoundedRectangle(cornerRadius: ShellMetrics.cardRadius, style: .continuous))
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(rows) { row in
                        NavigationLink {
                            destination(row.keys)
                        } label: {
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(row.title.isEmpty ? "Item" : row.title)
                                        .font(.body.weight(.semibold))
                                        .foregroundStyle(Brand.text(colorScheme))
                                        .lineLimit(2)
                                    if !row.subtitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                        Text(row.subtitle)
                                            .font(.subheadline)
                                            .foregroundStyle(Brand.muted(colorScheme))
                                            .lineLimit(1)
                                    }
                                }
                                Spacer(minLength: 0)
                                Image(systemName: "chevron.right")
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(Brand.muted(colorScheme).opacity(0.7))
                            }
                            .padding(.horizontal, size == .regular ? 18 : 14)
                            .padding(.vertical, 14)
                            .glassEffect(.regular.tint(Color.primary.opacity(0.02)), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }
}

struct PrimaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
        }
        .buttonStyle(.glassProminent)
        .controlSize(.large)
    }
}

struct SearchField: View {
    @Binding var text: String

    var body: some View {
        PortalSearchField(text: $text)
    }
}

struct FilterChips: View {
    let options: [String]
    @Binding var selection: String

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(options, id: \.self) { option in
                    Button(option) {
                        selection = option
                    }
                    .buttonStyle(.glass)
                    .tint(selection == option ? Color.accentColor : Color.secondary)
                }
            }
        }
    }
}

enum PortalListPaging {
    static var pageSize: Int { ShellMetrics.listPageSize }

    static func totalPages(totalCount: Int?, page: Int, rowCount: Int, pageSize: Int = pageSize) -> Int {
        if let totalCount, totalCount > 0 {
            return max(1, Int(ceil(Double(totalCount) / Double(pageSize))))
        }
        if page <= 1, rowCount < pageSize { return 1 }
        return max(1, page + (rowCount >= pageSize ? 1 : 0))
    }

    /// Portal-style range: "42 records" or "1–20 of 152 records".
    static func summary(page: Int, pageSize: Int = pageSize, rowCount: Int, totalCount: Int?) -> String {
        let pages = totalPages(totalCount: totalCount, page: page, rowCount: rowCount, pageSize: pageSize)
        if pages <= 1 {
            let total = totalCount ?? rowCount
            return "\(total.formatted()) \(total == 1 ? "record" : "records")"
        }
        let start = rowCount == 0 ? 0 : (page - 1) * pageSize + 1
        let end = rowCount == 0 ? 0 : start + rowCount - 1
        if let totalCount {
            return "\(start.formatted())–\(end.formatted()) of \(totalCount.formatted()) records"
        }
        return "\(start.formatted())–\(end.formatted()) records"
    }
}

/// Top-of-list count / range line (matches web portal pager summary).
struct PortalListSummary: View {
    var page: Int
    var pageSize: Int = PortalListPaging.pageSize
    var rowCount: Int
    var totalCount: Int?

    var body: some View {
        Text(PortalListPaging.summary(page: page, pageSize: pageSize, rowCount: rowCount, totalCount: totalCount))
            .font(.subheadline.weight(.medium))
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityLabel(PortalListPaging.summary(page: page, pageSize: pageSize, rowCount: rowCount, totalCount: totalCount))
    }
}

/// Bottom pager — only when 2+ pages. Portal-style page chips + jump (ellipsis).
struct PortalListPager: View {
    var page: Int
    var pageSize: Int = PortalListPaging.pageSize
    var rowCount: Int
    var totalCount: Int?
    var loading = false
    var onSelect: (Int) -> Void

    @Environment(\.colorScheme) private var colorScheme
    @State private var jumpOpen = false
    @State private var jumpText = ""

    private var pages: Int {
        PortalListPaging.totalPages(totalCount: totalCount, page: page, rowCount: rowCount, pageSize: pageSize)
    }

    /// `nil` = ellipsis gap (opens jump).
    private var tokens: [Int?] {
        var marks = Set<Int>()
        marks.insert(1)
        marks.insert(pages)
        for value in (page - 1)...(page + 1) where (1...pages).contains(value) {
            marks.insert(value)
        }
        let sorted = marks.sorted()
        var result: [Int?] = []
        var previous = 0
        for value in sorted {
            if previous > 0, value - previous > 1 {
                result.append(nil)
            }
            result.append(value)
            previous = value
        }
        return result
    }

    var body: some View {
        if pages > 1 {
            HStack(spacing: 8) {
                stepButton(systemName: "chevron.left", enabled: page > 1) {
                    onSelect(page - 1)
                }
                Spacer(minLength: 4)
                HStack(spacing: 6) {
                    ForEach(Array(tokens.enumerated()), id: \.offset) { _, token in
                        if let token {
                            pageChip(token)
                        } else {
                            Button {
                                jumpText = String(page)
                                jumpOpen = true
                            } label: {
                                Text("…")
                                    .font(.subheadline.weight(.bold))
                                    .foregroundStyle(Brand.muted(colorScheme))
                                    .frame(minWidth: 32, minHeight: 32)
                            }
                            .buttonStyle(.plain)
                            .disabled(loading)
                            .accessibilityLabel("Go to page")
                        }
                    }
                }
                Spacer(minLength: 4)
                stepButton(
                    systemName: "chevron.right",
                    enabled: page < pages && !(totalCount == nil && rowCount < pageSize)
                ) {
                    onSelect(page + 1)
                }
            }
            .padding(.vertical, 4)
            .alert("Go to page", isPresented: $jumpOpen) {
                TextField("Page number", text: $jumpText)
                    .keyboardType(.numberPad)
                Button("Go") {
                    guard let next = Int(jumpText.trimmingCharacters(in: .whitespacesAndNewlines)),
                          (1...pages).contains(next) else { return }
                    onSelect(next)
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Enter a page between 1 and \(pages).")
            }
        }
    }

    private func pageChip(_ value: Int) -> some View {
        let selected = value == page
        return Button {
            onSelect(value)
        } label: {
            Text("\(value)")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(selected ? Brand.text(colorScheme) : Brand.action)
                .frame(minWidth: 32, minHeight: 32)
                .background {
                    if selected {
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(Color.primary.opacity(colorScheme == .dark ? 0.16 : 0.08))
                    }
                }
        }
        .buttonStyle(.plain)
        .disabled(loading || selected)
        .accessibilityLabel("Page \(value)")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private func stepButton(systemName: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.body.weight(.semibold))
                .frame(width: 36, height: 36)
        }
        .buttonStyle(.plain)
        .disabled(!enabled || loading)
        .opacity(enabled && !loading ? 1 : 0.35)
        .accessibilityLabel(systemName.contains("left") ? "Previous page" : "Next page")
    }
}

