import SwiftUI

struct SplashView: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        ZStack {
            (colorScheme == .dark ? Color.black : Brand.background(colorScheme))
                .ignoresSafeArea()
            Circle()
                .fill(Brand.action.opacity(colorScheme == .dark ? 0.16 : 0.11))
                .frame(width: 460, height: 300)
                .blur(radius: 36)
            if colorScheme == .dark {
                Circle()
                    .fill(Brand.gold.opacity(0.08))
                    .frame(width: 280, height: 200)
                    .blur(radius: 40)
                    .offset(x: 90, y: 70)
            }
            GeometryReader { geo in
                let column = min(
                    ShellMetrics.authContentMaxWidth,
                    max(280, geo.size.width - ShellMetrics.screenPadding * 2)
                )
                HStack(spacing: 0) {
                    Spacer(minLength: 0)
                    VStack(spacing: 0) {
                        let logoWidth: CGFloat = 240
                        QcLoadingLogo(width: logoWidth)
                        VStack(spacing: 8) {
                            Text("Opening project")
                                .font(.footnote.weight(.semibold))
                                .tracking(0.4)
                                .foregroundStyle(Brand.muted(colorScheme))
                            Text(ShellCopy.projectName)
                                .font(.system(size: 40, weight: .bold))
                                .tracking(-1.2)
                                .foregroundStyle(Brand.text(colorScheme))
                            Text("Opening workspace")
                                .font(.subheadline)
                                .foregroundStyle(Brand.muted(colorScheme))
                        }
                        .padding(.top, 28)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                        QcLogoStream()
                            .frame(width: logoWidth, height: 2)
                            .padding(.top, 28)
                    }
                    .frame(width: column)
                    Spacer(minLength: 0)
                }
                .frame(width: geo.size.width, height: geo.size.height, alignment: .center)
            }
        }
    }
}
