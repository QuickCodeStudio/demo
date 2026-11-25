// swift-tools-version: 6.1
import PackageDescription

let package = Package(
    name: "QuickCodeClients",
    platforms: [.iOS(.v18), .macOS(.v14)],
    products: [
        .library(name: "QuickCodeHTTP", targets: ["QuickCodeHTTP"]),
        .library(name: "FinanceSettlementModuleClient", targets: ["FinanceSettlementModuleClient"]),
        .library(name: "IdentityClient", targets: ["IdentityClient"]),
        .library(name: "OrderManagementModuleClient", targets: ["OrderManagementModuleClient"]),
        .library(name: "PricingEngineModuleClient", targets: ["PricingEngineModuleClient"]),
        .library(name: "ProductCatalogModuleClient", targets: ["ProductCatalogModuleClient"]),
        .library(name: "SellerManagementModuleClient", targets: ["SellerManagementModuleClient"]),
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-openapi-runtime", from: "1.7.0"),
        .package(url: "https://github.com/apple/swift-openapi-urlsession", from: "1.0.0"),
        .package(url: "https://github.com/apple/swift-http-types", from: "1.0.0"),
        .package(url: "https://github.com/apple/swift-openapi-generator", from: "1.7.0"),
    ],
    targets: [
        .target(
            name: "QuickCodeHTTP",
            dependencies: [
                .product(name: "OpenAPIRuntime", package: "swift-openapi-runtime"),
                .product(name: "HTTPTypes", package: "swift-http-types"),
            ]
        ),
        .target(
            name: "FinanceSettlementModuleClient",
            dependencies: [
                "QuickCodeHTTP",
                .product(name: "OpenAPIRuntime", package: "swift-openapi-runtime"),
                .product(name: "OpenAPIURLSession", package: "swift-openapi-urlsession"),
            ],
            plugins: [.plugin(name: "OpenAPIGenerator", package: "swift-openapi-generator")]
        ),
        .target(
            name: "IdentityClient",
            dependencies: [
                "QuickCodeHTTP",
                .product(name: "OpenAPIRuntime", package: "swift-openapi-runtime"),
                .product(name: "OpenAPIURLSession", package: "swift-openapi-urlsession"),
            ],
            plugins: [.plugin(name: "OpenAPIGenerator", package: "swift-openapi-generator")]
        ),
        .target(
            name: "OrderManagementModuleClient",
            dependencies: [
                "QuickCodeHTTP",
                .product(name: "OpenAPIRuntime", package: "swift-openapi-runtime"),
                .product(name: "OpenAPIURLSession", package: "swift-openapi-urlsession"),
            ],
            plugins: [.plugin(name: "OpenAPIGenerator", package: "swift-openapi-generator")]
        ),
        .target(
            name: "PricingEngineModuleClient",
            dependencies: [
                "QuickCodeHTTP",
                .product(name: "OpenAPIRuntime", package: "swift-openapi-runtime"),
                .product(name: "OpenAPIURLSession", package: "swift-openapi-urlsession"),
            ],
            plugins: [.plugin(name: "OpenAPIGenerator", package: "swift-openapi-generator")]
        ),
        .target(
            name: "ProductCatalogModuleClient",
            dependencies: [
                "QuickCodeHTTP",
                .product(name: "OpenAPIRuntime", package: "swift-openapi-runtime"),
                .product(name: "OpenAPIURLSession", package: "swift-openapi-urlsession"),
            ],
            plugins: [.plugin(name: "OpenAPIGenerator", package: "swift-openapi-generator")]
        ),
        .target(
            name: "SellerManagementModuleClient",
            dependencies: [
                "QuickCodeHTTP",
                .product(name: "OpenAPIRuntime", package: "swift-openapi-runtime"),
                .product(name: "OpenAPIURLSession", package: "swift-openapi-urlsession"),
            ],
            plugins: [.plugin(name: "OpenAPIGenerator", package: "swift-openapi-generator")]
        ),
    ]
)
