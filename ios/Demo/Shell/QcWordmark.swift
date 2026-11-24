import SwiftUI

/// Studio wordmark. Light asset on light surfaces, dark asset on dark surfaces.
struct QcWordmark: View {
    var width: CGFloat = 196
    var onDarkSurface: Bool? = nil

    @Environment(\.colorScheme) private var colorScheme

    private var usesDarkAsset: Bool {
        onDarkSurface ?? (colorScheme == .dark)
    }

    var body: some View {
        Image(usesDarkAsset ? "QcLogoDark" : "QcLogoLight")
            .resizable()
            .scaledToFit()
            .frame(width: width, alignment: .leading)
            .accessibilityLabel("QuickCode")
    }
}
