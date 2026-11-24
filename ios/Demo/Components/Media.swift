import AVKit
import PDFKit
import SwiftUI
import UniformTypeIdentifiers

func remoteMediaURL(_ value: String?) -> String? {
    guard let value, let url = URL(string: value), url.scheme == "http" || url.scheme == "https" else { return nil }
    return value
}

enum MediaKind: String, Hashable {
    case image, pdf, video, file

    var systemName: String {
        switch self {
        case .image: return "photo"
        case .pdf: return "doc.richtext"
        case .video: return "play.rectangle"
        case .file: return "doc"
        }
    }

    var previewLabel: String {
        switch self {
        case .image: return "Preview image"
        case .pdf: return "Preview PDF"
        case .video: return "Preview video"
        case .file: return "Open file"
        }
    }

    var maxBytes: Int64 {
        switch self {
        case .image: return 5 * 1024 * 1024
        case .pdf, .file: return 10 * 1024 * 1024
        case .video: return 20 * 1024 * 1024
        }
    }

    var contentTypes: [UTType] {
        switch self {
        case .image: return [.image]
        case .pdf: return [.pdf]
        case .video: return [.movie, .video, .mpeg4Movie, .quickTimeMovie]
        case .file: return [.data, .pdf, .image, .movie]
        }
    }
}

/// Identifiable payload so each lightbox bind to the tapped URL (avoids shared isPresented reuse).
struct PortalMediaItem: Identifiable, Hashable {
    let url: String
    let kind: MediaKind
    var id: String { "\(kind.rawValue)|\(url)" }

    init(url: String, kind: MediaKind) {
        self.url = url
        self.kind = kind
    }
}

struct ImagePreview: View {
    let url: String?
    var enablesLightbox = false
    /// List/card thumbs keep a soft placeholder; detail fields show "No image" instead.
    var showsPlaceholderWhenEmpty = true

    @State private var lightbox: PortalMediaItem?

    private var resolved: String? { remoteMediaURL(url) }

    var body: some View {
        Group {
            if let resolved {
                // Fill the caller’s frame only — scaledToFill must not expand the hit target below.
                let preview = AsyncImage(url: URL(string: resolved)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
                            .clipped()
                    case .failure:
                        ZStack {
                            Color.primary.opacity(0.06)
                            Image(systemName: "photo")
                                .foregroundStyle(.secondary)
                        }
                    default:
                        ZStack {
                            Color.primary.opacity(0.06)
                            ProgressView()
                        }
                    }
                }
                .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
                .clipped()
                .contentShape(Rectangle())

                if enablesLightbox {
                    Button {
                        lightbox = PortalMediaItem(url: resolved, kind: .image)
                    } label: {
                        preview
                    }
                    .buttonStyle(.plain)
                    .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
                    .contentShape(Rectangle())
                    .clipped()
                    .fullScreenCover(item: $lightbox) { item in
                        MediaLightbox(url: item.url, kind: item.kind)
                            .id(item.id)
                    }
                } else {
                    preview
                }
            } else if enablesLightbox || !showsPlaceholderWhenEmpty {
                Label("No image", systemImage: "photo")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .allowsHitTesting(false)
            } else {
                ZStack {
                    LinearGradient(
                        colors: [Color.accentColor.opacity(0.35), Color.accentColor.opacity(0.08)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    Image(systemName: "photo")
                        .font(.title2)
                        .foregroundStyle(.secondary)
                }
                .allowsHitTesting(false)
            }
        }
        .id(resolved ?? "empty-image")
    }
}

struct PdfPreview: View {
    let url: String?

    @State private var lightbox: PortalMediaItem?

    var body: some View {
        if let resolved = remoteMediaURL(url) {
            Button {
                lightbox = PortalMediaItem(url: resolved, kind: .pdf)
            } label: {
                Label(MediaKind.pdf.previewLabel, systemImage: MediaKind.pdf.systemName)
            }
            .buttonStyle(.bordered)
            .fullScreenCover(item: $lightbox) { item in
                MediaLightbox(url: item.url, kind: item.kind)
                    .id(item.id)
            }
        } else {
            Label("No file", systemImage: "doc")
                .foregroundStyle(.secondary)
                .allowsHitTesting(false)
        }
    }
}

struct VideoPreview: View {
    let url: String?

