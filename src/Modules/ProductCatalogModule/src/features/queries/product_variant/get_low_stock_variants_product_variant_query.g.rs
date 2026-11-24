use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_repository::ProductVariantRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetLowStockVariantsProductVariantQuery {
    pub values: Vec<Value>,
}

pub struct GetLowStockVariantsProductVariantHandler;

impl Handler<GetLowStockVariantsProductVariantQuery> for GetLowStockVariantsProductVariantHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetLowStockVariantsProductVariantQuery) -> Result<Self::Output> {
        ProductVariantRepository::get_low_stock_variants(pool, query.values).await
    }
}
