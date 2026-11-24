import SwiftUI

/// Freytz-style segmented bar: frosted track + solid sliding pill + optional count discs.
struct PortalSegmentedBar: View {
    struct Item: Identifiable, Hashable {
        let id: String
        let title: String
        var count: Int? = nil
        var systemImage: String? = nil
    }

    let items: [Item]
    @Binding var selection: String
    var accent: Color = Brand.action
    var allowsEqualWidth = true
    var namespace: Namespace.ID? = nil

    @Environment(\.colorScheme) private var colorScheme
    @Namespace private var localNamespace

    private var geometry: Namespace.ID { namespace ?? localNamespace }

    var body: some View {
        Group {
            if allowsEqualWidth {
                bar
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    bar
                }
            }
        }
    }

    private var bar: some View {
        HStack(spacing: 0) {
            ForEach(items) { item in
                segment(item)
            }
        }
        .padding(3)
        .portalGlassCapsule(colorScheme)
    }

    @ViewBuilder
    private func segment(_ item: Item) -> some View {
        let active = selection == item.id
        Button {
            guard selection != item.id else { return }
            withAnimation(.spring(response: 0.3, dampingFraction: 0.88)) {
                selection = item.id
            }
        } label: {
            HStack(spacing: 5) {
                if let systemImage = item.systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 11, weight: .semibold))
                }
                Text(item.title)
                    .font(.system(size: 12, weight: active ? .bold : .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.78)
                if let count = item.count {
                    countDisc(count, title: item.title, active: active)
                }
            }
            .foregroundStyle(active ? Color.white : Brand.text(colorScheme).opacity(colorScheme == .dark ? 0.9 : 0.78))
            .padding(.horizontal, 11)
            .padding(.vertical, 8)
            .frame(maxWidth: allowsEqualWidth ? .infinity : nil)
            .background {
                if active {
                    Capsule(style: .continuous)
                        .fill(accent)
                        .matchedGeometryEffect(id: "portal-segment-thumb", in: geometry)
                        .shadow(color: Color.black.opacity(0.18), radius: 3, y: 1)
                }
            }
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(active ? [.isSelected] : [])
    }

    private func countDisc(_ count: Int, title: String, active: Bool) -> some View {
        let tone = countTone(for: title)
        let wide = count >= 100
        return Text("\(count)")
            .font(.system(size: 9, weight: .bold))
            .monospacedDigit()
            .foregroundStyle(active ? Color.white.opacity(0.95) : tone.foreground)
            .padding(.horizontal, wide ? 6 : 4)
            .padding(.vertical, 2)
            .frame(minWidth: wide ? 28 : 18, minHeight: 18)
            .background(
                Capsule(style: .continuous)
                    .fill(active ? Color.white.opacity(0.2) : tone.background)
            )
    }

    private func countTone(for title: String) -> (foreground: Color, background: Color) {
        let dark = colorScheme == .dark
        switch title.lowercased() {
        case "granted", "active":
            return (Color(hex: 0x6EE7B7), Color(hex: 0x34D399).opacity(dark ? 0.28 : 0.16))
        case "revoked", "expired":
            return (Color(hex: 0xFCA5A5), Color(hex: 0xF87171).opacity(dark ? 0.26 : 0.14))
        case "all":
            return (Color(hex: 0x93C5FD), Brand.action.opacity(dark ? 0.28 : 0.14))
        default:
            return (Brand.text(colorScheme).opacity(dark ? 0.92 : 0.75), Color.white.opacity(dark ? 0.14 : 0.1))
        }
    }
}

/// Shared capsule chrome for segmented bars + search — liquid glass like system toolbar chips.
struct PortalGlassCapsuleModifier: ViewModifier {
    var colorScheme: ColorScheme

    func body(content: Content) -> some View {
        let dark = colorScheme == .dark
        return content
            // True translucency: no opaque white wash (that made tabs look milky gray).
            .glassEffect(
                .regular.tint(Color.white.opacity(dark ? 0.05 : 0.14)),
                in: Capsule(style: .continuous)
            )
            .overlay {
                Capsule(style: .continuous)
                    .strokeBorder(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(dark ? 0.52 : 0.72),
                                Color.white.opacity(dark ? 0.12 : 0.28)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 0.85
                    )
            }
    }
}

extension View {
    func portalGlassCapsule(_ scheme: ColorScheme) -> some View {
        modifier(PortalGlassCapsuleModifier(colorScheme: scheme))
    }
}
