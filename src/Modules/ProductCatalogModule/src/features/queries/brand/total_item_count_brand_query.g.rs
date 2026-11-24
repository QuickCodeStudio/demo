use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::brand_repository::BrandRepository;
use anyhow::Result;

pub struct TotalItemCountBrandQuery;

pub struct TotalItemCountBrandHandler;

impl Handler<TotalItemCountBrandQuery> for TotalItemCountBrandHandler {
    type Output = i64;

    async fn handle(pool: &DbPool, _query: TotalItemCountBrandQuery) -> Result<Self::Output> {
        let rows = BrandRepository::count(pool).await?;
        Ok(crate::db::scalar_number(&rows))
    }
}
