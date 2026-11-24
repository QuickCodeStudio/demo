use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::attribute_definition_repository::AttributeDefinitionRepository;
use anyhow::Result;

pub struct DeleteItemAttributeDefinitionCommand {
    pub id: serde_json::Value,
}

pub struct DeleteItemAttributeDefinitionHandler;

impl Handler<DeleteItemAttributeDefinitionCommand> for DeleteItemAttributeDefinitionHandler {
    type Output = Vec<serde_json::Value>;

    async fn handle(pool: &DbPool, command: DeleteItemAttributeDefinitionCommand) -> Result<Self::Output> {
        AttributeDefinitionRepository::delete(pool, command.id).await
    }
}
