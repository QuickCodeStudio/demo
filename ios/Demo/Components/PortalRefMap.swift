import Foundation

/// Generated from DBML Ref columns — do not edit by hand.
enum PortalRefMap {
    static func model(module: String, field: String) -> String? {
        switch (module, field) {
        case ("finance-settlement-module", "commissionModelId"): return "commission-models"
        case ("finance-settlement-module", "payoutId"): return "seller-payouts"
        case ("finance-settlement-module", "payoutPeriodId"): return "payout-periods"
        case ("identity-module", "apiKeyId"): return "api-keys"
        case ("identity-module", "apiMethodDefinitionKey"): return "api-method-definitions"
        case ("identity-module", "createdByUserId"): return "asp-net-users"
        case ("identity-module", "kafkaEventsTopicName"): return "kafka-events"
        case ("identity-module", "modelName"): return "models"
        case ("identity-module", "moduleName"): return "modules"
        case ("identity-module", "permissionGroupName"): return "permission-groups"
        case ("identity-module", "portalPageDefinitionKey"): return "portal-page-definitions"
        case ("identity-module", "roleId"): return "asp-net-roles"
        case ("identity-module", "userId"): return "asp-net-users"
        case ("order-management-module", "orderId"): return "orders"
        case ("order-management-module", "orderItemId"): return "order-items"
        case ("order-management-module", "shippingMethodId"): return "shipping-methods"
        case ("pricing-engine-module", "campaignId"): return "promotional-campaigns"
        case ("pricing-engine-module", "commissionModelId"): return "commission-models"
        case ("product-catalog-module", "attributeId"): return "attribute-definitions"
        case ("product-catalog-module", "attributeValueId"): return "attribute-values"
        case ("product-catalog-module", "brandId"): return "brands"
        case ("product-catalog-module", "categoryId"): return "categories"
        case ("product-catalog-module", "parentCategoryId"): return "categories"
        case ("product-catalog-module", "primaryCategoryId"): return "categories"
        case ("product-catalog-module", "productId"): return "products"
        case ("product-catalog-module", "variantId"): return "product-variants"
        case ("seller-management-module", "sellerId"): return "sellers"
        case ("seller-management-module", "sellerTierId"): return "seller-tiers"
        default: return nil
        }
    }
}
