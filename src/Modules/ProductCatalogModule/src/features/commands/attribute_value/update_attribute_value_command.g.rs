use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::attribute_value_repository::AttributeValueRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct UpdateAttributeValueCommand {
    pub id: serde_json::Value,
    pub body: HashMap<String, Value>,
}

pub struct UpdateAttributeValueHandler;

impl Handler<UpdateAttributeValueCommand> for UpdateAttributeValueHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: UpdateAttributeValueCommand) -> Result<Self::Output> {
        AttributeValueRepository::update(pool, command.id, command.body).await
    }
}
