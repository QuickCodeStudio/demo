use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_repository::ProductVariantRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetByProductIdProductVariantQuery {
    pub values: Vec<Value>,
}

pub struct GetByProductIdProductVariantHandler;

impl Handler<GetByProductIdProductVariantQuery> for GetByProductIdProductVariantHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetByProductIdProductVariantQuery) -> Result<Self::Output> {
        ProductVariantRepository::get_by_product_id(pool, query.values).await
    }
}
