use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::brand_repository::BrandRepository;
use anyhow::Result;
use serde_json::Value;

pub struct ListBrandQuery {
    pub page: i64,
    pub size: i64,
    pub include_count: bool,
}

pub struct ListBrandResult {
    pub items: Vec<Value>,
    pub total_count: Option<i64>,
}

pub struct ListBrandHandler;

impl Handler<ListBrandQuery> for ListBrandHandler {
    type Output = ListBrandResult;

    async fn handle(pool: &DbPool, query: ListBrandQuery) -> Result<Self::Output> {
        let rows = BrandRepository::list(pool, query.page, query.size).await?;
        let total_count = if query.include_count {
            let count_rows = BrandRepository::count(pool).await?;
            Some(crate::db::scalar_number(&count_rows))
        } else {
            None
        };
        Ok(ListBrandResult { items: rows, total_count })
    }
}
