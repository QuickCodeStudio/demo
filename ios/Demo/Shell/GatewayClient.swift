import Foundation

struct GatewayError: LocalizedError {
    let message: String
    let status: Int

    var errorDescription: String? { message }
}
