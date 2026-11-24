import SwiftUI

/// Studio tokens from `qc-tokens.css`, plus the logo rule from `QcLoadingLogo`:
/// navy wordmark on light, white wordmark on dark, gold “code” in both.
enum Brand {
    static let navy = Color(hex: 0x3B488E)
    static let navyDeep = Color(hex: 0x1E2A6B)
    static let gold = Color(hex: 0xFFC10E)
    static let goldBright = Color(hex: 0xFFD56A)
    static let action = Color(hex: 0x387BF5)

    static func background(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0x0B0E14) : Color(hex: 0xF2F5FB)
    }

    static func backgroundSubtle(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0x141A28) : Color(hex: 0xE9EEF8)
    }

    static func backgroundMuted(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0x222836) : Color(hex: 0xE2E8F3)
    }

    static func text(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0xF1F3F7) : Color(hex: 0x121A2E)
    }

    static func muted(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0x9BA3B2) : Color(hex: 0x667089)
    }

    /// Bare loader Q. Navy on light, white on dark. The rounded tile is the app icon, not a loader.
    static func markQ(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? .white : navy
    }
}

enum ShellCopy {
    /// Replaced with the generated project name.
    static let projectName = "Demo"
}

extension Color {
    init(hex: UInt32) {
        let red = Double((hex >> 16) & 0xFF) / 255
        let green = Double((hex >> 8) & 0xFF) / 255
        let blue = Double(hex & 0xFF) / 255
        self.init(red: red, green: green, blue: blue)
    }
}
