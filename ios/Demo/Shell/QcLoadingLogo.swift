import SwiftUI

/// Studio `QcLoadingLogo`: circuit draws in, letters rise, the closer slides, then the stream runs under it.
struct QcLoadingLogo: View {
    var width: CGFloat = 300
    var replay: Int = 0

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var started = Date()

    var body: some View {
        TimelineView(.animation(minimumInterval: reduceMotion ? 1 : 1 / 30)) { context in
            let elapsed = reduceMotion ? 8.0 : context.date.timeIntervalSince(started)
            Canvas { context, size in
                draw(in: context, size: size, elapsed: elapsed)
            }
        }
        .frame(width: width, height: width * QcLogoArt.viewH / QcLogoArt.viewW)
        .accessibilityLabel("QuickCode")
        .onChange(of: replay) { _, _ in
            started = Date()
        }
    }

    private var ink: Color {
        colorScheme == .dark ? .white : Brand.navy
    }

    private func draw(in context: GraphicsContext, size: CGSize, elapsed: Double) {
        let scaleX = size.width / QcLogoArt.viewW
        let scaleY = size.height / QcLogoArt.viewH

        func paint(_ path: Path, fill: Color? = nil, stroke: Color? = nil, opacity: Double = 1, rise: CGFloat = 0, trim: (CGFloat, CGFloat)? = nil) {
            guard opacity > 0.01 else { return }
            var drawn = path
            if let trim {
                drawn = drawn.trimmedPath(from: trim.0, to: trim.1)
            }
            context.drawLayer { layer in
                layer.opacity = opacity
                layer.translateBy(x: 0, y: rise)
                layer.scaleBy(x: scaleX, y: scaleY)
                layer.translateBy(x: -QcLogoArt.viewX, y: -QcLogoArt.viewY)
                if let fill {
                    layer.fill(drawn, with: .color(fill), style: FillStyle(eoFill: true))
                }
                if let stroke {
                    layer.stroke(
                        drawn,
                        with: .color(stroke),
                        style: StrokeStyle(lineWidth: 40, lineCap: .round, lineJoin: .round)
                    )
                }
            }
        }

        for (index, trace) in QcLogoArt.traces.enumerated() {
            let trim = QcLogoMotion.traceTrim(elapsed: elapsed, delay: Double(index) * 0.12)
            paint(trace, stroke: Brand.gold, opacity: trim.opacity, trim: (trim.from, trim.to))
        }
        for pad in QcLogoArt.pads {
            paint(pad, fill: Brand.gold)
        }
        let qScale = QcLogoMotion.qScale(elapsed: elapsed)
        paint(QcLogoArt.q.applying(qScale), fill: ink, opacity: QcLogoMotion.fade(elapsed: elapsed, delay: 0, duration: 0.32))

        let closer = QcLogoMotion.closerX(elapsed: elapsed)
        paint(QcLogoArt.lt, fill: ink)
        paint(QcLogoArt.slash(closerX: closer), fill: ink, opacity: QcLogoMotion.rise(elapsed: elapsed, delay: 0).opacity, rise: QcLogoMotion.rise(elapsed: elapsed, delay: 0).rise)
        paint(QcLogoArt.gt(closerX: closer), fill: ink, opacity: QcLogoMotion.rise(elapsed: elapsed, delay: 0).opacity, rise: QcLogoMotion.rise(elapsed: elapsed, delay: 0).rise)

        let letters: [(Path, Color, Double)] = [
            (QcLogoArt.u, ink, 0.38),
            (QcLogoArt.i, ink, 0.46),
            (QcLogoArt.cu, ink, 0.54),
            (QcLogoArt.k, ink, 0.62),
            (QcLogoArt.cc, Brand.gold, 0.70),
            (QcLogoArt.o, Brand.gold, 0.78),
            (QcLogoArt.d, Brand.gold, 0.86),
            (QcLogoArt.e, Brand.gold, 0.94)
        ]
        for letter in letters {
            let motion = QcLogoMotion.rise(elapsed: elapsed, delay: letter.2)
            paint(letter.0, fill: letter.1, opacity: motion.opacity, rise: motion.rise)
        }
    }
}

struct QcLogoStream: View {
    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 30)) { context in
            let travel = context.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 1.8) / 1.8
            GeometryReader { geo in
                Capsule()
                    .fill(Color.primary.opacity(0.08))
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [.clear, Brand.action, Brand.gold, .clear],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: geo.size.width * 0.4)
                    .offset(x: -geo.size.width * 0.4 + geo.size.width * 1.4 * travel)
            }
            .clipped()
        }
        .accessibilityHidden(true)
    }
}

