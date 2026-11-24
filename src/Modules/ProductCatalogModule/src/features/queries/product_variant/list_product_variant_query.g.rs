use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_repository::ProductVariantRepository;
use anyhow::Result;
use serde_json::Value;

pub struct ListProductVariantQuery {
    pub page: i64,
    pub size: i64,
    pub include_count: bool,
}

pub struct ListProductVariantResult {
    pub items: Vec<Value>,
    pub total_count: Option<i64>,
}

pub struct ListProductVariantHandler;

impl Handler<ListProductVariantQuery> for ListProductVariantHandler {
    type Output = ListProductVariantResult;

    async fn handle(pool: &DbPool, query: ListProductVariantQuery) -> Result<Self::Output> {
        let rows = ProductVariantRepository::list(pool, query.page, query.size).await?;
        let total_count = if query.include_count {
            let count_rows = ProductVariantRepository::count(pool).await?;
            Some(crate::db::scalar_number(&count_rows))
        } else {
            None
        };
        Ok(ListProductVariantResult { items: rows, total_count })
    }
}
