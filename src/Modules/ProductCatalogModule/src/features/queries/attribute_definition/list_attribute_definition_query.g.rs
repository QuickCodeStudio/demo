use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::attribute_definition_repository::AttributeDefinitionRepository;
use anyhow::Result;
use serde_json::Value;

pub struct ListAttributeDefinitionQuery {
    pub page: i64,
    pub size: i64,
    pub include_count: bool,
}

pub struct ListAttributeDefinitionResult {
    pub items: Vec<Value>,
    pub total_count: Option<i64>,
}

pub struct ListAttributeDefinitionHandler;

impl Handler<ListAttributeDefinitionQuery> for ListAttributeDefinitionHandler {
    type Output = ListAttributeDefinitionResult;

    async fn handle(pool: &DbPool, query: ListAttributeDefinitionQuery) -> Result<Self::Output> {
        let rows = AttributeDefinitionRepository::list(pool, query.page, query.size).await?;
        let total_count = if query.include_count {
            let count_rows = AttributeDefinitionRepository::count(pool).await?;
            Some(crate::db::scalar_number(&count_rows))
        } else {
            None
        };
        Ok(ListAttributeDefinitionResult { items: rows, total_count })
    }
}
