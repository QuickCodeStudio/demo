use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct InsertProductCommand {
    pub body: HashMap<String, Value>,
}

pub struct InsertProductHandler;

impl Handler<InsertProductCommand> for InsertProductHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: InsertProductCommand) -> Result<Self::Output> {
        ProductRepository::insert(pool, command.body).await
    }
}
