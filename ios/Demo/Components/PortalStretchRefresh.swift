import SwiftUI

/// Custom pull-to-refresh — no `UIRefreshControl` / system “sun” spinner.
///
/// - Pull chrome: rubber droplet → QcLoadingMark while still overscrolled.
/// - After snap-back, overlay hides; in-content loaders (e.g. dashboard charts)
///   own the remaining refresh affordance.
struct PortalStretchRefreshModifier: ViewModifier {
    var action: () async -> Void

    @State private var pull: CGFloat = 0
    @State private var refreshing = false
    @State private var armed = false

    private let threshold: CGFloat = 72

    func body(content: Content) -> some View {
        content
            .onScrollGeometryChange(for: CGFloat.self) { geometry in
                let y = geometry.contentOffset.y + geometry.contentInsets.top
                return max(0, -y)
            } action: { _, distance in
                pull = distance
                if !refreshing {
                    if distance >= threshold {
                        armed = true
                    } else if armed, distance < 12 {
                        // Released past threshold — fire once as rubber-band settles.
                        armed = false
                        Task { @MainActor in
                            await run()
                        }
                    }
                }
            }
            .overlay(alignment: .top) {
                if showChrome {
                    PortalRubberDropletChrome(
                        progress: progress,
                        stretch: stretchHeight,
                        refreshing: refreshing && pull > 20
                    )
                    .frame(height: stretchHeight)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 2)
                    .opacity(chromeOpacity)
                    .allowsHitTesting(false)
                }
            }
            // Intentionally NO `.refreshable` — that installs the system spinner.
    }

    private var showChrome: Bool { pull > 4 }

    private var progress: CGFloat {
        min(1.55, pull / threshold)
    }

    private var stretchHeight: CGFloat {
        guard pull > 4 else { return 0 }
        let t = min(1.35, pull / threshold)
        let eased = 1 - pow(1 - min(1, t), 2.15)
        return 12 + eased * 56
    }

    private var chromeOpacity: Double {
        pull < 4 ? 0 : min(1, Double((pull - 4) / 18))
    }

    @MainActor
    private func run() async {
        guard !refreshing else { return }
        refreshing = true
        await action()
        refreshing = false
        armed = false
    }
}

/// Teardrop that grows while pulling; swaps to QC mark only while still stretched.
struct PortalRubberDropletChrome: View {
    var progress: CGFloat
    var stretch: CGFloat
    var refreshing: Bool

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let p = max(0, min(1.5, progress))
        let bodyHeight = refreshing ? 48.0 : max(16, stretch * 0.7)
        let bodyWidth = refreshing ? 80.0 : max(22, 44 - p * 14)
        let tipHeight = refreshing ? 0.0 : max(0, (stretch - bodyHeight) * 0.5)

        ZStack(alignment: .top) {
            if !refreshing {
                Capsule(style: .continuous)
                    .fill(Brand.action.opacity(colorScheme == .dark ? 0.28 : 0.2))
                    .frame(width: bodyWidth + 28, height: bodyHeight + tipHeight + 20)
                    .blur(radius: 14)
                    .opacity(min(1, p) * 0.85)
                    .offset(y: 2)
            }

            VStack(spacing: -2) {
                ZStack {
                    if refreshing {
                        QcLoadingMark(width: 52, showsStream: true, label: nil)
                            .frame(width: 80, height: 48)
                    } else {
                        Capsule(style: .continuous)
                            .fill(
                                LinearGradient(
                                    colors: [
                                        Color(hex: 0x6BA3FF),
                                        Brand.action,
                                        Color(hex: 0x2A5FD4)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .overlay {
                                Capsule(style: .continuous)
                                    .strokeBorder(Color.white.opacity(0.35), lineWidth: 0.8)
                            }
                            .overlay {
                                Image(systemName: "arrow.down")
                                    .font(.system(size: 11 + min(1, p) * 3, weight: .bold))
                                    .foregroundStyle(.white.opacity(0.95))
                                    .rotationEffect(.degrees(Double(min(1, p)) * 180))
                                    .opacity(min(1, p * 1.15))
                            }
                            .frame(width: bodyWidth, height: bodyHeight)
                    }
                }

                if tipHeight > 4 {
                    PortalDropletTip()
                        .fill(
                            LinearGradient(
                                colors: [Brand.action, Color(hex: 0x2A5FD4)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .frame(width: max(8, bodyWidth * 0.55), height: tipHeight)
                        .opacity(min(1, (p - 0.25) * 1.4))
                }
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: max(0, stretch))
        .accessibilityLabel(refreshing ? "Refreshing" : "Pull to refresh")
    }
}

private struct PortalDropletTip: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addQuadCurve(
            to: CGPoint(x: rect.midX, y: rect.maxY),
            control: CGPoint(x: rect.minX + rect.width * 0.15, y: rect.maxY * 0.35)
        )
        path.addQuadCurve(
            to: CGPoint(x: rect.maxX, y: rect.minY),
            control: CGPoint(x: rect.maxX - rect.width * 0.15, y: rect.maxY * 0.35)
        )
        path.closeSubpath()
        return path
    }
}

extension View {
    /// Apply on a `ScrollView`. Custom pull chrome only — no system refresh spinner.
    func portalStretchRefresh(action: @escaping () async -> Void) -> some View {
        modifier(PortalStretchRefreshModifier(action: action))
    }
}
