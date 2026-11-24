use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_attribute_repository::ProductVariantAttributeRepository;
use anyhow::Result;

pub struct TotalItemCountProductVariantAttributeQuery;

pub struct TotalItemCountProductVariantAttributeHandler;

impl Handler<TotalItemCountProductVariantAttributeQuery> for TotalItemCountProductVariantAttributeHandler {
    type Output = i64;

    async fn handle(pool: &DbPool, _query: TotalItemCountProductVariantAttributeQuery) -> Result<Self::Output> {
        let rows = ProductVariantAttributeRepository::count(pool).await?;
        Ok(crate::db::scalar_number(&rows))
    }
}
