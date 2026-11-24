import Charts
import SwiftUI

/// Web-portal–parity dashboard: KPI strip, metric-tab chart explorer, insights, daily details, top services.
struct PortalDashboardView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.horizontalSizeClass) private var size
    let pages: [ShellPage]
    let open: (ShellPage) -> Void

    @State private var contentWidth: CGFloat = 0
    @State private var selectedModule = "All Modules"
    @State private var chartTab: DashboardChartTab = .hourly
    @State private var loadingSummary = true
    @State private var loadingCharts = true
    /// Shown only after a short delay so fast loads don't flash a spinner.
    @State private var showSlowLoading = false
    @State private var showModulePicker = false

    /// Side-by-side insight panels only when the content column is truly wide.
    private var usesWidePanels: Bool { contentWidth >= 560 }
    /// Four KPI cards in one row when the content pane is wide (Duo open / iPad).
    private var usesQuadKPI: Bool { contentWidth >= 480 }
    private var usesCompactMetrics: Bool { contentWidth > 0 && contentWidth < 480 }
    /// Phone charts are narrow — keep hour ticks sparse so labels never collide.
    private var chartAxisCount: Int { contentWidth >= 700 ? 7 : (contentWidth >= 420 ? 5 : 4) }

    private var hourlyOrderedLabels: [String] { hourlyTotals.map(\.label) }

    /// Numeric X indices for sparse AxisMarks (String categorical axes still paint every label).
    private var hourlyAxisIndices: [Int] {
        let total = hourlyOrderedLabels.count
        guard total > 0 else { return [] }
        let count = min(chartAxisCount, total)
        if total <= count { return Array(0..<total) }
        return (0..<count).map { i in
            Int((Double(i) * Double(total - 1) / Double(count - 1)).rounded())
        }
    }

    @State private var usersCount: Int?
    @State private var groupsCount: Int?
    @State private var endpointsCount: Int?

    @State private var hourlySeries: [DashboardSeriesPoint] = []
    @State private var dailySeries: [DashboardSeriesPoint] = []
    @State private var durationPoints: [DashboardDurationPoint] = []
    @State private var statusPoints: [DashboardChartPoint] = []
    @State private var statusPoints24h: [DashboardChartPoint] = []
    @State private var moduleHourlyTotals: [DashboardNamedTotal] = []
    @State private var moduleDailyTotals: [DashboardNamedTotal] = []
    @State private var dailyDetails: [DashboardDailyDetail] = []
    @State private var topServices: [DashboardTopService] = []

    private let palette: [Color] = [
        Color(hex: 0x4E73DF), Color(hex: 0x1CC88A), Color(hex: 0xF6C23E), Color(hex: 0xE74A3B),
        Color(hex: 0x36B9CC), Color(hex: 0x858796), Color(hex: 0x6610F2), Color(hex: 0xFD7E14)
    ]

    /// Real API modules only (skip Access Grant Managers / umbrella Audit Logs groups).
    private var modules: [(name: String, pages: [ShellPage], slug: String)] {
        var order: [String] = []
        var bucket: [String: [ShellPage]] = [:]
        var slugs: [String: String] = [:]
        for page in pages {
            guard case .resource(let module, _, _) = page.route, module.hasSuffix("Module") else { continue }
            let name = Self.sidebarModuleLabel(module)
            if bucket[name] == nil { order.append(name) }
            bucket[name, default: []].append(page)
            slugs[name] = SessionStore.kebabModule(module)
        }
        return order.compactMap { name in
            guard let pages = bucket[name] else { return nil }
            return (name, pages, slugs[name] ?? "identity-module")
        }
    }

    private var listPages: [ShellPage] {
        pages.filter { $0.route != .home }
    }

    private var moduleOptions: [String] {
        ["All Modules"] + modules.map(\.name)
    }

    /// Deduped `*-module` API path segments used for audit-stats fan-out (web portal parity).
    private var activeSlugs: [String] {
        if selectedModule == "All Modules" {
            var seen = Set<String>()
            let slugs = modules.compactMap { item -> String? in
                guard seen.insert(item.slug).inserted else { return nil }
                return item.slug
            }
            return slugs.isEmpty ? ["identity-module"] : slugs
        }
        if let match = modules.first(where: { $0.name == selectedModule }) {
            return [match.slug]
        }
        return ["identity-module"]
    }

    private var hourlyTotals: [DashboardChartPoint] {
        aggregate(hourlySeries)
    }

    private var dailyTotals: [DashboardChartPoint] {
        aggregate(dailySeries)
    }

    private var requests24h: Int { Int(hourlyTotals.reduce(0) { $0 + $1.value }) }
    private var requests7d: Int { Int(dailyTotals.reduce(0) { $0 + $1.value }) }

    private var peakHour: (label: String, value: Int) {
        peak(of: hourlyTotals, empty: "--:--")
    }

    private var peakDay: (label: String, value: Int) {
        peak(of: dailyTotals, empty: "-")
    }

    private var durationSummary: (avg: Double, max: Double, min: Double) {
        guard !durationPoints.isEmpty else { return (0, 0, 0) }
        let avgs = durationPoints.map(\.avg)
        let maxes = durationPoints.map(\.max)
        let mins = durationPoints.map(\.min)
        let avg = avgs.reduce(0, +) / Double(avgs.count)
        return (avg, maxes.max() ?? 0, mins.min() ?? 0)
    }

    private var successRate7d: Double {
        successRate(from: statusPoints)
    }

    private var failed7d: Int {
        failedCount(from: statusPoints)
    }

    private var successRate24h: Double {
        successRate(from: statusPoints24h.isEmpty ? statusPoints : statusPoints24h)
    }

    private var failed24h: Int {
        failedCount(from: statusPoints24h.isEmpty ? statusPoints : statusPoints24h)
    }

    private var activeModules24h: Int {
        moduleHourlyTotals.filter { $0.total > 0 }.count
    }

    private var activeModules7d: Int {
        moduleDailyTotals.filter { $0.total > 0 }.count
    }

    private var insightsAreHourly: Bool {
        chartTab == .hourly
    }

    var body: some View {
        ScreenCanvas {
            ScrollView {
                VStack(alignment: .leading, spacing: usesCompactMetrics ? 14 : 18) {
                    header
                    kpiGrid
                    chartExplorer
                    if usesWidePanels {
                        HStack(alignment: .top, spacing: 14) {
                            insightsCard
                            dailyDetailsCard
                        }
                        topServicesCard
                    } else {
                        insightsCard
                        dailyDetailsCard
                        topServicesCard
                    }
                    if !listPages.isEmpty {
                        quickAccessSection
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .padding(.horizontal, ShellMetrics.screenPadding)
                .padding(.top, 8)
                .padding(.bottom, 10)
                .onGeometryChange(for: CGFloat.self) { proxy in
                    proxy.size.width
                } action: { _, width in
                    contentWidth = width
                }
            }
            // Keep horizontal/bottom flush; leave top alone so pull-to-refresh rubber-banding stays stable.
            .contentMargins(.horizontal, 0, for: .scrollContent)
            .contentMargins(.bottom, 0, for: .scrollContent)
            .ignoresSafeArea(.container, edges: .bottom)
            .portalStretchRefresh { await reloadDashboard(force: true) }
        }
        .navigationTitle("Dashboard")
        .navigationBarTitleDisplayMode(.large)
        .portalSafeRail(dashboardSafeRailActions)
        .alert("Module Update", isPresented: $showModulePicker) {
            ForEach(moduleOptions, id: \.self) { option in
                Button(option) { selectedModule = option }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Please select a module")
        }
        .task(id: selectedModule) {
            await reloadDashboard(force: false)
        }
    }

    /// Uses a 5‑minute in-memory cache unless pull-to-refresh forces a reload.
    private func reloadDashboard(force: Bool) async {
        if force {
            PortalDashboardCache.shared.invalidate(selectedModule)
            // Immediate QC loading affordance on pull-to-refresh (don't wait for the slow gate).
            loadingSummary = true
            loadingCharts = true
            showSlowLoading = true
            usersCount = nil
            groupsCount = nil
            endpointsCount = nil
            hourlySeries = []
            dailySeries = []
            durationPoints = []
            statusPoints = []
            statusPoints24h = []
            moduleHourlyTotals = []
            moduleDailyTotals = []
            dailyDetails = []
            topServices = []
        } else if let cached = PortalDashboardCache.shared.snapshot(for: selectedModule), !cached.isHollow {
            apply(cached)
            loadingSummary = false
            loadingCharts = false
            showSlowLoading = false
            return
        }

        let slowGate: Task<Void, Never>?
        if force {
            slowGate = nil
        } else {
            showSlowLoading = false
            slowGate = Task {
                try? await Task.sleep(for: .milliseconds(380))
                if !Task.isCancelled { showSlowLoading = true }
            }
        }
        async let summary: Void = loadSummary()
        async let charts: Void = loadCharts()
        _ = await (summary, charts)
        slowGate?.cancel()
        showSlowLoading = false
        let snap = captureSnapshot()
        // Never pin a failed/empty fetch in cache — that left the dashboard blank for 5 minutes.
        if !snap.isHollow {
            PortalDashboardCache.shared.store(snap)
        }
    }

    private func apply(_ snapshot: PortalDashboardCache.Snapshot) {
        usersCount = snapshot.usersCount
        groupsCount = snapshot.groupsCount
        endpointsCount = snapshot.endpointsCount
        hourlySeries = snapshot.hourlySeries
        dailySeries = snapshot.dailySeries
        durationPoints = snapshot.durationPoints
        statusPoints = snapshot.statusPoints
        statusPoints24h = snapshot.statusPoints24h
        moduleHourlyTotals = snapshot.moduleHourlyTotals
        moduleDailyTotals = snapshot.moduleDailyTotals
        dailyDetails = snapshot.dailyDetails
        topServices = snapshot.topServices
    }

    private func captureSnapshot() -> PortalDashboardCache.Snapshot {
        PortalDashboardCache.Snapshot(
            moduleKey: selectedModule,
            fetchedAt: Date(),
            usersCount: usersCount,
            groupsCount: groupsCount,
            endpointsCount: endpointsCount,
            hourlySeries: hourlySeries,
            dailySeries: dailySeries,
            durationPoints: durationPoints,
            statusPoints: statusPoints,
            statusPoints24h: statusPoints24h,
            moduleHourlyTotals: moduleHourlyTotals,
            moduleDailyTotals: moduleDailyTotals,
            dailyDetails: dailyDetails,
            topServices: topServices
        )
    }

    private var metricsBusy: Bool {
        (loadingCharts || loadingSummary) && showSlowLoading
    }

    private var dashboardSafeRailActions: [PortalSafeRail.Action] {
        [
            PortalSafeRail.Action(
                id: "module",
                systemName: "square.stack.3d.up",
                accessibilityLabel: "Module filter",
                perform: { showModulePicker = true }
            )
        ]
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(greeting)
                .font(.title2.weight(.semibold))
                .foregroundStyle(Brand.text(colorScheme))
            Text("Live module health, traffic, latency, and access operations.")
                .font(.subheadline)
                .foregroundStyle(Brand.muted(colorScheme))
        }
    }

    private var kpiGrid: some View {
        let gap: CGFloat = usesCompactMetrics ? 8 : 10
        let columns: [GridItem] = usesQuadKPI
            ? Array(repeating: GridItem(.flexible(), spacing: gap), count: 4)
            : [
                GridItem(.flexible(), spacing: gap),
                GridItem(.flexible(), spacing: gap)
            ]
        return LazyVGrid(columns: columns, spacing: gap) {
            kpiCard(label: "Total Modules", value: "\(modules.count)", symbol: "square.stack.3d.up.fill", tint: Brand.action)
            kpiCard(
                label: "Total Endpoints",
                value: loadingSummary && endpointsCount == nil ? "…" : "\(endpointsCount ?? listPages.count)",
                symbol: "link",
                tint: Color.teal
            )
            kpiCard(
                label: "Permission Groups",
                value: loadingSummary && groupsCount == nil ? "…" : "\(groupsCount ?? 0)",
                symbol: "lock.shield.fill",
                tint: Brand.navy
            )
            kpiCard(
                label: "Total Users",
                value: loadingSummary && usersCount == nil ? "…" : "\(usersCount ?? 0)",
                symbol: "person.2.fill",
                tint: Brand.gold
            )
        }
    }

    private var chartExplorer: some View {
        VStack(alignment: .leading, spacing: 0) {
            Group {
                if usesQuadKPI {
                    // Wide pane: stretch tabs across the full content width.
                    HStack(spacing: 8) {
                        metricTab(
                            tab: .hourly,
                            value: loadingCharts ? "…" : formatCount(requests24h),
                            meta: "Peak \(peakHour.label) · \(formatCount(peakHour.value))",
                            flexible: true
                        )
                        metricTab(
                            tab: .daily,
                            value: loadingCharts ? "…" : formatCount(requests7d),
                            meta: "Peak \(peakDay.label) · \(formatCount(peakDay.value))",
                            flexible: true
                        )
                        metricTab(
                            tab: .duration,
                            value: loadingCharts ? "…" : "\(Int(durationSummary.avg.rounded()))",
                            meta: "Max \(Int(durationSummary.max.rounded())) · Min \(Int(durationSummary.min.rounded()))",
                            suffix: " ms",
                            flexible: true
                        )
                        metricTab(
                            tab: .status,
                            value: loadingCharts ? "…" : String(format: "%.1f%%", successRate7d),
                            meta: "\(formatCount(failed7d)) failed · 7 days",
                            flexible: true
                        )
                    }
                    .redacted(reason: metricsBusy ? .placeholder : [])
                    .padding(.horizontal, 10)
                    .padding(.top, 10)
                    .padding(.bottom, 8)
                } else {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            metricTab(
                                tab: .hourly,
                                value: loadingCharts ? "…" : formatCount(requests24h),
                                meta: "Peak \(peakHour.label) · \(formatCount(peakHour.value))"
                            )
                            metricTab(
                                tab: .daily,
                                value: loadingCharts ? "…" : formatCount(requests7d),
                                meta: "Peak \(peakDay.label) · \(formatCount(peakDay.value))"
                            )
                            metricTab(
                                tab: .duration,
                                value: loadingCharts ? "…" : "\(Int(durationSummary.avg.rounded()))",
                                meta: "Max \(Int(durationSummary.max.rounded())) · Min \(Int(durationSummary.min.rounded()))",
                                suffix: " ms"
                            )
                            metricTab(
                                tab: .status,
                                value: loadingCharts ? "…" : String(format: "%.1f%%", successRate7d),
                                meta: "\(formatCount(failed7d)) failed · 7 days"
                            )
                        }
                        .redacted(reason: metricsBusy ? .placeholder : [])
                        .padding(.horizontal, 10)
                        .padding(.top, 10)
                        .padding(.bottom, 8)
                    }
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("\(chartTab.chartTitle) — \(selectedModule)")
                    .font(.headline)
                    .foregroundStyle(Brand.action)
                if let subtitle = chartTab.chartSubtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(Brand.muted(colorScheme))
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 8)

            ZStack {
                if loadingCharts && hourlySeries.isEmpty && dailySeries.isEmpty && statusPoints.isEmpty {
                    dashboardLoadingPanel(height: 220, label: "Loading charts")
                } else {
                    chartCanvas
                        .frame(height: 220)
                        .opacity(loadingCharts && showSlowLoading ? 0.35 : 1)
                        .animation(.easeInOut(duration: 0.25), value: chartTab)
                    if loadingCharts && showSlowLoading {
                        dashboardLoadingPanel(height: 220, label: "Refreshing")
                    }
                }
            }
            .padding(.horizontal, 10)
            .padding(.bottom, 10)
        }
        .glassEffect(.regular.tint(Brand.action.opacity(colorScheme == .dark ? 0.08 : 0.04)), in: RoundedRectangle(cornerRadius: ShellMetrics.cardRadius, style: .continuous))
    }

    private func metricTab(
        tab: DashboardChartTab,
        value: String,
        meta: String,
        suffix: String = "",
        flexible: Bool = false
    ) -> some View {
        let selected = chartTab == tab
        let minTabWidth: CGFloat = usesCompactMetrics ? 118 : 148
        return Button {
            chartTab = tab
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text(tab.tabLabel)
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(selected ? Brand.action : Brand.muted(colorScheme))
                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    Text(value)
                        .font(usesCompactMetrics ? .callout.weight(.bold) : .title3.weight(.bold))
                        .foregroundStyle(Brand.text(colorScheme))
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                    if !suffix.isEmpty {
                        Text(suffix)
                            .font(.caption2)
                            .foregroundStyle(Brand.muted(colorScheme))
                    }
                }
                Text(meta)
                    .font(.caption2)
                    .foregroundStyle(Brand.muted(colorScheme))
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.horizontal, usesCompactMetrics ? 10 : 12)
            .padding(.vertical, usesCompactMetrics ? 8 : 10)
            .frame(maxWidth: flexible ? .infinity : nil, alignment: .leading)
            .frame(minWidth: flexible ? 0 : minTabWidth, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(selected ? Brand.action.opacity(colorScheme == .dark ? 0.22 : 0.10) : Color.primary.opacity(0.04))
            )
            .overlay {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(selected ? Brand.action.opacity(0.45) : Color.clear, lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var chartCanvas: some View {
        switch chartTab {
        case .hourly:
            Chart(hourlySeries) { point in
                LineMark(
                    x: .value("Hour", point.index),
                    y: .value("Requests", point.value)
                )
                .foregroundStyle(by: .value("Module", point.series))
                .lineStyle(StrokeStyle(lineWidth: 2))
                .interpolationMethod(.catmullRom)
            }
            .chartForegroundStyleScale(domain: uniqueSeries(hourlySeries), range: palette)
            .chartLegend(position: .bottom, spacing: 6)
            .chartXScale(domain: 0...max(hourlyOrderedLabels.count - 1, 0))
            .chartXAxis {
                AxisMarks(values: hourlyAxisIndices) { value in
                    AxisValueLabel {
                        if let index = value.as(Int.self),
                           hourlyOrderedLabels.indices.contains(index) {
                            Text(hourlyOrderedLabels[index])
                                .font(.caption2)
                                .monospacedDigit()
                        }
                    }
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { _ in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [3, 3]))
                    AxisValueLabel().font(.caption2)
                }
            }

        case .daily:
            Chart(dailyTotals) { point in
                BarMark(
                    x: .value("Day", point.label),
                    y: .value("Requests", point.value)
                )
                .foregroundStyle(Brand.action.gradient)
                .cornerRadius(6)
            }
            .chartYAxis {
                AxisMarks(position: .leading) { _ in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [3, 3]))
                    AxisValueLabel().font(.caption2)
                }
            }

        case .duration:
            Chart {
                ForEach(durationPoints) { point in
                    LineMark(x: .value("Day", point.label), y: .value("ms", point.avg), series: .value("Series", "Avg"))
                        .foregroundStyle(Color(hex: 0x36B9CC))
                    LineMark(x: .value("Day", point.label), y: .value("ms", point.max), series: .value("Series", "Max"))
                        .foregroundStyle(Color(hex: 0xF6C23E))
                    LineMark(x: .value("Day", point.label), y: .value("ms", point.min), series: .value("Series", "Min"))
                        .foregroundStyle(Color(hex: 0x1CC88A))
                }
            }
            .chartLegend(position: .bottom, spacing: 6)
            .chartYAxis {
                AxisMarks(position: .leading) { _ in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [3, 3]))
                    AxisValueLabel().font(.caption2)
                }
            }

        case .status:
            Chart(statusPoints) { point in
                SectorMark(
                    angle: .value("Requests", point.value),
                    innerRadius: .ratio(0.58),
                    angularInset: 1.5
                )
                .cornerRadius(4)
                .foregroundStyle(by: .value("Status", point.label))
            }
            .chartLegend(position: .bottom, spacing: 8)
            .chartForegroundStyleScale(range: statusColors)
        }
    }

    private var statusColors: [Color] {
        statusPoints.map { point in
            let code = Int(point.label.filter(\.isNumber)) ?? 0
            switch code {
            case 200..<300: return Color(hex: 0x1CC88A)
            case 300..<400: return Brand.action
            case 400..<500: return Brand.gold
            default: return Color(hex: 0xE74A3B)
            }
        }
    }

    private var insightsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Operational Insights")
                    .font(.headline)
                    .foregroundStyle(Brand.text(colorScheme))
                Text(insightsAreHourly ? "Last 24 hours" : "Last 7 days")
                    .font(.caption)
                    .foregroundStyle(Brand.muted(colorScheme))
            }

            ZStack {
                VStack(alignment: .leading, spacing: 12) {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                        insightKPI("Requests", insightsAreHourly ? formatCount(requests24h) : formatCount(requests7d))
                        insightKPI("Active Modules", "\(insightsAreHourly ? activeModules24h : activeModules7d)")
                        insightKPI(insightsAreHourly ? "Peak Hour" : "Peak Day", insightsAreHourly ? peakHour.label : peakDay.label)
                        insightKPI("Peak Requests", formatCount(insightsAreHourly ? peakHour.value : peakDay.value))
                        insightKPI("Failed", formatCount(insightsAreHourly ? failed24h : failed7d))
                        insightKPI("Success Rate", String(format: "%.1f%%", insightsAreHourly ? successRate24h : successRate7d))
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Module totals")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Brand.muted(colorScheme))
                        let rows = insightsAreHourly ? moduleHourlyTotals : moduleDailyTotals
                        if rows.isEmpty {
                            Text(loadingCharts ? " " : "No module traffic yet")
                                .font(.caption)
                                .foregroundStyle(Brand.muted(colorScheme))
                        } else {
                            ForEach(rows.prefix(6)) { row in
                                HStack {
                                    Text(row.name)
                                        .font(.subheadline.weight(.medium))
                                        .foregroundStyle(Brand.text(colorScheme))
                                        .lineLimit(1)
                                    Spacer(minLength: 8)
                                    Text(formatCount(row.total))
                                        .font(.subheadline.weight(.semibold).monospacedDigit())
                                        .foregroundStyle(Brand.muted(colorScheme))
                                }
                            }
                        }
                    }
                }
                .opacity(metricsBusy ? 0.35 : 1)

                if loadingCharts && moduleHourlyTotals.isEmpty && moduleDailyTotals.isEmpty {
                    dashboardLoadingPanel(height: 180, label: "Loading insights")
                } else if metricsBusy {
                    dashboardLoadingPanel(height: 180, label: "Refreshing")
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect(.regular.tint(Color.primary.opacity(0.02)), in: RoundedRectangle(cornerRadius: ShellMetrics.cardRadius, style: .continuous))
    }

    private var dailyDetailsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Daily Request Details")
                    .font(.headline)
                    .foregroundStyle(Brand.text(colorScheme))
                Text("Latency breakdown for the last 7 days")
                    .font(.caption)
                    .foregroundStyle(Brand.muted(colorScheme))
            }
            if loadingCharts && dailyDetails.isEmpty {
                dashboardLoadingPanel(height: 160, label: "Loading details")
            } else if dailyDetails.isEmpty {
                Text("No daily stats yet")
                    .font(.subheadline)
                    .foregroundStyle(Brand.muted(colorScheme))
            } else {
                VStack(spacing: 0) {
                    detailHeader(["Day", "Req", "Avg", "Max", "Min"])
                    ForEach(dailyDetails) { row in
                        detailRow([
                            row.label,
                            formatCount(row.requests),
                            "\(Int(row.avg.rounded()))",
                            "\(Int(row.max.rounded()))",
                            "\(Int(row.min.rounded()))"
                        ])
                    }
                }
                .opacity(metricsBusy ? 0.4 : 1)
                .overlay {
                    if metricsBusy {
                        dashboardLoadingPanel(height: nil, label: "Refreshing")
                    }
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect(.regular.tint(Color.primary.opacity(0.02)), in: RoundedRectangle(cornerRadius: ShellMetrics.cardRadius, style: .continuous))
    }

    private var topServicesCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Top Called Services")
                    .font(.headline)
                    .foregroundStyle(Brand.text(colorScheme))
                Text("Last 7 days · \(selectedModule)")
                    .font(.caption)
                    .foregroundStyle(Brand.muted(colorScheme))
            }
            if loadingCharts && topServices.isEmpty {
                dashboardLoadingPanel(height: 160, label: "Loading services")
            } else if topServices.isEmpty {
                Text("No service traffic yet")
                    .font(.subheadline)
                    .foregroundStyle(Brand.muted(colorScheme))
            } else {
                VStack(spacing: 0) {
                    detailHeader(["Module", "Service", "Req"])
                    ForEach(topServices.prefix(8)) { row in
                        detailRow([shortModule(row.module), row.service, formatCount(row.requests)], weights: [0.28, 0.52, 0.2])
                    }
                }
                .opacity(metricsBusy ? 0.4 : 1)
                .overlay {
                    if metricsBusy {
                        dashboardLoadingPanel(height: nil, label: "Refreshing")
                    }
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect(.regular.tint(Color.primary.opacity(0.02)), in: RoundedRectangle(cornerRadius: ShellMetrics.cardRadius, style: .continuous))
    }

    private var quickAccessSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Quick access")
                .font(.title3.weight(.semibold))
                .foregroundStyle(Brand.text(colorScheme))
            LazyVGrid(
                columns: (usesWidePanels || contentWidth >= 520)
                    ? [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)]
                    : [GridItem(.flexible())],
                spacing: 10
            ) {
                ForEach(Array(listPages.prefix(8))) { page in
                    Button { open(page) } label: {
                        HStack(spacing: 10) {
                            Image(systemName: page.symbol)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Brand.action)
                                .frame(width: 28, height: 28)
                            Text(page.title)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Brand.text(colorScheme))
                                .lineLimit(2)
                                .multilineTextAlignment(.leading)
                            Spacer(minLength: 0)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .glassEffect(.regular.tint(Color.primary.opacity(0.02)), in: RoundedRectangle(cornerRadius: ShellMetrics.cardRadius, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func insightKPI(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(.caption2.weight(.bold))
                .tracking(0.4)
                .foregroundStyle(Brand.muted(colorScheme))
            Text(value)
                .font(.title3.weight(.bold))
                .foregroundStyle(Brand.text(colorScheme))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.primary.opacity(0.04), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func detailHeader(_ cols: [String]) -> some View {
        HStack(spacing: 6) {
            ForEach(Array(cols.enumerated()), id: \.offset) { index, title in
                Text(title)
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(Brand.muted(colorScheme))
                    .frame(maxWidth: .infinity, alignment: index == 0 ? .leading : .trailing)
            }
        }
        .padding(.vertical, 6)
    }

    private func detailRow(_ cols: [String], weights: [CGFloat]? = nil) -> some View {
        HStack(spacing: 6) {
            ForEach(Array(cols.enumerated()), id: \.offset) { index, value in
                Text(value)
                    .font(.caption.weight(index == 0 ? .semibold : .regular))
                    .foregroundStyle(Brand.text(colorScheme))
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: index == 0 ? .leading : .trailing)
            }
        }
        .padding(.vertical, 8)
        .overlay(alignment: .top) {
            Divider().opacity(0.35)
        }
    }

    private func dashboardLoadingPanel(height: CGFloat?, label: String) -> some View {
        VStack(spacing: 8) {
            QcLoadingMark(width: 58, label: label)
        }
        .frame(maxWidth: .infinity)
        .frame(height: height)
        .frame(maxHeight: height == nil ? .infinity : nil)
        .transition(.opacity)
        .accessibilityElement(children: .combine)
    }

    private func kpiCard(label: String, value: String, symbol: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: usesCompactMetrics ? 8 : 10) {
            HStack {
                Image(systemName: symbol)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(tint)
                Spacer(minLength: 0)
            }
            Text(value)
                .font(.system(size: usesCompactMetrics ? 22 : 28, weight: .bold, design: .rounded))
                .foregroundStyle(Brand.text(colorScheme))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label.uppercased())
                .font(.caption2.weight(.bold))
                .tracking(0.6)
                .foregroundStyle(Brand.muted(colorScheme))
                .lineLimit(2)
                .minimumScaleFactor(0.85)
        }
        .padding(usesCompactMetrics ? 12 : 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect(.regular.tint(tint.opacity(colorScheme == .dark ? 0.12 : 0.06)), in: RoundedRectangle(cornerRadius: ShellMetrics.cardRadius, style: .continuous))
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: .now)
        let hello = switch hour {
        case 5..<12: "Good morning"
        case 12..<17: "Good afternoon"
        default: "Good evening"
        }
        let person = session.name.trimmingCharacters(in: .whitespacesAndNewlines)
        return person.isEmpty ? hello : "\(hello), \(person)"
    }

    private func loadSummary() async {
        loadingSummary = true
        async let users = totalCount(module: "identity-module", model: "asp-net-users")
        async let groups = totalCount(module: "identity-module", model: "permission-groups")
        async let endpoints = totalCount(module: "identity-module", model: "api-method-definitions")
        usersCount = await users
        groupsCount = await groups
        endpointsCount = await endpoints
        loadingSummary = false
    }

    private func loadCharts() async {
        loadingCharts = true
        let slugs = activeSlugs
        async let hourly = fetchHourlySeries(slugs: slugs)
        async let daily = fetchDailyBundle(slugs: slugs)
        async let status = fetchStatus(slugs: slugs, pathSuffix: "stats-http-status-codes")
        async let status24 = fetchStatus(slugs: slugs, pathSuffix: "stats-http-status-codes-last-24-hours-by-module")
        async let tops = fetchTopServices(slugs: slugs)
        let (h, d, s, s24, t) = await (hourly, daily, status, status24, tops)
        hourlySeries = h.points
        moduleHourlyTotals = h.moduleTotals
        dailySeries = d.series
        durationPoints = d.duration
        dailyDetails = d.details
        moduleDailyTotals = d.moduleTotals
        statusPoints = s
        statusPoints24h = s24
        topServices = t
        loadingCharts = false
    }

    private func fetchHourlySeries(slugs: [String]) async -> (points: [DashboardSeriesPoint], moduleTotals: [DashboardNamedTotal]) {
        // Web portal parity: string hour keys in UTC (`yyyy-MM-dd HH:00:00`), window anchored to max data hour.
        var byModuleHour: [String: [String: Double]] = [:]
        var observedHours: [String] = []
        await withTaskGroup(of: (String, [(module: String, hour: String, value: Double)]).self) { group in
            for slug in slugs {
                group.addTask { @MainActor in
                    let fallback = self.modules.first(where: { $0.slug == slug })?.name ?? Self.sidebarModuleLabel(slug)
                    let rows = await self.decodeHourlyRows(path: "/api/\(slug)/audit-logs/stats-hourly-http-requests-by-module", fallbackModule: fallback)
                    return (slug, rows)
                }
            }
            for await (_, rows) in group {
                for row in rows {
                    observedHours.append(row.hour)
                    byModuleHour[row.module, default: [:]][row.hour, default: 0] += row.value
                }
            }
        }
        let keys = Self.last24HourKeys(observed: observedHours)
        var points: [DashboardSeriesPoint] = []
        var totals: [DashboardNamedTotal] = []
        for (module, hours) in byModuleHour.sorted(by: { $0.key < $1.key }) {
            var sum = 0.0
            for (index, key) in keys.enumerated() {
                let value = hours[key] ?? 0
                sum += value
                points.append(DashboardSeriesPoint(
                    id: "\(module)-\(key)",
                    series: module,
                    label: Self.hourLabel(fromKey: key),
                    value: value,
                    index: index
                ))
            }
            totals.append(DashboardNamedTotal(id: module, name: module, total: Int(sum)))
        }
        totals.sort { $0.total > $1.total }
        return (points, totals)
    }

    private func fetchDailyBundle(slugs: [String]) async -> (
        series: [DashboardSeriesPoint],
        duration: [DashboardDurationPoint],
        details: [DashboardDailyDetail],
        moduleTotals: [DashboardNamedTotal]
    ) {
        var byModuleDay: [String: [String: Double]] = [:]
        var durationAcc: [String: (sum: Double, count: Double, max: Double, min: Double, requests: Double)] = [:]

        await withTaskGroup(of: (String, [[String: Any]]).self) { group in
            for slug in slugs {
                group.addTask { @MainActor in
                    let byModule = await self.decodeDailyMaps(path: "/api/\(slug)/audit-logs/stats-daily-http-requests-by-day-by-module")
                    let byDay = await self.decodeDailyMaps(path: "/api/\(slug)/audit-logs/stats-daily-http-requests-by-day")
                    return (slug, byModule.isEmpty ? byDay : byModule)
                }
            }
            for await (slug, rows) in group {
                let fallback = modules.first(where: { $0.slug == slug })?.name ?? Self.sidebarModuleLabel(slug)
                for row in rows {
                    let dayRaw = Self.stringValue(row["requestDay"] ?? row["RequestDay"])
                    let bucket = Self.normalizeDayKey(dayRaw) ?? Self.utcDayKey(Date())
                    let moduleName = Self.stringValue(row["requestModule"] ?? row["RequestModule"])
                    let module = prettyModule(moduleName) ?? fallback
                    let total = Self.numberValue(row["totalRequests"] ?? row["TotalRequests"])
                    byModuleDay[module, default: [:]][bucket, default: 0] += total
                    var acc = durationAcc[bucket] ?? (0, 0, 0, .greatestFiniteMagnitude, 0)
                    let avg = Self.numberValue(row["avgDurationMs"] ?? row["AvgDurationMs"])
                    let maxValue = Self.numberValue(row["maxDurationMs"] ?? row["MaxDurationMs"])
                    let minValue = Self.numberValue(row["minDurationMs"] ?? row["MinDurationMs"])
                    if avg > 0 { acc.sum += avg; acc.count += 1 }
                    if maxValue > 0 { acc.max = Swift.max(acc.max, maxValue) }
                    if minValue > 0 { acc.min = Swift.min(acc.min, minValue) }
                    acc.requests += total
                    durationAcc[bucket] = acc
                }
            }
        }

        let keys = Self.last7DayKeys()
        var series: [DashboardSeriesPoint] = []
        var moduleTotals: [DashboardNamedTotal] = []
        for (module, days) in byModuleDay.sorted(by: { $0.key < $1.key }) {
            var sum = 0.0
            for (index, key) in keys.enumerated() {
                let value = days[key] ?? 0
                sum += value
                series.append(DashboardSeriesPoint(
                    id: "\(module)-\(key)",
                    series: module,
                    label: Self.dayLabel(fromKey: key),
                    value: value,
                    index: index
                ))
            }
            moduleTotals.append(DashboardNamedTotal(id: module, name: module, total: Int(sum)))
        }
        moduleTotals.sort { $0.total > $1.total }

        let duration = keys.map { key -> DashboardDurationPoint in
            let acc = durationAcc[key]
            let avg = (acc?.count ?? 0) > 0 ? (acc!.sum / acc!.count) : 0
            let maxV = acc?.max ?? 0
            let minV = (acc?.min == .greatestFiniteMagnitude) ? 0 : (acc?.min ?? 0)
            return DashboardDurationPoint(id: key, label: Self.dayLabel(fromKey: key), avg: avg, max: maxV, min: minV)
        }
        let details = keys.map { key -> DashboardDailyDetail in
            let acc = durationAcc[key]
            let avg = (acc?.count ?? 0) > 0 ? (acc!.sum / acc!.count) : 0
            let maxV = acc?.max ?? 0
            let minV = (acc?.min == .greatestFiniteMagnitude) ? 0 : (acc?.min ?? 0)
            return DashboardDailyDetail(
                id: key,
                label: Self.dayLabel(fromKey: key),
                requests: Int(acc?.requests ?? 0),
                avg: avg,
                max: maxV,
                min: minV
            )
        }
        return (series, duration, details, moduleTotals)
    }

    private func fetchStatus(slugs: [String], pathSuffix: String) async -> [DashboardChartPoint] {
        var totals: [Int: Double] = [:]
        await withTaskGroup(of: [(Int, Double)].self) { group in
            for slug in slugs {
                group.addTask { @MainActor in
                    await self.decodeStatus(path: "/api/\(slug)/audit-logs/\(pathSuffix)")
                }
            }
            for await rows in group {
                for (code, value) in rows {
                    totals[code, default: 0] += value
                }
            }
        }
        return totals.keys.sorted().map { code in
            DashboardChartPoint(id: "\(code)", label: "\(code)", value: totals[code] ?? 0)
        }
    }

    private func fetchTopServices(slugs: [String]) async -> [DashboardTopService] {
        var rows: [DashboardTopService] = []
        await withTaskGroup(of: [DashboardTopService].self) { group in
            for slug in slugs {
                group.addTask { @MainActor in
                    await self.decodeTopServices(path: "/api/\(slug)/audit-logs/stats-top-http-services-by-module")
                }
            }
            for await batch in group {
                rows.append(contentsOf: batch)
            }
        }
        // Keep top service per module, then overall top list.
        var bestByModule: [String: DashboardTopService] = [:]
        for row in rows {
            if let existing = bestByModule[row.module], existing.requests >= row.requests { continue }
            bestByModule[row.module] = row
        }
        return bestByModule.values.sorted { $0.requests > $1.requests }
    }

    /// Flexible JSON maps — modules disagree on casing / numeric shapes; Decodable was dropping rows.
    private func decodeHourlyRows(path: String, fallbackModule: String) async -> [(module: String, hour: String, value: Double)] {
        await decodeObjectMaps(path).compactMap { row in
            guard let raw = Self.stringValue(row["requestHour"] ?? row["RequestHour"]),
                  let hour = Self.normalizeHourKey(raw) else { return nil }
            let moduleRaw = Self.stringValue(row["requestModule"] ?? row["RequestModule"])
            let module = prettyModule(moduleRaw) ?? fallbackModule
            return (module, hour, Self.numberValue(row["totalRequests"] ?? row["TotalRequests"]))
        }
    }

    private func decodeDailyMaps(path: String) async -> [[String: Any]] {
        await decodeObjectMaps(path)
    }

    private func decodeStatus(path: String) async -> [(Int, Double)] {
        await decodeObjectMaps(path).compactMap { row in
            let code = Int(Self.numberValue(row["statusCode"] ?? row["StatusCode"]))
            guard code > 0 else { return nil }
            return (code, Self.numberValue(row["totalRequests"] ?? row["TotalRequests"]))
        }
    }

    private func decodeTopServices(path: String) async -> [DashboardTopService] {
        await decodeObjectMaps(path).compactMap { row in
            let moduleRaw = Self.stringValue(row["requestModule"] ?? row["RequestModule"])
            let module = prettyModule(moduleRaw) ?? moduleRaw ?? "Module"
            let action = Self.stringValue(row["action"] ?? row["Action"])
            let pathValue = Self.stringValue(row["requestPath"] ?? row["RequestPath"])
            let service = (action?.nilIfEmpty) ?? (pathValue?.nilIfEmpty) ?? "—"
            let requests = Int(Self.numberValue(row["totalRequests"] ?? row["TotalRequests"]))
            return DashboardTopService(
                id: "\(module)-\(service)-\(requests)",
                module: module,
                service: service,
                requests: requests
            )
        }
    }

    private func decodeObjectMaps(_ path: String) async -> [[String: Any]] {
        guard let data = try? await session.pathData(path),
              let json = try? JSONSerialization.jsonObject(with: data) else { return [] }
        if let rows = json as? [[String: Any]] { return rows }
        if let page = json as? [String: Any] {
            if let rows = page["items"] as? [[String: Any]] { return rows }
            if let rows = page["value"] as? [[String: Any]] { return rows }
        }
        return []
    }

    private static func stringValue(_ value: Any?) -> String? {
        if let text = value as? String {
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : trimmed
        }
        if let number = value as? NSNumber { return number.stringValue }
        return nil
    }

    private static func numberValue(_ value: Any?) -> Double {
        if let number = value as? NSNumber { return number.doubleValue }
        if let text = value as? String, let number = Double(text) { return number }
        return 0
    }

    private func totalCount(module: String, model: String) async -> Int? {
        do {
            let data = try await session.collectionData(module: module, model: model, page: 1, size: 1)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            if let total = json?["totalCount"] as? NSNumber { return total.intValue }
            if let total = json?["TotalCount"] as? NSNumber { return total.intValue }
            if let total = json?["totalCount"] as? Int { return total }
            if let total = json?["totalCount"] as? Double { return Int(total) }
            return nil
        } catch {
            return nil
        }
    }

    private func aggregate(_ series: [DashboardSeriesPoint]) -> [DashboardChartPoint] {
        var order: [String] = []
        var totals: [String: Double] = [:]
        for point in series {
            if totals[point.label] == nil { order.append(point.label) }
            totals[point.label, default: 0] += point.value
        }
        return order.map { DashboardChartPoint(id: $0, label: $0, value: totals[$0] ?? 0) }
    }

    private func peak(of points: [DashboardChartPoint], empty: String) -> (label: String, value: Int) {
        guard let best = points.max(by: { $0.value < $1.value }), best.value > 0 else {
            return (empty, 0)
        }
        return (best.label, Int(best.value))
    }

    private func successRate(from points: [DashboardChartPoint]) -> Double {
        let total = points.reduce(0.0) { $0 + $1.value }
        guard total > 0 else { return 0 }
        let failed = Double(failedCount(from: points))
        return ((total - failed) * 100) / total
    }

    private func failedCount(from points: [DashboardChartPoint]) -> Int {
        Int(points.reduce(0.0) { partial, point in
            let code = Int(point.label.filter(\.isNumber)) ?? 0
            // Match web portal: failures are >= 400 except 404.
            if code >= 400 && code != 404 { return partial + point.value }
            return partial
        })
    }

    private func uniqueSeries(_ points: [DashboardSeriesPoint]) -> [String] {
        var seen = Set<String>()
        var order: [String] = []
        for point in points where seen.insert(point.series).inserted {
            order.append(point.series)
        }
        return order
    }

    private func formatCount(_ value: Int) -> String {
        value.formatted(.number.grouping(.automatic))
    }

    private func shortModule(_ name: String) -> String {
        name.replacingOccurrences(of: " Module", with: "")
    }

    private func prettyModule(_ raw: String?) -> String? {
        guard let raw, !raw.isEmpty else { return nil }
        if let match = modules.first(where: {
            $0.slug.caseInsensitiveCompare(SessionStore.kebabModule(raw)) == .orderedSame
            || $0.name.caseInsensitiveCompare(raw) == .orderedSame
            || SessionStore.kebabModule($0.name).caseInsensitiveCompare(SessionStore.kebabModule(raw)) == .orderedSame
        }) {
            return match.name
        }
        return Self.sidebarModuleLabel(raw)
    }

    /// Matches web portal `ToSidebarModuleLabel` / kebab → spaced title.
    private static func sidebarModuleLabel(_ raw: String) -> String {
        var name = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if name.hasSuffix("-module") { name.removeLast("-module".count) }
        if name.hasSuffix("Module") { name.removeLast("Module".count) }
        name = name.replacingOccurrences(of: "-", with: " ")
        var spaced = ""
        for character in name {
            if character.isUppercase, let last = spaced.last, last.isLetter {
                spaced.append(" ")
            }
            spaced.append(character)
        }
        return spaced.split(separator: " ").map { $0.capitalized }.joined(separator: " ")
    }

    /// Web `BuildLast24HourKeys` — UTC hour strings, anchored to newest observed hour when present.
    private static func last24HourKeys(observed: [String], now: Date = .now) -> [String] {
        let end = observed.compactMap(parseUtcHour).max() ?? now
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let parts = calendar.dateComponents([.year, .month, .day, .hour], from: end)
        guard let floored = calendar.date(from: DateComponents(
            calendar: calendar,
            timeZone: TimeZone(secondsFromGMT: 0),
            year: parts.year,
            month: parts.month,
            day: parts.day,
            hour: parts.hour
        )) else { return [] }
        return (0..<24).map { offset in
            let date = calendar.date(byAdding: .hour, value: -23 + offset, to: floored) ?? floored
            return utcHourKey(date)
        }
    }

    private static func last7DayKeys(now: Date = .now) -> [String] {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let start = calendar.startOfDay(for: now)
        return (0..<7).map { offset in
            let date = calendar.date(byAdding: .day, value: -6 + offset, to: start) ?? start
            return utcDayKey(date)
        }
    }

    private static func utcHourKey(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(secondsFromGMT: 0)
        f.dateFormat = "yyyy-MM-dd HH:00:00"
        return f.string(from: date)
    }

    private static func utcDayKey(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(secondsFromGMT: 0)
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    private static func hourLabel(fromKey key: String) -> String {
        guard let date = parseUtcHour(key) else { return String(key.suffix(8).prefix(5)) }
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(secondsFromGMT: 0)
        f.dateFormat = "HH:mm"
        return f.string(from: date)
    }

    private static func dayLabel(fromKey key: String) -> String {
        guard let date = parseUtcDay(key) else { return key }
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(secondsFromGMT: 0)
        f.dateFormat = "EEE"
        return f.string(from: date)
    }

    /// Web `NormalizeRequestHourKey` — always `yyyy-MM-dd HH:00:00` for string equality joins.
    private static func normalizeHourKey(_ raw: String) -> String? {
        if let date = parseUtcHour(raw) { return utcHourKey(date) }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 13 else { return nil }
        let prefix = String(trimmed.prefix(13))
        return "\(prefix):00:00"
    }

    private static func normalizeDayKey(_ raw: String?) -> String? {
        guard let raw, !raw.isEmpty else { return nil }
        if let date = parseUtcDay(raw) { return utcDayKey(date) }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.count >= 10 ? String(trimmed.prefix(10)) : nil
    }

    private static func parseUtcHour(_ raw: String) -> Date? {
        let formats = [
            "yyyy-MM-dd HH:mm:ss",
            "yyyy-MM-dd'T'HH:mm:ss",
            "yyyy-MM-dd'T'HH:mm:ssZ",
            "yyyy-MM-dd'T'HH:mm:ssXXXXX",
            "yyyy-MM-dd HH:00:00"
        ]
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(secondsFromGMT: 0)
        for format in formats {
            f.dateFormat = format
            if let date = f.date(from: raw) { return date }
        }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        iso.timeZone = TimeZone(secondsFromGMT: 0)
        if let date = iso.date(from: raw) { return date }
        iso.formatOptions = [.withInternetDateTime]
        return iso.date(from: raw)
    }

    private static func parseUtcDay(_ raw: String) -> Date? {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(secondsFromGMT: 0)
        f.dateFormat = "yyyy-MM-dd"
        if let date = f.date(from: String(raw.prefix(10))) { return date }
        return parseUtcHour(raw)
    }
}

private enum DashboardChartTab: String, CaseIterable, Identifiable {
    case hourly, daily, duration, status
    var id: String { rawValue }

    var tabLabel: String {
        switch self {
        case .hourly: "24h Requests"
        case .daily: "7-Day Requests"
        case .duration: "Duration"
        case .status: "Status Codes"
        }
    }

    var chartTitle: String {
        switch self {
        case .hourly: "Module Requests (Last 24 Hours)"
        case .daily: "Daily HTTP Request Stats (Last 7 Days)"
        case .duration: "Duration Trends (Avg / Max / Min)"
        case .status: "HTTP Status Code Distribution"
        }
    }

    var chartSubtitle: String? {
        switch self {
        case .hourly: "Times shown in your local timezone"
        case .duration: "Milliseconds"
        default: nil
        }
    }
}

private struct DashboardChartPoint: Identifiable, Hashable {
    let id: String
    let label: String
    let value: Double
}

private struct DashboardSeriesPoint: Identifiable, Hashable {
    let id: String
    let series: String
    let label: String
    let value: Double
    let index: Int
}

private struct DashboardDurationPoint: Identifiable, Hashable {
    let id: String
    let label: String
    let avg: Double
    let max: Double
    let min: Double
}

private struct DashboardDailyDetail: Identifiable, Hashable {
    let id: String
    let label: String
    let requests: Int
    let avg: Double
    let max: Double
    let min: Double
}

private struct DashboardNamedTotal: Identifiable, Hashable {
    let id: String
    let name: String
    let total: Int
}

private struct DashboardTopService: Identifiable, Hashable {
    let id: String
    let module: String
    let service: String
    let requests: Int
}

private struct AuditHourlyDTO: Decodable {
    let requestModule: String?
    let requestHour: String?
    let totalRequests: Int?
}

private struct AuditDailyDTO: Decodable {
    let requestModule: String?
    let requestDay: String?
    let totalRequests: Int?
    let avgDurationMs: Double?
    let maxDurationMs: Double?
    let minDurationMs: Double?
}

private struct AuditStatusDTO: Decodable {
    let statusCode: Int?
    let totalRequests: Int?
}

private struct AuditTopServiceDTO: Decodable {
    let requestModule: String?
    let action: String?
    let requestPath: String?
    let totalRequests: Int?
}

private extension String {
    var nilIfEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

/// In-memory dashboard payload cache (5 minutes). Survives leaving/returning to Dashboard.
@MainActor
private final class PortalDashboardCache {
    static let shared = PortalDashboardCache()
    static let ttl: TimeInterval = 5 * 60

    struct Snapshot {
        var moduleKey: String
        var fetchedAt: Date
        var usersCount: Int?
        var groupsCount: Int?
        var endpointsCount: Int?
        var hourlySeries: [DashboardSeriesPoint]
        var dailySeries: [DashboardSeriesPoint]
        var durationPoints: [DashboardDurationPoint]
        var statusPoints: [DashboardChartPoint]
        var statusPoints24h: [DashboardChartPoint]
        var moduleHourlyTotals: [DashboardNamedTotal]
        var moduleDailyTotals: [DashboardNamedTotal]
        var dailyDetails: [DashboardDailyDetail]
        var topServices: [DashboardTopService]

        /// Failed/empty network rounds must not be reused (including all-zero chart shells).
        var isHollow: Bool {
            let traffic = hourlySeries.reduce(0.0) { $0 + $1.value }
                + dailySeries.reduce(0.0) { $0 + $1.value }
            return traffic <= 0
                && statusPoints.isEmpty
                && topServices.isEmpty
                && (usersCount ?? 0) == 0
                && (groupsCount ?? 0) == 0
        }
    }

    private var byModule: [String: Snapshot] = [:]

    func snapshot(for moduleKey: String) -> Snapshot? {
        guard let snap = byModule[moduleKey] else { return nil }
        guard Date().timeIntervalSince(snap.fetchedAt) < Self.ttl else {
            byModule.removeValue(forKey: moduleKey)
            return nil
        }
        if snap.isHollow {
            byModule.removeValue(forKey: moduleKey)
            return nil
        }
        return snap
    }

    func store(_ snapshot: Snapshot) {
        byModule[snapshot.moduleKey] = snapshot
    }

    func invalidate(_ moduleKey: String) {
        byModule.removeValue(forKey: moduleKey)
    }
}
