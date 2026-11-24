import SwiftUI

enum QcMarkArt {
    static let traces = [
        "M180.977,56.446 L326.091,56.446 C337.476,56.446 347.186,60.464 355.223,68.501 L401.432,114.710 C408.799,122.077 418.175,125.760 429.560,125.760 L502.711,125.760",
        "M237.539,130.356 L297.161,130.783 C308.546,130.783 318.257,134.801 326.293,142.838 L368.484,185.029 C376.521,193.065 386.232,197.083 397.617,197.083 L439.139,196.596",
        "M209.010,203.687 L265.933,203.687 C277.318,203.687 287.028,207.705 295.065,215.741 L333.238,253.914 C341.274,261.951 350.985,265.969 362.370,265.969 L482.796,265.969",
        "M84.676,310.415 L137.107,361.226 C145.144,369.263 154.854,373.281 166.239,373.281 L279.754,373.281 C291.139,373.281 300.849,369.263 308.886,361.226 L329.981,340.131 C338.018,332.094 347.728,328.076 359.113,328.076 L495.792,328.076",
        "M161.070,481.712 L193.362,449.226 C201.399,441.189 211.109,437.171 222.494,437.171 L309.890,437.171 C321.275,437.171 330.986,433.153 339.022,425.117 L363.131,401.007 C371.168,392.971 380.878,388.953 392.263,388.953 L502.950,388.953"
    ]

    static let pads = [
        "M131.096,103.016 C105.746,103.016 84.886,82.156 84.886,56.807 C84.886,31.457 105.746,10.597 131.096,10.597 C156.445,10.597 177.305,31.457 177.305,56.807 C177.305,82.156 156.445,103.016 131.096,103.016 ZM131.096,34.707 C118.972,34.707 108.996,44.683 108.996,56.807 C108.996,68.931 118.972,78.907 131.096,78.907 C143.219,78.907 153.196,68.931 153.196,56.807 C153.196,44.683 143.219,34.707 131.096,34.707 Z",
        "M169.496,248.936 C144.146,248.936 123.286,228.077 123.286,202.727 C123.286,177.377 144.146,156.518 169.496,156.518 C194.845,156.518 215.705,177.377 215.705,202.727 C215.705,228.077 194.845,248.936 169.496,248.936 ZM169.496,180.627 C157.372,180.627 147.396,190.603 147.396,202.727 C147.396,214.851 157.372,224.827 169.496,224.827 C181.619,224.827 191.596,214.851 191.596,202.727 C191.596,190.603 181.619,180.627 169.496,180.627 Z",
        "M57.176,326.696 C31.826,326.696 10.966,305.837 10.966,280.487 C10.966,255.137 31.826,234.278 57.176,234.278 C82.525,234.278 103.385,255.137 103.385,280.487 C103.385,305.837 82.525,326.696 57.176,326.696 ZM57.176,258.387 C45.052,258.387 35.076,268.363 35.076,280.487 C35.076,292.611 45.052,302.587 57.176,302.587 C69.299,302.587 79.276,292.611 79.276,280.487 C79.276,268.363 69.299,258.387 57.176,258.387 Z",
        "M135.896,555.176 C110.546,555.176 89.686,534.317 89.686,508.967 C89.686,483.617 110.546,462.758 135.896,462.758 C161.245,462.758 182.105,483.617 182.105,508.967 C182.105,534.317 161.245,555.176 135.896,555.176 ZM135.896,486.867 C123.772,486.867 113.796,496.843 113.796,508.967 C113.796,521.091 123.772,531.067 135.896,531.067 C148.019,531.067 157.996,521.091 157.996,508.967 C157.996,496.843 148.019,486.867 135.896,486.867 Z"
    ]

    static let q = "M662.435,372.782 C632.725,372.571 607.403,361.851 586.474,340.617 C565.538,319.389 555.179,293.917 555.390,264.207 C555.600,234.503 566.320,209.181 587.554,188.246 C608.782,167.316 634.254,156.951 663.964,157.162 C693.668,157.373 718.990,168.098 739.925,189.326 C760.855,210.561 771.220,236.032 771.009,265.736 C770.798,295.446 760.073,320.768 738.845,341.698 C717.610,362.633 692.139,372.992 662.435,372.782 ZM925.950,505.467 C926.142,476.446 926.754,384.060 926.754,384.060 C926.754,384.060 927.722,374.533 916.786,374.252 C906.077,374.313 890.632,374.400 890.632,374.400 C906.434,341.931 914.477,306.050 914.755,266.756 C915.248,197.280 891.108,137.810 842.347,88.347 C793.580,38.889 734.459,13.908 664.983,13.416 C595.502,12.923 536.032,37.063 486.575,85.824 C437.111,134.591 412.136,193.713 411.643,263.188 C411.150,332.669 435.285,392.139 484.052,441.597 C532.813,491.060 591.934,516.035 661.416,516.528 C661.416,516.528 852.122,518.423 909.635,518.994 C916.546,518.936 925.963,516.585 925.950,505.467 Z"
}

