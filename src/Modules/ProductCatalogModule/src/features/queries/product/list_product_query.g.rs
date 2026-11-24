use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;
use serde_json::Value;

pub struct ListProductQuery {
    pub page: i64,
    pub size: i64,
    pub include_count: bool,
}

pub struct ListProductResult {
    pub items: Vec<Value>,
    pub total_count: Option<i64>,
}

pub struct ListProductHandler;

impl Handler<ListProductQuery> for ListProductHandler {
    type Output = ListProductResult;

    async fn handle(pool: &DbPool, query: ListProductQuery) -> Result<Self::Output> {
        let rows = ProductRepository::list(pool, query.page, query.size).await?;
        let total_count = if query.include_count {
            let count_rows = ProductRepository::count(pool).await?;
            Some(crate::db::scalar_number(&count_rows))
        } else {
            None
        };
        Ok(ListProductResult { items: rows, total_count })
    }
}
