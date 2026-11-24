import SwiftUI

/// 2027-style choice surface: large glass tiles, full-row hit targets, light motion.
/// Prefer this over dense Settings-style checkmark lists for short discrete sets.
struct PortalChoiceRail: View {
    struct Option: Identifiable, Hashable {
        let id: String
        let title: String
        var detail: String? = nil
        var symbol: String
        var tone: Color = Brand.action
    }

    let title: String
    var subtitle: String? = nil
    let options: [Option]
    var selectedId: String? = nil
    let onSelect: (Option) -> Void
    var onClose: (() -> Void)? = nil

    @Environment(\.colorScheme) private var colorScheme
    @State private var pressedId: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
                .padding(.horizontal, 22)
                .padding(.top, 8)
                .padding(.bottom, 18)

            ScrollView {
                LazyVStack(spacing: 10) {
                    ForEach(options) { option in
                        tile(option)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 28)
            }
            .scrollIndicators(.hidden)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(Brand.text(colorScheme))
                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(Brand.muted(colorScheme))
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: 0)
            if let onClose {
                Button(action: onClose) {
                    Image(systemName: "xmark")
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(Brand.muted(colorScheme))
                        .frame(width: 32, height: 32)
                        .background {
                            Circle()
                                .fill(Color.primary.opacity(colorScheme == .dark ? 0.12 : 0.06))
                        }
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Close")
            }
        }
    }

    private func tile(_ option: Option) -> some View {
        let selected = option.id == selectedId
        let pressed = pressedId == option.id
        return Button {
            withAnimation(.spring(response: 0.34, dampingFraction: 0.78)) {
                pressedId = option.id
            }
            onSelect(option)
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(option.tone.opacity(colorScheme == .dark ? 0.22 : 0.14))
                    Image(systemName: option.symbol)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(option.tone)
                }
                .frame(width: 44, height: 44)

                VStack(alignment: .leading, spacing: 2) {
                    Text(option.title)
                        .font(.body.weight(selected ? .semibold : .medium))
                        .foregroundStyle(Brand.text(colorScheme))
                        .lineLimit(1)
                    if let detail = option.detail, !detail.isEmpty {
                        Text(detail)
                            .font(.caption)
                            .foregroundStyle(Brand.muted(colorScheme))
                            .lineLimit(2)
                    }
                }

                Spacer(minLength: 0)

                if selected {
                    Image(systemName: "checkmark")
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(Brand.action)
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                if selected {
                    Color.clear
                        .glassEffect(
                            .regular.tint(Brand.action.opacity(colorScheme == .dark ? 0.2 : 0.12)),
                            in: RoundedRectangle(cornerRadius: 20, style: .continuous)
                        )
                } else {
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(Color.primary.opacity(colorScheme == .dark ? 0.1 : 0.045))
                }
            }
            .overlay {
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .strokeBorder(
                        selected
                            ? Brand.action.opacity(0.5)
                            : Color.white.opacity(colorScheme == .dark ? 0.1 : 0.2),
                        lineWidth: selected ? 1.2 : 0.7
                    )
            }
            .scaleEffect(pressed ? 0.985 : (selected ? 1.01 : 1))
            .contentShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        }
        .buttonStyle(.plain)
        .animation(.spring(response: 0.32, dampingFraction: 0.82), value: selected)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

extension PortalChoiceRail {
    /// Camel / Pascal tokens → short human labels (`PendingPayment` → `Pending payment`).
    static func humanize(_ raw: String) -> String {
        var spaced = ""
        for character in raw {
            if character.isUppercase, let last = spaced.last, last.isLetter || last.isNumber {
                spaced.append(" ")
            }
            spaced.append(character)
        }
        return spaced.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "_", with: " ")
            .lowercased()
            .capitalized
    }
}
