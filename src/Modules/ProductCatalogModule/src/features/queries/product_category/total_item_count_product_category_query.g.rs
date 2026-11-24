use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_category_repository::ProductCategoryRepository;
use anyhow::Result;

pub struct TotalItemCountProductCategoryQuery;

pub struct TotalItemCountProductCategoryHandler;

impl Handler<TotalItemCountProductCategoryQuery> for TotalItemCountProductCategoryHandler {
    type Output = i64;

    async fn handle(pool: &DbPool, _query: TotalItemCountProductCategoryQuery) -> Result<Self::Output> {
        let rows = ProductCategoryRepository::count(pool).await?;
        Ok(crate::db::scalar_number(&rows))
    }
}