private enum QcLogoMotion {
    static func fade(elapsed: Double, delay: Double, duration: Double) -> Double {
        let u = (elapsed - delay) / duration
        if u <= 0 { return 0 }
        if u >= 1 { return 1 }
        return u
    }

    static func rise(elapsed: Double, delay: Double) -> (opacity: Double, rise: CGFloat) {
        let u = fade(elapsed: elapsed, delay: delay, duration: 0.38)
        let eased = 1 - pow(1 - u, 3)
        return (eased, (1 - eased) * 8)
    }

    static func closerX(elapsed: Double) -> CGFloat {
        let duration = 1.5
        let u = min(1, max(0, elapsed / duration))
        if u <= 0.16 { return QcLogoArt.closerStart }
        let t = (u - 0.16) / 0.84
        let eased = 1 - pow(1 - t, 3)
        return QcLogoArt.closerStart + (QcLogoArt.closerEnd - QcLogoArt.closerStart) * eased
    }

    static func qScale(elapsed: Double) -> CGAffineTransform {
        let fadeIn = fade(elapsed: elapsed, delay: 0, duration: 0.32)
        guard fadeIn >= 1 else { return .identity }
        let idle = sin((elapsed - 0.7) / 4 * .pi * 2)
        let scale = 1 + 0.015 * max(0, idle)
        let bounds = QcLogoArt.q.boundingRect
        let midX = bounds.midX
        let midY = bounds.midY
        return CGAffineTransform(translationX: -midX, y: -midY)
            .concatenating(CGAffineTransform(scaleX: scale, y: scale))
            .concatenating(CGAffineTransform(translationX: midX, y: midY))
    }

    static func traceTrim(elapsed: Double, delay: Double) -> (from: CGFloat, to: CGFloat, opacity: Double) {
        let cycle = 6.95
        let local = elapsed - delay
        if local < 0 { return (0, 0, 0) }
        let u = local.truncatingRemainder(dividingBy: cycle) / cycle
        let tDraw = 1.15 / cycle
        let tGleam = 5.55 / cycle
        let tGone = 6.70 / cycle
        if u < tDraw {
            return (0, CGFloat(u / tDraw), 1)
        }
        if u < tGleam {
            return (0, 1, 1)
        }
        if u < tGone {
            let p = (u - tGleam) / (tGone - tGleam)
            return (CGFloat(p), 1, 1)
        }
        return (0, 0, 0)
    }
}

private enum QcLogoArt {
    static let viewX: CGFloat = 8
    static let viewY: CGFloat = -24
    static let viewW: CGFloat = 6753
    static let viewH: CGFloat = 781
    static let closerStart: CGFloat = 350
    static let closerEnd: CGFloat = 1307.11

    private static let brackets = CGAffineTransform(
        a: 4.39442066053203, b: 0.03115994842302,
        c: -0.03115994759757, d: 4.39442077694442,
        tx: -1.28770953200092, ty: 627.303653495917
    )
    private static let uick = CGAffineTransform(
        a: 4.39442066053203, b: 0.03115994842302,
        c: -0.03115994759757, d: 4.39442077694442,
        tx: 1555.04214710889, ty: 628.586390994723
    )
    private static let code = CGAffineTransform(
        a: 4.39442066053203, b: 0.03115994842302,
        c: -0.03115994759757, d: 4.39442077694442,
        tx: 3494.37563694772, ty: 642.76267775816
    )

    static let traces: [Path] = [
        "M672.315,96.782 L837.079,96.782 C850.006,96.782 861.032,101.344 870.156,110.469 L922.623,162.936 C930.987,171.300 941.633,175.482 954.559,175.482 L1037.617,175.482",
        "M736.536,180.700 L804.232,181.185 C817.159,181.185 828.184,185.748 837.309,194.872 L885.214,242.777 C894.338,251.901 905.364,256.464 918.291,256.464 L965.436,255.910",
        "M704.144,263.961 L768.775,263.961 C781.701,263.961 792.727,268.524 801.851,277.648 L845.194,320.990 C854.318,330.115 865.344,334.677 878.271,334.677 L1015.005,334.677",
        "M562.973,385.142 L622.504,442.834 C631.629,451.959 642.654,456.521 655.581,456.521 L784.467,456.521 C797.394,456.521 808.420,451.959 817.544,442.834 L841.496,418.882 C850.621,409.757 861.647,405.195 874.573,405.195 L1029.761,405.195",
        "M649.712,579.636 L686.377,542.750 C695.501,533.626 706.527,529.063 719.454,529.063 L818.685,529.063 C831.611,529.063 842.637,524.501 851.762,515.376 L879.136,488.002 C888.260,478.878 899.286,474.315 912.213,474.315 L1037.889,474.315"
    ].map(SvgPath.parse)

