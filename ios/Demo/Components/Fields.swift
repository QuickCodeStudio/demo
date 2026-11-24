import PhotosUI
import SwiftUI
import UIKit
import UniformTypeIdentifiers

struct FieldLabel<Content: View>: View {
    let label: String
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
            content()
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
    }
}

struct EmailField: View {
    let label: String
    @Binding var text: String

    var body: some View {
        FieldLabel(label: label) {
            TextField(label, text: $text)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
        }
    }
}

struct PhoneField: View {
    let label: String
    @Binding var text: String

    var body: some View {
        FieldLabel(label: label) {
            TextField(label, text: $text)
                .textContentType(.telephoneNumber)
                .keyboardType(.phonePad)
        }
    }
}

struct UrlField: View {
    let label: String
    @Binding var text: String

    var body: some View {
        FieldLabel(label: label) {
            TextField(label, text: $text)
                .textContentType(.URL)
                .keyboardType(.URL)
                .textInputAutocapitalization(.never)
        }
    }
}

struct LabeledSecureField: View {
    let label: String
    @Binding var text: String

    var body: some View {
        FieldLabel(label: label) {
            SecureField(label, text: $text)
                .textContentType(.password)
        }
    }
}

struct SelectField: View {
    let label: String
    let options: [(id: String, name: String)]
    @Binding var selection: String
    @State private var open = false
    @State private var sheetDetent: PresentationDetent = .large

    private var selectedName: String {
        options.first { $0.id == selection }?.name ?? "Select"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
            Button {
                sheetDetent = .large
                open = true
            } label: {
                HStack(spacing: 10) {
                    Text(selectedName)
                        .font(.body.weight(.medium))
                        .foregroundStyle(selection.isEmpty ? .secondary : .primary)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(label), \(selectedName)")
        }
        .sheet(isPresented: $open) {
            SelectSheet(label: label, options: options, selection: $selection)
                .portalSheetPresentation($sheetDetent, detents: [.large, .height(sheetHeight)])
                .presentationBackgroundInteraction(.disabled)
        }
    }

    private var sheetHeight: CGFloat {
        let rows = CGFloat(min(options.count + 1, 8))
        return min(520, 168 + rows * 52)
    }
}

/// Form FK field — loads ref-table rows and opens the same searchable combo sheet as web Portal.
struct PortalForeignKeyField: View {
    let label: String
    let module: String
    let model: String
    @Binding var text: String
    var systemImage = "list.bullet.rectangle"

    @Environment(SessionStore.self) private var session
    @State private var options: [(id: Int32, label: String)] = []
    @State private var loading = false
    @State private var selection: Int32?

    var body: some View {
        PortalLookupCombo(
            title: label,
            options: options,
            selection: Binding(
                get: { selection ?? Int32(text) },
                set: { next in
                    selection = next
                    text = next.map(String.init) ?? ""
                }
            ),
            isLoadingOptions: loading,
            systemImage: systemImage
        )
        .task(id: module + "/" + model) {
            await loadOptions()
        }
        .onChange(of: text) { _, newValue in
            selection = Int32(newValue)
        }
    }

    private func loadOptions() async {
        loading = true
        defer { loading = false }
        do {
            let data = try await session.collectionData(module: module, model: model, page: 1, size: 500)
            let records = Self.decodeRecords(data)
            options = records.compactMap { record -> (id: Int32, label: String)? in
                guard let id = Self.recordId(record), let intId = Int32(id) else { return nil }
                let title = Self.displayTitle(record) ?? id
                return (intId, title)
            }
            .sorted { $0.label.localizedCaseInsensitiveCompare($1.label) == .orderedAscending }
            if selection == nil {
                selection = Int32(text)
            }
        } catch {
            options = []
        }
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
        if let pair = record.first(where: { $0.key.caseInsensitiveCompare("id") == .orderedSame }) {
            if let number = pair.value as? NSNumber { return number.stringValue }
            if let int = pair.value as? Int { return String(int) }
            if let text = pair.value as? String {
                let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
                return trimmed.isEmpty ? nil : trimmed
            }
        }
        return nil
    }

