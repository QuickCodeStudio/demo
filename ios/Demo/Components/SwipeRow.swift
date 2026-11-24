import SwiftUI

/// List row chrome with Edit / Delete — swipe-to-reveal only (never always-visible inline).
struct PortalSwipeRow<Content: View>: View {
    var allowsEdit = false
    var allowsDelete = false
    var onEdit: () -> Void = {}
    var onDelete: () -> Void = {}
    @ViewBuilder var content: () -> Content

    @Environment(\.verticalSizeClass) private var vertical
    @Environment(\.shellTrailingPad) private var trailingPad
    @State private var offset: CGFloat = 0
    @State private var dragging = false

    private var actionCount: CGFloat {
        CGFloat((allowsEdit ? 1 : 0) + (allowsDelete ? 1 : 0))
    }

    private var actionWidth: CGFloat {
        if vertical == .compact { return 74 }
        return 68
    }

    private var openWidth: CGFloat {
        actionCount == 0 ? 0 : actionCount * actionWidth + 12 + trailingPad
    }

    private var revealed: Bool { dragging || offset < -8 }

    var body: some View {
        ZStack(alignment: .trailing) {
            if openWidth > 0 {
                HStack(spacing: 8) {
                    Spacer(minLength: 0)
                    if allowsEdit {
                        actionButton(title: "Edit", symbol: "pencil", tint: Brand.action, action: {
                            close()
                            onEdit()
                        })
                    }
                    if allowsDelete {
                        actionButton(title: "Delete", symbol: "trash", tint: Color(hex: 0xE11D48), action: {
                            close()
                            onDelete()
                        })
                    }
                }
                .padding(.trailing, 4 + trailingPad)
                .opacity(revealed ? 1 : 0)
                .allowsHitTesting(revealed)
            }

            content()
                .offset(x: offset)
                .gesture(drag)
        }
        .contentShape(RoundedRectangle(cornerRadius: ShellMetrics.cardRadius, style: .continuous))
        .contextMenu {
            if allowsEdit {
                Button("Edit", systemImage: "pencil", action: onEdit)
            }
            if allowsDelete {
                Button("Delete", systemImage: "trash", role: .destructive, action: onDelete)
            }
        }
        .onChange(of: allowsEdit) { _, _ in close(animated: false) }
        .onChange(of: allowsDelete) { _, _ in close(animated: false) }
        .onChange(of: trailingPad) { _, _ in close(animated: false) }
    }

    private var drag: some Gesture {
        DragGesture(minimumDistance: 18)
            .onChanged { value in
                guard openWidth > 0 else { return }
                guard abs(value.translation.width) > abs(value.translation.height) else { return }
                dragging = true
                let base = offset < -openWidth / 2 ? -openWidth : 0
                let next = value.translation.width + base
                offset = min(0, max(-openWidth, next > 0 ? next * 0.15 : next))
            }
            .onEnded { value in
                guard openWidth > 0 else { return }
                dragging = false
                let projected = offset + value.predictedEndTranslation.width * 0.2
                withAnimation(.smooth(duration: 0.28)) {
                    offset = projected < -openWidth * 0.35 ? -openWidth : 0
                }
            }
    }

    private func close(animated: Bool = true) {
        if animated {
            withAnimation(.smooth(duration: 0.24)) { offset = 0 }
        } else {
            offset = 0
        }
    }

    private func actionButton(title: String, symbol: String, tint: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: symbol)
                    .font(.body.weight(.semibold))
                Text(title)
                    .font(.caption.weight(.semibold))
            }
            .foregroundStyle(.white)
            .frame(width: actionWidth - 8, height: 68)
            .background(tint.gradient, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}
