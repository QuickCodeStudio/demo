use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_attribute_repository::ProductVariantAttributeRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetItemProductVariantAttributeQuery {
    pub variant_id: serde_json::Value,
    pub attribute_value_id: serde_json::Value,
}

pub struct GetItemProductVariantAttributeHandler;

impl Handler<GetItemProductVariantAttributeQuery> for GetItemProductVariantAttributeHandler {
    type Output = Option<Value>;

    async fn handle(pool: &DbPool, query: GetItemProductVariantAttributeQuery) -> Result<Self::Output> {
        ProductVariantAttributeRepository::get_by_pk(pool, query.variant_id, query.attribute_value_id).await
    }
}