    private static func displayTitle(_ record: [String: Any]) -> String? {
        for name in ["name", "title", "text", "label", "displayName", "displayname"] {
            if let value = short(record.first { $0.key.caseInsensitiveCompare(name) == .orderedSame }?.value) {
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
        guard !trimmed.isEmpty, trimmed.count < 160 else { return nil }
        return trimmed
    }
}

/// Liquid-glass filter combo for list screens (picker filterBindings).
/// Closed chip + searchable sheet; `isRefreshing` drives selection-change loading.
struct PortalLookupCombo: View {
    let title: String
    let options: [(id: Int32, label: String)]
    @Binding var selection: Int32?
    var isLoadingOptions = false
    var isRefreshing = false
    var placeholder = "Choose"
    var systemImage = "person.crop.circle"

    @Environment(\.colorScheme) private var colorScheme
    @State private var open = false
    @State private var sheetDetent: PresentationDetent = .large

    private var selectedLabel: String {
        guard let selection else { return placeholder }
        return options.first { $0.id == selection }?.label ?? "\(title) \(selection)"
    }

    var body: some View {
        Button {
            guard !isLoadingOptions else { return }
            sheetDetent = .large
            open = true
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Brand.action.opacity(colorScheme == .dark ? 0.22 : 0.12))
                        .frame(width: 44, height: 44)
                    if isLoadingOptions || isRefreshing {
                        ProgressView()
                            .controlSize(.small)
                            .tint(Brand.action)
                    } else {
                        Image(systemName: systemImage)
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(Brand.action)
                            .symbolEffect(.pulse, options: .repeating, isActive: isRefreshing)
                    }
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(title.uppercased())
                        .font(.caption2.weight(.bold))
                        .tracking(0.8)
                        .foregroundStyle(Brand.muted(colorScheme))
                    Text(selectedLabel)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(Brand.text(colorScheme))
                        .lineLimit(1)
                        .contentTransition(.numericText())
                        .animation(.snappy(duration: 0.28), value: selection)
                }

                Spacer(minLength: 0)

                Image(systemName: "chevron.up.chevron.down")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Brand.muted(colorScheme))
                    .padding(8)
                    .background(Color.primary.opacity(colorScheme == .dark ? 0.1 : 0.05), in: Circle())
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .contentShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .glassEffect(
                .regular.tint(Brand.action.opacity(colorScheme == .dark ? 0.08 : 0.04)),
                in: RoundedRectangle(cornerRadius: 20, style: .continuous)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .strokeBorder(Brand.action.opacity(colorScheme == .dark ? 0.28 : 0.16), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
        .disabled(isLoadingOptions)
        .accessibilityLabel("\(title), \(selectedLabel)")
        .sheet(isPresented: $open) {
            PortalLookupSheet(
                title: title,
                options: options,
                selection: $selection
            )
            .portalSheetPresentation($sheetDetent, detents: [.large, .height(sheetHeight)])
            .presentationBackgroundInteraction(.disabled)
        }
    }

    /// Fit search + option rows; avoid `.medium` clipping the glass list card.
    private var sheetHeight: CGFloat {
        let rows = CGFloat(min(max(options.count, 1), 8))
        return min(560, 200 + rows * 56)
    }
}

private struct PortalLookupSheet: View {
    let title: String
    let options: [(id: Int32, label: String)]
    @Binding var selection: Int32?
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    @State private var query = ""

    private var rows: [(id: Int32, label: String)] {
        let text = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return options }
        return options.filter {
            $0.label.localizedStandardContains(text)
                || String($0.id).localizedStandardContains(text)
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                PortalSearchField(placeholder: "Search \(title.lowercased())", text: $query)
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 14)

                ScrollView {
                    LazyVStack(spacing: 0) {
                        if rows.isEmpty {
                            Text(query.isEmpty ? "No options" : "No matches")
                                .font(.subheadline)
                                .foregroundStyle(Brand.muted(colorScheme))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(18)
                        } else {
                            ForEach(Array(rows.enumerated()), id: \.element.id) { index, option in
                                choice(option)
                                if index < rows.count - 1 {
                                    Divider().opacity(0.22).padding(.leading, 18)
                                }
                            }
                        }
                    }
                    .glassEffect(.regular.tint(Color.primary.opacity(0.02)), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
                .scrollDismissesKeyboard(.interactively)
            }
            .background(Color.clear)
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .background {
            ComboGlass()
            ComboSheetClear()
        }
        .presentationBackground {
            ComboGlass()
        }
    }

    private func choice(_ option: (id: Int32, label: String)) -> some View {
        let selected = selection == option.id
        return Button {
            selection = option.id
            dismiss()
        } label: {
            HStack(spacing: 14) {
                Text(option.label)
                    .font(.body.weight(selected ? .semibold : .regular))
                    .foregroundStyle(Brand.text(colorScheme))
                    .lineLimit(1)
                Spacer(minLength: 0)
                if selected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(Brand.action)
                        .symbolEffect(.bounce, value: selected)
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 15)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

private struct SelectSheet: View {
    let label: String
    let options: [(id: String, name: String)]
    @Binding var selection: String
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    @State private var query = ""

    private var rows: [(id: String, name: String)] {
        let text = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return options }
        return options.filter { $0.name.localizedStandardContains(text) }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                PortalSearchField(text: $query)
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 14)

                ScrollView {
                    LazyVStack(spacing: 0) {
                        if query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            choice(id: "", name: "None")
                            if !rows.isEmpty {
                                Divider().opacity(0.22).padding(.leading, 18)
                            }
                        }
                        if rows.isEmpty {
                            Text("No matches")
                                .font(.subheadline)
                                .foregroundStyle(Brand.muted(colorScheme))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(18)
                        } else {
                            ForEach(Array(rows.enumerated()), id: \.element.id) { index, option in
                                choice(id: option.id, name: option.name)
                                if index < rows.count - 1 {
                                    Divider().opacity(0.22).padding(.leading, 18)
                                }
                            }
                        }
                    }
                    .glassEffect(.regular.tint(Color.primary.opacity(0.02)), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
                .scrollDismissesKeyboard(.interactively)
            }
            .background(Color.clear)
            .navigationTitle(label.capitalized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .background {
            ComboGlass()
            ComboSheetClear()
        }
        .presentationBackground {
            ComboGlass()
        }
    }

    private func choice(id: String, name: String) -> some View {
        let selected = selection == id
        return Button {
            selection = id
            dismiss()
        } label: {
            HStack(spacing: 14) {
                Text(name)
                    .font(.body.weight(selected ? .semibold : .regular))
                    .foregroundStyle(Brand.text(colorScheme))
                    .lineLimit(1)
                Spacer(minLength: 0)
                if selected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(Brand.action)
                        .symbolEffect(.bounce, value: selected)
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 15)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

private struct ComboGlass: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Rectangle()
            .fill(.clear)
            .glassEffect(
                .regular.tint(Brand.background(colorScheme).opacity(colorScheme == .dark ? 0.42 : 0.28)),
                in: Rectangle()
            )
            .ignoresSafeArea()
    }
}

private struct ComboSheetClear: UIViewRepresentable {
    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.isUserInteractionEnabled = false
        view.backgroundColor = .clear
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        DispatchQueue.main.async {
            var current = uiView.superview
            var hops = 0
            while let next = current, hops < 6 {
                next.backgroundColor = .clear
                current = next.superview
                hops += 1
            }
        }
    }
}

struct SwitchField: View {
    let label: String
    @Binding var isOn: Bool

    var body: some View {
        Toggle(label, isOn: $isOn)
            .font(.body.weight(.medium))
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct LongTextField: View {
    let label: String
    @Binding var text: String

    var body: some View {
        FieldLabel(label: label) {
            TextEditor(text: $text)
                .font(.body)
                .frame(minHeight: 140)
                .scrollContentBackground(.hidden)
        }
    }
}

struct JsonField: View {
    let label: String
    @Binding var text: String
    var yaml = false

    private var invalid: Bool {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        return !yaml && !trimmed.isEmpty && !Self.isValid(trimmed)
    }

    var body: some View {
        FieldLabel(label: label) {
            VStack(alignment: .leading, spacing: 6) {
                TextEditor(text: $text)
                    .font(.system(.footnote, design: .monospaced))
                    .frame(minHeight: 180)
                    .scrollContentBackground(.hidden)
                if invalid {
                    Text("This is not valid JSON.")
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }
        }
    }

    static func isValid(_ text: String) -> Bool {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return true }
        guard let data = trimmed.data(using: .utf8) else { return false }
        return (try? JSONSerialization.jsonObject(with: data)) != nil
    }
}

struct DateField: View {
    let label: String
    @Binding var date: Date

    var body: some View {
        DatePicker(label, selection: $date)
            .font(.body.weight(.medium))
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct NumberField: View {
    let label: String
    @Binding var text: String
    var decimal = false

    var body: some View {
        FieldLabel(label: label) {
            TextField(label, text: $text)
                .keyboardType(decimal ? .decimalPad : .numberPad)
        }
    }
}

struct ImageUrlField: View {
    let label: String
    @Binding var text: String

    var body: some View {
        MediaUploadField(label: label, kind: .image, text: $text)
    }
}

struct FileUrlField: View {
    let label: String
    @Binding var text: String
    var symbol = "doc"
    var kind: MediaKind? = nil

    var body: some View {
        MediaUploadField(label: label, kind: kind ?? inferredKind, text: $text)
    }

    private var inferredKind: MediaKind {
        switch symbol {
        case "play.rectangle": return .video
        case "doc.richtext": return .pdf
        default: return .file
        }
    }
}

struct MediaUploadField: View {
    let label: String
    let kind: MediaKind
    @Binding var text: String
    @Environment(SessionStore.self) private var session

    @State private var busy = false
    @State private var failure: String?
    @State private var photoItem: PhotosPickerItem?
    @State private var fileImporterOpen = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            preview
            HStack(spacing: 10) {
                pickButton
                if !text.isEmpty {
                    Button("Clear", role: .destructive) {
                        text = ""
                        failure = nil
                    }
                    .buttonStyle(.bordered)
                    .disabled(busy)
                }
                if busy {
                    ProgressView()
                }
            }
            if let failure {
                Text(failure)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
            UrlField(label: label, text: $text)
                .disabled(busy)
        }
        .onChange(of: photoItem) { _, item in
            guard let item else { return }
            Task { await uploadPhoto(item) }
        }
        .fileImporter(
            isPresented: $fileImporterOpen,
            allowedContentTypes: kind.contentTypes,
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case .success(let urls):
                guard let url = urls.first else { return }
                Task { await uploadFile(url) }
            case .failure(let error):
                failure = PortalErrors.record(error)
            }
        }
    }

    @ViewBuilder
    private var preview: some View {
        switch kind {
        case .image:
            if remoteMediaURL(text) != nil {
                ImagePreview(url: text, enablesLightbox: true)
                    .frame(height: 180)
                    .frame(maxWidth: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
        case .pdf:
            PdfPreview(url: remoteMediaURL(text))
        case .video:
            VideoPreview(url: remoteMediaURL(text))
        case .file:
            FilePreview(url: remoteMediaURL(text))
        }
    }

    @ViewBuilder
    private var pickButton: some View {
        if kind == .image {
            PhotosPicker(selection: $photoItem, matching: .images, photoLibrary: .shared()) {
                Label(text.isEmpty ? "Upload photo" : "Replace", systemImage: "photo.badge.plus")
            }
            .buttonStyle(.borderedProminent)
            .disabled(busy)
        } else {
            Button {
                fileImporterOpen = true
            } label: {
                Label(text.isEmpty ? "Upload \(kind.rawValue)" : "Replace", systemImage: "square.and.arrow.up")
            }
            .buttonStyle(.borderedProminent)
            .disabled(busy)
        }
    }

    private func uploadPhoto(_ item: PhotosPickerItem) async {
        busy = true
        failure = nil
        defer { busy = false; photoItem = nil }
        do {
            guard let data = try await item.loadTransferable(type: Data.self) else {
                failure = "Could not read the photo."
                return
            }
            try validate(size: data.count)
            let url = try await MediaUploadClient.upload(
                data: data,
                fileName: "photo.jpg",
                contentType: "image/jpeg",
                token: session.token,
                apiKey: session.access == .apiKey
            )
            text = url
        } catch {
            failure = PortalErrors.record(error)
        }
    }

    private func uploadFile(_ url: URL) async {
        busy = true
        failure = nil
        defer { busy = false }
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        do {
            let data = try Data(contentsOf: url)
            try validate(size: data.count)
            let mime = mimeType(for: url) ?? "application/octet-stream"
            let remote = try await MediaUploadClient.upload(
                data: data,
                fileName: url.lastPathComponent,
                contentType: mime,
                token: session.token,
                apiKey: session.access == .apiKey
            )
            text = remote
        } catch {
            failure = PortalErrors.record(error)
        }
    }

    private func validate(size: Int) throws {
        guard size > 0 else { throw GatewayError(message: "Empty file.", status: 400) }
        guard size <= kind.maxBytes else {
            let mb = kind.maxBytes / (1024 * 1024)
            throw GatewayError(message: "File is too large. Maximum is \(mb) MB.", status: 400)
        }
    }

    private func mimeType(for url: URL) -> String? {
        if let type = UTType(filenameExtension: url.pathExtension) {
            return type.preferredMIMEType
        }
        return nil
    }
}

enum PortalNumber {
    static func integer(_ value: Double) -> String {
        value.rounded() == value ? String(Int(value)) : decimal(value)
    }

    static func integer(_ value: Int) -> String { String(value) }
    static func integer(_ value: Int32) -> String { String(value) }
    static func integer(_ value: Int64) -> String { String(value) }

    static func decimal(_ value: Double) -> String {
        value.formatted(.number.precision(.fractionLength(0...2)))
    }
}

struct PortalValue: Identifiable, Hashable {
    enum Kind: String, Hashable {
        case text, long, json, html, bool, email, phone, url, date, number, integer, decimal, image, pdf, video, file, geo
    }

    let id: String
    let label: String
    let text: String
    let kind: Kind
    var quiet = false
}

struct PortalValueList: View {
    let values: [PortalValue]
    /// When true, omit fields already shown in the record header (status / title / metric).
    var hiding: Set<String> = []
    @Environment(\.colorScheme) private var colorScheme

    private var visible: [PortalValue] {
        // Keep table/API column order. Quiet only mutes id/FK styling — it must not reorder.
        values.filter { value in
            !hiding.contains(value.id)
                && !hiding.contains(value.label)
        }
    }

    var body: some View {
        if !visible.isEmpty {
            VStack(alignment: .leading, spacing: 22) {
                Text("Details")
                    .font(.caption2.weight(.bold))
                    .tracking(1.2)
                    .foregroundStyle(Brand.muted(colorScheme))

                VStack(alignment: .leading, spacing: 18) {
                    ForEach(Array(visible.enumerated()), id: \.element.id) { index, value in
                        PortalValueView(value: value)
                        if index < visible.count - 1 {
                            Rectangle()
                                .fill(Color.primary.opacity(colorScheme == .dark ? 0.08 : 0.06))
                                .frame(height: 1)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct PortalValueView: View {
    let value: PortalValue
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        switch value.kind {
        case .image:
            VStack(alignment: .leading, spacing: 8) {
                fieldTitle
                if remoteMediaURL(value.text) != nil {
                    ImagePreview(url: value.text, enablesLightbox: true, showsPlaceholderWhenEmpty: false)
                        .frame(height: 180)
                        .frame(maxWidth: .infinity)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                } else {
                    Text("No image")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.secondary)
                        .allowsHitTesting(false)
                }
            }
        case .pdf:
            VStack(alignment: .leading, spacing: 8) {
                fieldTitle
                PdfPreview(url: value.text)
            }
        case .video:
            VStack(alignment: .leading, spacing: 8) {
                fieldTitle
                VideoPreview(url: value.text)
            }
        case .json:
            VStack(alignment: .leading, spacing: 8) {
                fieldTitle
                Text(Self.pretty(value.text))
                    .font(.system(.footnote, design: .monospaced))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
        case .html:
            VStack(alignment: .leading, spacing: 8) {
                fieldTitle
                Text(Self.html(value.text))
                    .font(.body)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        case .long, .geo:
            VStack(alignment: .leading, spacing: 8) {
                fieldTitle
                Text(displayText)
                    .font(.body)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        case .file:
            VStack(alignment: .leading, spacing: 8) {
                fieldTitle
                FilePreview(url: value.text)
            }
        case .url, .email, .phone:
            labeled {
                if value.kind == .url, let link = URL(string: value.text), link.scheme == "http" || link.scheme == "https" {
                    Link(value.text, destination: link)
                } else {
                    Text(displayText)
                        .fontWeight(.semibold)
                }
            }
        case .bool:
            labeled {
                Text(displayText)
                    .fontWeight(.semibold)
            }
        case .decimal, .number:
            VStack(alignment: .leading, spacing: 5) {
                fieldTitle
                Text(displayText)
                    .font(.title3.weight(.semibold))
                    .monospacedDigit()
                    .foregroundStyle(value.quiet ? Brand.muted(colorScheme) : Brand.text(colorScheme))
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        case .text, .date, .integer:
            VStack(alignment: .leading, spacing: 5) {
                fieldTitle
                Text(displayText)
                    .font(value.quiet ? .subheadline.weight(.medium) : .body.weight(.semibold))
                    .foregroundStyle(value.quiet ? Brand.muted(colorScheme) : Brand.text(colorScheme))
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private var displayText: String {
        if value.text.isEmpty { return "—" }
        switch value.kind {
        case .integer:
            return Self.formatInteger(value.text)
        case .decimal, .number:
            return Self.formatDecimal(value.text)
        default:
            return value.text
        }
    }

    private var fieldTitle: some View {
        Text(value.label.uppercased())
            .font(.caption2.weight(.bold))
            .tracking(0.9)
            .foregroundStyle(Brand.muted(colorScheme))
    }

    private func labeled<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            fieldTitle
            content()
                .foregroundStyle(value.quiet ? Brand.muted(colorScheme) : Brand.text(colorScheme))
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private static func formatInteger(_ text: String) -> String {
        guard let value = Double(text.replacingOccurrences(of: ",", with: ".")) else { return text }
        return PortalNumber.integer(value)
    }

    private static func formatDecimal(_ text: String) -> String {
        guard let value = Double(text.replacingOccurrences(of: ",", with: ".")) else { return text }
        return PortalNumber.decimal(value)
    }

    private static func pretty(_ text: String) -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, let data = trimmed.data(using: .utf8),
              let object = try? JSONSerialization.jsonObject(with: data),
              let pretty = try? JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys]),
              let shown = String(data: pretty, encoding: .utf8) else {
            return trimmed.isEmpty ? "—" : text
        }
        return shown
    }

    private static func html(_ text: String) -> AttributedString {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, let data = trimmed.data(using: .utf8),
              let rendered = try? NSAttributedString(
                data: data,
                options: [.documentType: NSAttributedString.DocumentType.html, .characterEncoding: String.Encoding.utf8.rawValue],
                documentAttributes: nil
              ) else {
            return AttributedString(trimmed.isEmpty ? "—" : text)
        }
        return AttributedString(rendered)
    }
}
