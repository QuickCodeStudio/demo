use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_attribute_repository::ProductVariantAttributeRepository;
use anyhow::Result;
use serde_json::Value;

pub struct ListProductVariantAttributeQuery {
    pub page: i64,
    pub size: i64,
    pub include_count: bool,
}

pub struct ListProductVariantAttributeResult {
    pub items: Vec<Value>,
    pub total_count: Option<i64>,
}

pub struct ListProductVariantAttributeHandler;

impl Handler<ListProductVariantAttributeQuery> for ListProductVariantAttributeHandler {
    type Output = ListProductVariantAttributeResult;

    async fn handle(pool: &DbPool, query: ListProductVariantAttributeQuery) -> Result<Self::Output> {
        let rows = ProductVariantAttributeRepository::list(pool, query.page, query.size).await?;
        let total_count = if query.include_count {
            let count_rows = ProductVariantAttributeRepository::count(pool).await?;
            Some(crate::db::scalar_number(&count_rows))
        } else {
            None
        };
        Ok(ListProductVariantAttributeResult { items: rows, total_count })
    }
}
