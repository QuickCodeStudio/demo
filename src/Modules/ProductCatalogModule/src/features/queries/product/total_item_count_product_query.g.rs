use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;

pub struct TotalItemCountProductQuery;

pub struct TotalItemCountProductHandler;

impl Handler<TotalItemCountProductQuery> for TotalItemCountProductHandler {
    type Output = i64;

    async fn handle(pool: &DbPool, _query: TotalItemCountProductQuery) -> Result<Self::Output> {
        let rows = ProductRepository::count(pool).await?;
        Ok(crate::db::scalar_number(&rows))
    }
}
