use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::brand_repository::BrandRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct InsertBrandCommand {
    pub body: HashMap<String, Value>,
}

pub struct InsertBrandHandler;

impl Handler<InsertBrandCommand> for InsertBrandHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: InsertBrandCommand) -> Result<Self::Output> {
        BrandRepository::insert(pool, command.body).await
    }
}
