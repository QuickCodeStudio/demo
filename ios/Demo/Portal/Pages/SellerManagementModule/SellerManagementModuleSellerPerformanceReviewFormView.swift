import SwiftUI
import QuickCodeHTTP
import SellerManagementModuleClient

struct SellerManagementModuleSellerPerformanceReviewFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var sellerId = ""
    @State private var reviewerId = ""
    @State private var rating = ""
    @State private var comment = ""
    @State private var reviewDate = Date()
    @State private var busy = false
    @State private var failure: String?

    private var ready: Bool { true }

    var body: some View {
                Group {
            if !keys.isEmpty, !loaded {
                LoadingState()
            } else {ScreenCanvas {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    PortalForeignKeyField(label: "seller", module: "seller-management-module", model: "sellers", text: $sellerId)
                    NumberField(label: "reviewer Id", text: $reviewerId)
                    NumberField(label: "rating", text: $rating)
                    LongTextField(label: "comment", text: $comment)
                    DateField(label: "review Date", date: $reviewDate)
                    if let failure {
                        Text(failure).foregroundStyle(.red)
                    }
                    PrimaryButton(title: busy ? "Saving…" : "Save") { Task { await save() } }
                        .disabled(busy || !ready)
                }
                .padding(ShellMetrics.screenPadding)
            }
        }
            }
        }
        .navigationTitle(keys.isEmpty ? "Seller Performance Reviews" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.SellerPerformanceReviewsInsert(body: .json(.init(value1: .init(
                id: 0,
                sellerId: Int32(sellerId) ?? 0,
                reviewerId: Int32(reviewerId) ?? 0,
                rating: Int32(rating) ?? 0,
                comment: comment,
                reviewDate: reviewDate
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.SellerPerformanceReviewsUpdate(path: .init(id: Int32(keys[0]) ?? 0), body: .json(.init(value1: .init(
                id: Int32(keys[0]) ?? 0,
                sellerId: Int32(sellerId) ?? 0,
                reviewerId: Int32(reviewerId) ?? 0,
                rating: Int32(rating) ?? 0,
                comment: comment,
                reviewDate: reviewDate
            ))))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            }
            toast.show("Saved")
            dismiss()
        } catch {
            failure = PortalErrors.record(error)
        }
        busy = false
    }

    private func loadExisting() async {
        guard !keys.isEmpty, !loaded else {
            loaded = true
            return
        }
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.SellerPerformanceReviewsGetItem(path: .init(id: Int32(keys[0]) ?? 0))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            sellerId = item.sellerId.map { PortalNumber.integer($0) } ?? ""
            reviewerId = item.reviewerId.map { PortalNumber.integer($0) } ?? ""
            rating = item.rating.map { PortalNumber.integer($0) } ?? ""
            comment = item.comment ?? ""
            reviewDate = item.reviewDate ?? Date()
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}