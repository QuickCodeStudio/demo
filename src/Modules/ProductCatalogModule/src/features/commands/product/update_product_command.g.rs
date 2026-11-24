use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct UpdateProductCommand {
    pub id: serde_json::Value,
    pub body: HashMap<String, Value>,
}

pub struct UpdateProductHandler;

impl Handler<UpdateProductCommand> for UpdateProductHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: UpdateProductCommand) -> Result<Self::Output> {
        ProductRepository::update(pool, command.id, command.body).await
    }
}
