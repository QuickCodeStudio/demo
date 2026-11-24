use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::attribute_value_repository::AttributeValueRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetByAttributeIdAttributeValueQuery {
    pub values: Vec<Value>,
}

pub struct GetByAttributeIdAttributeValueHandler;

impl Handler<GetByAttributeIdAttributeValueQuery> for GetByAttributeIdAttributeValueHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetByAttributeIdAttributeValueQuery) -> Result<Self::Output> {
        AttributeValueRepository::get_by_attribute_id(pool, query.values).await
    }
}
