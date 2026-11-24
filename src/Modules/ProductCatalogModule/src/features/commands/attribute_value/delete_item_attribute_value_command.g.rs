use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::attribute_value_repository::AttributeValueRepository;
use anyhow::Result;

pub struct DeleteItemAttributeValueCommand {
    pub id: serde_json::Value,
}

pub struct DeleteItemAttributeValueHandler;

impl Handler<DeleteItemAttributeValueCommand> for DeleteItemAttributeValueHandler {
    type Output = Vec<serde_json::Value>;

    async fn handle(pool: &DbPool, command: DeleteItemAttributeValueCommand) -> Result<Self::Output> {
        AttributeValueRepository::delete(pool, command.id).await
    }
}
