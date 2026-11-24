import Foundation
import QuickCodeHTTP

enum MediaUploadClient {
    struct Response: Decodable {
        let url: String
    }

    static func upload(
        data: Data,
        fileName: String,
        contentType: String,
        token: String?,
        apiKey: Bool
    ) async throws -> String {
        let endpoint = GatewayServer.url.appending(path: "api/gateway/media/upload")
        let boundary = "qc-\(UUID().uuidString)"
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        ClientHeaders.apply(to: &request)
        if let token, !token.isEmpty {
            if apiKey {
                request.setValue(token, forHTTPHeaderField: "X-Api-Key")
            } else {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
        }

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(contentType)\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        let (payload, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let detail = String(data: payload, encoding: .utf8)
            throw APIFailure.from(status: status, detail: detail)
        }
        if let decoded = try? JSONDecoder().decode(Response.self, from: payload), !decoded.url.isEmpty {
            return decoded.url
        }
        if let object = try? JSONSerialization.jsonObject(with: payload) as? [String: Any],
           let url = object["url"] as? String, !url.isEmpty {
            return url
        }
        throw APIFailure(status: status, message: "Upload succeeded but no URL was returned.")
    }
}
