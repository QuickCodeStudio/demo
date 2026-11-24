import SwiftUI

@MainActor
@Observable
final class PortalToast {
    var message: String?

    func show(_ text: String) {
        let next = PortalErrors.sanitize(text.trimmingCharacters(in: .whitespacesAndNewlines))
        guard !next.isEmpty else { return }
        withAnimation(.smooth(duration: 0.22)) {
            message = next
        }
        Task {
            try? await Task.sleep(for: .seconds(2.2))
            if message == next {
                withAnimation(.smooth(duration: 0.22)) {
                    message = nil
                }
            }
        }
    }
}

struct PortalToastBanner: View {
    @Environment(PortalToast.self) private var toast
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        if let message = toast.message {
            Text(message)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Brand.text(colorScheme))
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background {
                    Capsule()
                        .fill(Brand.background(colorScheme))
                        .shadow(color: Brand.navy.opacity(0.16), radius: 16, y: 6)
                }
                .overlay {
                    Capsule()
                        .strokeBorder(Brand.gold.opacity(0.55), lineWidth: 1)
                }
                .padding(.top, 8)
                .transition(.move(edge: .top).combined(with: .opacity))
                .accessibilityAddTraits(.isStaticText)
        }
    }
}