    @State private var lightbox: PortalMediaItem?

    var body: some View {
        if let resolved = remoteMediaURL(url) {
            Button {
                lightbox = PortalMediaItem(url: resolved, kind: .video)
            } label: {
                Label(MediaKind.video.previewLabel, systemImage: MediaKind.video.systemName)
            }
            .buttonStyle(.bordered)
            .fullScreenCover(item: $lightbox) { item in
                MediaLightbox(url: item.url, kind: item.kind)
                    .id(item.id)
            }
        } else {
            Label("No video", systemImage: "play.rectangle")
                .foregroundStyle(.secondary)
                .allowsHitTesting(false)
        }
    }
}

struct FilePreview: View {
    let url: String?

    var body: some View {
        if let url, let link = URL(string: url), remoteMediaURL(url) != nil {
            Link(destination: link) {
                Label("Open", systemImage: "arrow.up.right.square")
            }
            .buttonStyle(.bordered)
        } else {
            Label("No file", systemImage: "doc")
                .foregroundStyle(.secondary)
                .allowsHitTesting(false)
        }
    }
}

struct MediaLightbox: View {
    let url: String
    let kind: MediaKind
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                switch kind {
                case .image:
                    ZoomableRemoteImage(url: url)
                        .id(url)
                case .pdf:
                    PdfDocumentView(url: url)
                        .id(url)
                case .video:
                    if let link = URL(string: url) {
                        VideoPlayer(player: AVPlayer(url: link))
                            .ignoresSafeArea(edges: .bottom)
                            .id(url)
                    } else {
                        ContentUnavailableView("Video unavailable", systemImage: "play.slash")
                    }
                case .file:
                    if let link = URL(string: url) {
                        Link(destination: link) {
                            Label("Open in browser", systemImage: "safari")
                                .font(.headline)
                        }
                    } else {
                        ContentUnavailableView("File unavailable", systemImage: "doc")
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.black.opacity(kind == .image || kind == .video ? 0.92 : 0.04))
            .navigationTitle(kind.previewLabel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                if let link = URL(string: url) {
                    ToolbarItem(placement: .primaryAction) {
                        ShareLink(item: link)
                    }
                }
            }
        }
    }
}

private struct ZoomableRemoteImage: View {
    let url: String
    @State private var scale: CGFloat = 1

    var body: some View {
        AsyncImage(url: URL(string: url)) { phase in
            switch phase {
            case .success(let image):
                image
                    .resizable()
                    .scaledToFit()
                    .scaleEffect(scale)
                    .gesture(MagnifyGesture().onChanged { value in
                        scale = max(1, value.magnification)
                    })
                    .onTapGesture(count: 2) { scale = scale > 1 ? 1 : 2 }
            case .failure:
                ContentUnavailableView("Image unavailable", systemImage: "photo")
            default:
                ProgressView()
            }
        }
        .padding()
    }
}

private struct PdfDocumentView: UIViewRepresentable {
    let url: String

    func makeUIView(context: Context) -> PDFView {
        let view = PDFView()
        view.autoScales = true
        view.displayMode = .singlePageContinuous
        view.displayDirection = .vertical
        view.backgroundColor = .systemBackground
        if let link = URL(string: url) {
            view.document = PDFDocument(url: link)
        }
        return view
    }

    func updateUIView(_ uiView: PDFView, context: Context) {
        guard let link = URL(string: url) else { return }
        if uiView.document?.documentURL != link {
            uiView.document = PDFDocument(url: link)
        }
    }
}

struct GalleryView: View {
    let urls: [String]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(urls, id: \.self) { url in
                    ImagePreview(url: url, enablesLightbox: true)
                        .frame(width: 260, height: 180)
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                }
            }
        }
    }
}
