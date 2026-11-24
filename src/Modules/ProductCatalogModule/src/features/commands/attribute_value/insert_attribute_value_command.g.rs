use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::attribute_value_repository::AttributeValueRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct InsertAttributeValueCommand {
    pub body: HashMap<String, Value>,
}

pub struct InsertAttributeValueHandler;

impl Handler<InsertAttributeValueCommand> for InsertAttributeValueHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: InsertAttributeValueCommand) -> Result<Self::Output> {
        AttributeValueRepository::insert(pool, command.body).await
    }
}
