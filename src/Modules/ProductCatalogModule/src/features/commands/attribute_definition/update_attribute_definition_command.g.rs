use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::attribute_definition_repository::AttributeDefinitionRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct UpdateAttributeDefinitionCommand {
    pub id: serde_json::Value,
    pub body: HashMap<String, Value>,
}

pub struct UpdateAttributeDefinitionHandler;

impl Handler<UpdateAttributeDefinitionCommand> for UpdateAttributeDefinitionHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: UpdateAttributeDefinitionCommand) -> Result<Self::Output> {
        AttributeDefinitionRepository::update(pool, command.id, command.body).await
    }
}
