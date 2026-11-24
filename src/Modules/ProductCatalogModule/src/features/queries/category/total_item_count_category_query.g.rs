use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::category_repository::CategoryRepository;
use anyhow::Result;

pub struct TotalItemCountCategoryQuery;

pub struct TotalItemCountCategoryHandler;

impl Handler<TotalItemCountCategoryQuery> for TotalItemCountCategoryHandler {
    type Output = i64;

    async fn handle(pool: &DbPool, _query: TotalItemCountCategoryQuery) -> Result<Self::Output> {
        let rows = CategoryRepository::count(pool).await?;
        Ok(crate::db::scalar_number(&rows))
    }
}
