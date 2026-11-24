import SwiftUI
import UIKit

/// Shake the device to open a developer/support dump of recent failures.
struct PortalShakeReportModifier: ViewModifier {
    @State private var open = false

    func body(content: Content) -> some View {
        content
            .onReceive(NotificationCenter.default.publisher(for: .portalDeviceDidShake)) { _ in
                open = true
            }
            .sheet(isPresented: $open) {
                PortalShakeReportSheet()
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
    }
}

extension View {
    func portalShakeToReport() -> some View {
        modifier(PortalShakeReportModifier())
    }
}

private struct PortalShakeReportSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    @State private var entries = PortalErrors.recent

    var body: some View {
        NavigationStack {
            Group {
                if entries.isEmpty {
                    ContentUnavailableView(
                        "No recent errors",
                        systemImage: "checkmark.seal",
                        description: Text("Shake again after something fails to capture details.")
                    )
                } else {
                    List {
                        ForEach(entries) { entry in
                            VStack(alignment: .leading, spacing: 8) {
                                Text(entry.userMessage)
                                    .font(.subheadline.weight(.semibold))
                                Text(entry.date.formatted(date: .abbreviated, time: .standard))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                Text(entry.technical)
                                    .font(.system(.caption2, design: .monospaced))
                                    .foregroundStyle(.secondary)
                                    .textSelection(.enabled)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Error report")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    if !entries.isEmpty {
                        ShareLink(item: reportText) {
                            Image(systemName: "square.and.arrow.up")
                        }
                    }
                }
                ToolbarItem(placement: .bottomBar) {
                    Button("Clear log", role: .destructive) {
                        PortalErrors.clear()
                        entries = []
                    }
                    .disabled(entries.isEmpty)
                }
            }
            .onAppear { entries = PortalErrors.recent }
        }
    }

    private var reportText: String {
        entries.map { entry in
            """
            [\(entry.date.formatted())] \(entry.userMessage)
            \(entry.technical)
            """
        }
        .joined(separator: "\n\n———\n\n")
    }
}
