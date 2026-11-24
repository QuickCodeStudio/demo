import Foundation
import OpenAPIRuntime
import OpenAPIURLSession
import QuickCodeHTTP

public func makeClient(middlewares: [any ClientMiddleware] = []) -> Client {
    Client(
        serverURL: GatewayServer.url,
        configuration: .init(dateTranscoder: GatewayDateTranscoder()),
        transport: URLSessionTransport(),
        middlewares: [ClientHeadersMiddleware()] + middlewares
    )
}

public func makeClient(authorizer: any AccessAuthorizing) -> Client {
    makeClient(middlewares: [BearerMiddleware(authorizer: authorizer)])
}
