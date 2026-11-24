use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::attribute_definition_repository::AttributeDefinitionRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetItemAttributeDefinitionQuery {
    pub id: serde_json::Value,
}

pub struct GetItemAttributeDefinitionHandler;

impl Handler<GetItemAttributeDefinitionQuery> for GetItemAttributeDefinitionHandler {
    type Output = Option<Value>;

    async fn handle(pool: &DbPool, query: GetItemAttributeDefinitionQuery) -> Result<Self::Output> {
        AttributeDefinitionRepository::get_by_pk(pool, query.id).await
    }
}