    static let pads: [Path] = [
        "M615.679,149.658 C586.896,149.658 563.212,125.974 563.212,97.191 C563.212,68.409 586.896,44.724 615.679,44.724 C644.461,44.724 668.145,68.409 668.145,97.191 C668.145,125.974 644.461,149.658 615.679,149.658 ZM615.679,72.098 C601.913,72.098 590.586,83.426 590.586,97.191 C590.586,110.957 601.913,122.284 615.679,122.284 C629.444,122.284 640.771,110.957 640.771,97.191 C640.771,83.426 629.444,72.098 615.679,72.098 Z",
        "M659.279,315.338 C630.496,315.338 606.812,291.654 606.812,262.871 C606.812,234.089 630.496,210.404 659.279,210.404 C688.061,210.404 711.745,234.089 711.745,262.871 C711.745,291.654 688.061,315.338 659.279,315.338 ZM659.279,237.778 C645.513,237.778 634.186,249.106 634.186,262.871 C634.186,276.637 645.513,287.964 659.279,287.964 C673.044,287.964 684.371,276.637 684.371,262.871 C684.371,249.106 673.044,237.778 659.279,237.778 Z",
        "M531.748,403.628 C502.966,403.628 479.281,379.944 479.281,351.161 C479.281,322.379 502.966,298.694 531.748,298.694 C560.531,298.694 584.215,322.379 584.215,351.161 C584.215,379.944 560.531,403.628 531.748,403.628 ZM531.748,326.068 C517.983,326.068 506.656,337.396 506.656,351.161 C506.656,364.927 517.983,376.254 531.748,376.254 C545.514,376.254 556.841,364.927 556.841,351.161 C556.841,337.396 545.514,326.068 531.748,326.068 Z",
        "M621.128,663.048 C592.346,663.048 568.661,639.364 568.661,610.581 C568.661,581.799 592.346,558.114 621.128,558.114 C649.911,558.114 673.595,581.799 673.595,610.581 C673.595,639.364 649.911,663.048 621.128,663.048 ZM621.128,585.488 C607.363,585.488 596.036,596.816 596.036,610.581 C596.036,624.347 607.363,635.674 621.128,635.674 C634.894,635.674 646.221,624.347 646.221,610.581 C646.221,596.816 634.894,585.488 621.128,585.488 Z"
    ].map { SvgPath.parse($0) }

    static let q = SvgPath.parse("M1218.970,455.954 C1185.237,455.715 1156.486,443.544 1132.722,419.434 C1108.952,395.331 1097.189,366.410 1097.429,332.677 C1097.668,298.951 1109.839,270.200 1133.949,246.430 C1158.052,222.666 1186.973,210.897 1220.706,211.136 C1254.432,211.375 1283.183,223.553 1306.954,247.656 C1330.717,271.766 1342.486,300.687 1342.247,334.413 C1342.008,368.146 1329.830,396.897 1305.727,420.661 C1281.617,444.431 1252.696,456.193 1218.970,455.954 ZM1518.169,606.608 C1518.387,573.657 1519.082,468.760 1519.082,468.760 C1519.082,468.760 1520.182,457.943 1507.765,457.624 C1495.605,457.693 1478.069,457.791 1478.069,457.791 C1496.010,420.927 1505.142,380.186 1505.459,335.571 C1506.018,256.687 1478.609,189.164 1423.245,133.002 C1367.874,76.847 1300.747,48.484 1221.863,47.924 C1142.973,47.365 1075.450,74.774 1019.295,130.138 C963.134,185.509 934.776,252.636 934.217,331.520 C933.657,410.410 961.060,477.933 1016.431,534.088 C1071.795,590.250 1138.922,618.607 1217.813,619.166 C1217.813,619.166 1434.344,621.318 1499.644,621.967 C1507.492,621.900 1518.184,619.231 1518.169,606.608 Z")

