use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_repository::ProductVariantRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetActiveByProductIdProductVariantQuery {
    pub values: Vec<Value>,
}

pub struct GetActiveByProductIdProductVariantHandler;

impl Handler<GetActiveByProductIdProductVariantQuery> for GetActiveByProductIdProductVariantHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetActiveByProductIdProductVariantQuery) -> Result<Self::Output> {
        ProductVariantRepository::get_active_by_product_id(pool, query.values).await
    }
}
