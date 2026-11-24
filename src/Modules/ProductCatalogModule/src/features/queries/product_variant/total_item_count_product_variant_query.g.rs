use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_repository::ProductVariantRepository;
use anyhow::Result;

pub struct TotalItemCountProductVariantQuery;

pub struct TotalItemCountProductVariantHandler;

impl Handler<TotalItemCountProductVariantQuery> for TotalItemCountProductVariantHandler {
    type Output = i64;

    async fn handle(pool: &DbPool, _query: TotalItemCountProductVariantQuery) -> Result<Self::Output> {
        let rows = ProductVariantRepository::count(pool).await?;
        Ok(crate::db::scalar_number(&rows))
    }
}
