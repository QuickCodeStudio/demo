use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::attribute_value_repository::AttributeValueRepository;
use anyhow::Result;
use serde_json::Value;

pub struct ListAttributeValueQuery {
    pub page: i64,
    pub size: i64,
    pub include_count: bool,
}

pub struct ListAttributeValueResult {
    pub items: Vec<Value>,
    pub total_count: Option<i64>,
}

pub struct ListAttributeValueHandler;

impl Handler<ListAttributeValueQuery> for ListAttributeValueHandler {
    type Output = ListAttributeValueResult;

    async fn handle(pool: &DbPool, query: ListAttributeValueQuery) -> Result<Self::Output> {
        let rows = AttributeValueRepository::list(pool, query.page, query.size).await?;
        let total_count = if query.include_count {
            let count_rows = AttributeValueRepository::count(pool).await?;
            Some(crate::db::scalar_number(&count_rows))
        } else {
            None
        };
        Ok(ListAttributeValueResult { items: rows, total_count })
    }
}
