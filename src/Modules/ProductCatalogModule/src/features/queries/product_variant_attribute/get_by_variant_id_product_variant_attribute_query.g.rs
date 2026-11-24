use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_attribute_repository::ProductVariantAttributeRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetByVariantIdProductVariantAttributeQuery {
    pub values: Vec<Value>,
}

pub struct GetByVariantIdProductVariantAttributeHandler;

impl Handler<GetByVariantIdProductVariantAttributeQuery> for GetByVariantIdProductVariantAttributeHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetByVariantIdProductVariantAttributeQuery) -> Result<Self::Output> {
        ProductVariantAttributeRepository::get_by_variant_id(pool, query.values).await
    }
}
