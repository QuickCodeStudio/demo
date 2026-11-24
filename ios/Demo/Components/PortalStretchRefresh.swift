import SwiftUI

/// Stretchy pull-to-refresh chrome.
/// Visuals are overlay-only (never change scroll insets — that caused the page to jitter).
/// The pull gesture itself uses system `.refreshable` so rubber-banding stays stable.
struct PortalStretchRefreshModifier: ViewModifier {
    var action: () async -> Void

    @State private var pull: CGFloat = 0
    @State private var refreshing = false

    private let threshold: CGFloat = 72

    func body(content: Content) -> some View {
        content
            .onScrollGeometryChange(for: CGFloat.self) { geometry in
                // Overscroll above the top edge (negative content offset past insets).
                let y = geometry.contentOffset.y + geometry.contentInsets.top
                return max(0, -y)
            } action: { _, distance in
                // Visual only — do not mutate layout from this callback.
                if refreshing {
                    pull = max(distance, threshold)
                } else {
                    pull = distance
                }
            }
            .overlay(alignment: .top) {
                PortalRubberDropletChrome(
                    progress: progress,
                    stretch: stretchHeight,
                    refreshing: refreshing
                )
                .frame(height: max(stretchHeight, refreshing ? 64 : 0))
                .frame(maxWidth: .infinity)
                .padding(.top, refreshing ? 6 : 2)
                .opacity(chromeOpacity)
                .allowsHitTesting(false)
            }
            .refreshable {
                await run()
            }
    }

    private var progress: CGFloat {
        if refreshing { return 1.2 }
        return min(1.55, pull / threshold)
    }

    private var stretchHeight: CGFloat {
        if refreshing { return 64 }
        guard pull > 4 else { return 0 }
        let t = min(1.35, pull / threshold)
        let eased = 1 - pow(1 - min(1, t), 2.15)
        return 12 + eased * 56
    }

    private var chromeOpacity: Double {
        if refreshing { return 1 }
        return pull < 4 ? 0 : min(1, Double((pull - 4) / 18))
    }

    @MainActor
    private func run() async {
        guard !refreshing else { return }
        refreshing = true
        pull = threshold
        // Keep work off the refreshable cancellation path when the control dismisses.
        let work = Task { @MainActor in
            await action()
        }
        await work.value
        refreshing = false
        pull = 0
    }
}

/// Teardrop that grows taller / thinner as you pull, then snaps into the QuickCode mark.
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

/// Pointed teardrop tip under the capsule body.
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
    /// Apply on a `ScrollView`. Overlay chrome + system pull gesture (stable, no inset feedback).
    func portalStretchRefresh(action: @escaping () async -> Void) -> some View {
        modifier(PortalStretchRefreshModifier(action: action))
    }
}
