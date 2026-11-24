use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::attribute_definition_repository::AttributeDefinitionRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetByCodeAttributeDefinitionQuery {
    pub values: Vec<Value>,
}

pub struct GetByCodeAttributeDefinitionHandler;

impl Handler<GetByCodeAttributeDefinitionQuery> for GetByCodeAttributeDefinitionHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetByCodeAttributeDefinitionQuery) -> Result<Self::Output> {
        AttributeDefinitionRepository::get_by_code(pool, query.values).await
    }
}
