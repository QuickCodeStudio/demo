use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::category_repository::CategoryRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct InsertCategoryCommand {
    pub body: HashMap<String, Value>,
}

pub struct InsertCategoryHandler;

impl Handler<InsertCategoryCommand> for InsertCategoryHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: InsertCategoryCommand) -> Result<Self::Output> {
        CategoryRepository::insert(pool, command.body).await
    }
}
