import SwiftUI

/// Compact glass callout for auth / form failures — never raw red dump text.
struct PortalInlineError: View {
    let message: String
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.circle.fill")
                .font(.body.weight(.semibold))
                .foregroundStyle(Color(hex: 0xFF7B72))
            Text(PortalErrors.sanitize(message))
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Brand.text(colorScheme).opacity(0.92))
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect(
            .regular.tint(Color(hex: 0xFF7B72).opacity(colorScheme == .dark ? 0.12 : 0.08)),
            in: RoundedRectangle(cornerRadius: 16, style: .continuous)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color(hex: 0xFF7B72).opacity(colorScheme == .dark ? 0.28 : 0.2), lineWidth: 0.8)
        }
        .accessibilityLabel(PortalErrors.sanitize(message))
    }
}
