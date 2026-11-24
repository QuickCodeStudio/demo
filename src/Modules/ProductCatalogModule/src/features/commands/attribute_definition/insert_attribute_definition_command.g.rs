use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::attribute_definition_repository::AttributeDefinitionRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct InsertAttributeDefinitionCommand {
    pub body: HashMap<String, Value>,
}

pub struct InsertAttributeDefinitionHandler;

impl Handler<InsertAttributeDefinitionCommand> for InsertAttributeDefinitionHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: InsertAttributeDefinitionCommand) -> Result<Self::Output> {
        AttributeDefinitionRepository::insert(pool, command.body).await
    }
}