struct QcLoadingMark: View {
    var width: CGFloat = 86
    var showsStream: Bool = true
    var label: String? = nil

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var started = Date()

    private var height: CGFloat { width * 586 / 947 }

    var body: some View {
        VStack(spacing: 10) {
            TimelineView(.animation(minimumInterval: reduceMotion ? 1 : 1 / 30)) { context in
                let elapsed = reduceMotion ? 2.0 : context.date.timeIntervalSince(started)
                mark(elapsed: elapsed)
            }
            .frame(width: width, height: height)
            if let label {
                Text(label)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Brand.muted(colorScheme))
            }
            if showsStream {
                QcStream()
                    .frame(width: 72, height: 2)
            }
        }
        .accessibilityLabel(label ?? "Loading")
    }

    private func mark(elapsed: Double) -> some View {
        let stroke = width * 40 / 947
        let qFade = min(1, max(0, elapsed / 0.32))
        let idle = elapsed > 0.7 ? 1 + 0.0075 * (1 + sin((elapsed - 0.7) / 4 * .pi * 2)) : 1
        return ZStack {
            ForEach(Array(QcMarkArt.traces.enumerated()), id: \.offset) { index, source in
                let phase = QcMarkMotion.phase(elapsed: elapsed, delay: Double(index) * 0.12)
                let base = QcMarkMotion.base(phase)
                QcTraceShape(source: source)
                    .trim(from: base.from, to: base.to)
                    .stroke(Brand.gold, style: StrokeStyle(lineWidth: stroke, lineCap: .round, lineJoin: .round))
                    .opacity(base.opacity)
                if let flow = QcMarkMotion.flow(phase) {
                    ForEach(Array(flow.enumerated()), id: \.offset) { _, segment in
                        QcTraceShape(source: source)
                            .trim(from: segment.0, to: segment.1)
                            .stroke(Brand.goldBright, style: StrokeStyle(lineWidth: stroke, lineCap: .round, lineJoin: .round))
                    }
                }
            }
            ForEach(Array(QcMarkArt.pads.enumerated()), id: \.offset) { _, source in
                QcTraceShape(source: source)
                    .fill(Brand.gold, style: FillStyle(eoFill: true))
            }
            QcTraceShape(source: QcMarkArt.q)
                .fill(Brand.markQ(colorScheme), style: FillStyle(eoFill: true))
                .opacity(qFade)
                .scaleEffect(idle)
        }
    }
}

private enum QcMarkMotion {
    static let cycle = 6.95
    static let tDraw = 1.15 / cycle
    static let tGleam = 5.55 / cycle
    static let tSmall = (5.55 + 1.15 * 0.82) / cycle
    static let tGone = 6.70 / cycle

    static func phase(elapsed: Double, delay: Double) -> Double {
        let local = elapsed - delay
        guard local > 0 else { return 0 }
        return local.truncatingRemainder(dividingBy: cycle) / cycle
    }

    static func base(_ u: Double) -> (from: CGFloat, to: CGFloat, opacity: Double) {
        if u <= 0 { return (0, 0, 0) }
        if u < tDraw {
            let t = u / tDraw
            let eased = 1 - pow(1 - t, 3)
            return (0, CGFloat(eased), 1)
        }
        if u < tGleam { return (0, 1, 1) }
        if u < tGone {
            let span = tGone - tGleam
            let p = (u - tGleam) / span
            let smallAt = (tSmall - tGleam) / span
            let amount = p < smallAt ? 0.88 * (p / smallAt) : 0.88 + 0.12 * ((p - smallAt) / (1 - smallAt))
            return (CGFloat(min(1, amount)), 1, 1 - p)
        }
        return (0, 0, 0)
    }

    /// Bright segment traveling the trace during the gleam, same as Studio's flow stroke.
    static func flow(_ u: Double) -> [(CGFloat, CGFloat)]? {
        guard u >= tDraw, u <= tGleam else { return nil }
        let travel = (u - tDraw) / (tGleam - tDraw) * 2
        let start = CGFloat(travel.truncatingRemainder(dividingBy: 1))
        let length: CGFloat = 0.22
        let end = start + length
        if end <= 1 { return [(start, end)] }
        return [(start, 1), (0, end - 1)]
    }
}

private struct QcStream: View {
    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 30)) { context in
            let travel = context.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 1.8) / 1.8
            GeometryReader { geo in
                Capsule()
                    .fill(Color.primary.opacity(0.12))
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [.clear, Color(red: 0.22, green: 0.48, blue: 0.96), Brand.gold, .clear],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: geo.size.width * 0.4)
                    .offset(x: -geo.size.width * 0.4 + geo.size.width * 1.4 * travel)
            }
            .clipped()
        }
    }
}