    static let lt = SvgPath.parse("M104.167 -129.63V-92.593L57.87 -64.815L104.167 -37.037V0L2.315 -64.815Z").applying(brackets)
    static let u = SvgPath.parse("M2.315 -64.815V-129.63H39.352V-64.815Q39.352 -37.037 57.87 -37.037Q76.389 -37.037 76.389 -64.815V-129.63H113.426V-64.815Q113.426 0 57.87 0Q2.315 0 2.315 -64.815Z").applying(uick)
    static let i = SvgPath.parse("M168.704 -129.63V0H131.667V-129.63Z").applying(uick)
    static let cu = SvgPath.parse("M295.834 -18.982Q276.852 0 250 0Q223.149 0 204.167 -18.982Q185.186 -37.963 185.186 -64.815Q185.186 -91.667 204.167 -110.648Q223.149 -129.63 250 -129.63Q276.852 -129.63 295.834 -110.648Q305.371 -101.111 310.186 -89.537L276.389 -73.704Q274.445 -79.63 269.63 -84.445Q261.482 -92.593 250 -92.593Q238.519 -92.593 230.371 -84.445Q222.223 -76.296 222.223 -64.815Q222.223 -53.333 230.371 -45.185Q238.519 -37.037 250 -37.037Q261.482 -37.037 269.63 -45.185Q274.075 -49.63 276.112 -55.185L310.093 -40.093Q305.371 -28.519 295.834 -18.982Z").applying(uick)
    static let k = SvgPath.parse("M329.167 -129.63H366.204V-83.333L403.242 -129.63H449.538L393.982 -64.815L449.538 0H403.242L366.204 -46.296V0H329.167Z").applying(uick)
    static let cc = SvgPath.parse("M112.963 -18.982Q93.982 0 67.13 0Q40.278 0 21.296 -18.982Q2.315 -37.963 2.315 -64.815Q2.315 -91.667 21.296 -110.648Q40.278 -129.63 67.13 -129.63Q93.982 -129.63 112.963 -110.648Q122.5 -101.111 127.315 -89.537L93.519 -73.704Q91.574 -79.63 86.759 -84.445Q78.611 -92.593 67.13 -92.593Q55.648 -92.593 47.5 -84.445Q39.352 -76.296 39.352 -64.815Q39.352 -53.333 47.5 -45.185Q55.648 -37.037 67.13 -37.037Q78.611 -37.037 86.759 -45.185Q91.204 -49.63 93.241 -55.185L127.222 -40.093Q122.5 -28.519 112.963 -18.982Z").applying(code)
    static let o = SvgPath.parse("M208.149 0Q181.297 0 162.315 -18.982Q143.334 -37.963 143.334 -64.815Q143.334 -91.667 162.315 -110.648Q181.297 -129.63 208.149 -129.63Q235 -129.63 253.982 -110.648Q272.963 -91.667 272.963 -64.815Q272.963 -37.963 253.982 -18.982Q235 0 208.149 0ZM235.926 -64.815Q235.926 -76.296 227.778 -84.445Q219.63 -92.593 208.149 -92.593Q196.667 -92.593 188.519 -84.445Q180.371 -76.296 180.371 -64.815Q180.371 -53.333 188.519 -45.185Q196.667 -37.037 208.149 -37.037Q219.63 -37.037 227.778 -45.185Q235.926 -53.333 235.926 -64.815Z").applying(code)
    static let d = SvgPath.parse("M345.741 -129.63Q372.593 -129.63 391.575 -110.648Q410.556 -91.667 410.556 -64.815Q410.556 -37.963 391.575 -18.982Q372.593 0 345.741 0H290.186V-129.63ZM345.741 -37.037Q357.223 -37.037 365.371 -45.185Q373.519 -53.333 373.519 -64.815Q373.519 -76.296 365.371 -84.445Q357.223 -92.593 345.741 -92.593H327.223V-37.037Z").applying(code)
    static let e = SvgPath.parse("M502.408 -129.63V-92.593H465.371V-83.333H483.89V-46.296H465.371V-37.037H502.408V0H428.334V-129.63Z").applying(code)

    private static let slashRaw = SvgPath.parse("M124.074 -148.148 41.019 18.519H2.315L86.482 -148.148Z")
    private static let gtRaw = SvgPath.parse("M128.704 0V-37.037L175 -64.815L128.704 -92.593V-129.63L230.556 -64.815Z")

    static func slash(closerX: CGFloat) -> Path {
        slashRaw.applying(CGAffineTransform(translationX: closerX, y: 0).concatenating(brackets))
    }

    static func gt(closerX: CGFloat) -> Path {
        gtRaw.applying(CGAffineTransform(translationX: closerX, y: 0).concatenating(brackets))
    }
}
