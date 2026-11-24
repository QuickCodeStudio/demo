import SwiftUI

/// iOS Messages-style delete confirm — frosted card, stacked Delete / Cancel.
struct PortalConfirmSheet: View {
    let message: String
    var confirmTitle = "Delete"
    var cancelTitle = "Cancel"
    var onConfirm: () -> Void
    var onCancel: () -> Void

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text(message)
                .font(.body.weight(.regular))
                .foregroundStyle(Color.primary.opacity(0.92))
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)

            VStack(spacing: 10) {
                actionCapsule(title: confirmTitle, destructive: true, action: onConfirm)
                actionCapsule(title: cancelTitle, destructive: false, action: onCancel)
            }
        }
        .padding(.horizontal, 18)
        .padding(.top, 22)
        .padding(.bottom, 16)
        .frame(maxWidth: 340)
        .glassEffect(
            .regular.tint(Color.primary.opacity(colorScheme == .dark ? 0.08 : 0.04)),
            in: RoundedRectangle(cornerRadius: 28, style: .continuous)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .strokeBorder(Color.white.opacity(colorScheme == .dark ? 0.18 : 0.35), lineWidth: 0.8)
        }
    }

    private func actionCapsule(title: String, destructive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.body.weight(.semibold))
                .foregroundStyle(destructive ? Color(hex: 0xFF7B72) : Color.primary.opacity(0.92))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background {
                    Capsule(style: .continuous)
                        .fill(Color.primary.opacity(colorScheme == .dark ? 0.14 : 0.08))
                }
                .overlay {
                    Capsule(style: .continuous)
                        .strokeBorder(Color.white.opacity(colorScheme == .dark ? 0.1 : 0.2), lineWidth: 0.6)
                }
                .contentShape(Capsule(style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

/// fullScreenCover centers over the whole window (not the detail pane).
private struct PortalDeleteConfirmModifier: ViewModifier {
    @Binding var isPresented: Bool
    var message: String
    var confirmTitle: String
    var cancelTitle: String
    var onConfirm: () -> Void
    var onCancel: () -> Void

    func body(content: Content) -> some View {
        content
            .fullScreenCover(isPresented: $isPresented) {
                ZStack {
                    Color.black.opacity(0.38)
                        .ignoresSafeArea()
                        .onTapGesture { dismiss(cancel: true) }

                    PortalConfirmSheet(
                        message: message,
                        confirmTitle: confirmTitle,
                        cancelTitle: cancelTitle,
                        onConfirm: { dismiss(cancel: false); onConfirm() },
                        onCancel: { dismiss(cancel: true) }
                    )
                    .padding(.horizontal, 28)
                }
                .presentationBackground(.clear)
            }
    }

    private func dismiss(cancel: Bool) {
        isPresented = false
        if cancel { onCancel() }
    }
}

extension View {
    /// Messages-style delete confirm — stacked buttons, centered on the full screen.
    func portalDeleteConfirm(
        isPresented: Binding<Bool>,
        message: String = "This record will be permanently deleted. This cannot be undone.",
        confirmTitle: String = "Delete",
        cancelTitle: String = "Cancel",
        onConfirm: @escaping () -> Void,
        onCancel: @escaping () -> Void = {}
    ) -> some View {
        modifier(
            PortalDeleteConfirmModifier(
                isPresented: isPresented,
                message: message,
                confirmTitle: confirmTitle,
                cancelTitle: cancelTitle,
                onConfirm: onConfirm,
                onCancel: onCancel
            )
        )
    }
}
