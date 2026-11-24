use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_category_repository::ProductCategoryRepository;
use anyhow::Result;
use serde_json::Value;

pub struct ListProductCategoryQuery {
    pub page: i64,
    pub size: i64,
    pub include_count: bool,
}

pub struct ListProductCategoryResult {
    pub items: Vec<Value>,
    pub total_count: Option<i64>,
}

pub struct ListProductCategoryHandler;

impl Handler<ListProductCategoryQuery> for ListProductCategoryHandler {
    type Output = ListProductCategoryResult;

    async fn handle(pool: &DbPool, query: ListProductCategoryQuery) -> Result<Self::Output> {
        let rows = ProductCategoryRepository::list(pool, query.page, query.size).await?;
        let total_count = if query.include_count {
            let count_rows = ProductCategoryRepository::count(pool).await?;
            Some(crate::db::scalar_number(&count_rows))
        } else {
            None
        };
        Ok(ListProductCategoryResult { items: rows, total_count })
    }
}
