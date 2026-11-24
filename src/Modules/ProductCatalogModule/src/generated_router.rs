//! Generated — merge all table routers.
use axum::Router;
use crate::platform::AppState;
use crate::routes::product_routes::product_routes;
use crate::routes::product_variant_routes::product_variant_routes;
use crate::routes::category_routes::category_routes;
use crate::routes::product_category_routes::product_category_routes;
use crate::routes::brand_routes::brand_routes;
use crate::routes::attribute_definition_routes::attribute_definition_routes;
use crate::routes::attribute_value_routes::attribute_value_routes;
use crate::routes::product_variant_attribute_routes::product_variant_attribute_routes;
use crate::routes::audit_log_routes::audit_log_routes;

pub fn build_router() -> Router<AppState> {
    let mut router = Router::new();
    router = router.merge(product_routes());
    router = router.merge(product_variant_routes());
    router = router.merge(category_routes());
    router = router.merge(product_category_routes());
    router = router.merge(brand_routes());
    router = router.merge(attribute_definition_routes());
    router = router.merge(attribute_value_routes());
    router = router.merge(product_variant_attribute_routes());
    router = router.merge(audit_log_routes());
    router
}
