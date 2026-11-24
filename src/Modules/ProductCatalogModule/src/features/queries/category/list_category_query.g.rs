use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::category_repository::CategoryRepository;
use anyhow::Result;
use serde_json::Value;

pub struct ListCategoryQuery {
    pub page: i64,
    pub size: i64,
    pub include_count: bool,
}

pub struct ListCategoryResult {
    pub items: Vec<Value>,
    pub total_count: Option<i64>,
}

pub struct ListCategoryHandler;

impl Handler<ListCategoryQuery> for ListCategoryHandler {
    type Output = ListCategoryResult;

    async fn handle(pool: &DbPool, query: ListCategoryQuery) -> Result<Self::Output> {
        let rows = CategoryRepository::list(pool, query.page, query.size).await?;
        let total_count = if query.include_count {
            let count_rows = CategoryRepository::count(pool).await?;
            Some(crate::db::scalar_number(&count_rows))
        } else {
            None
        };
        Ok(ListCategoryResult { items: rows, total_count })
    }
}
