use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::attribute_value_repository::AttributeValueRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetItemAttributeValueQuery {
    pub id: serde_json::Value,
}

pub struct GetItemAttributeValueHandler;

impl Handler<GetItemAttributeValueQuery> for GetItemAttributeValueHandler {
    type Output = Option<Value>;

    async fn handle(pool: &DbPool, query: GetItemAttributeValueQuery) -> Result<Self::Output> {
        AttributeValueRepository::get_by_pk(pool, query.id).await
    }
}
