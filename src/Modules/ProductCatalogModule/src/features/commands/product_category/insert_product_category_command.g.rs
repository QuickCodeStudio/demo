use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_category_repository::ProductCategoryRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct InsertProductCategoryCommand {
    pub body: HashMap<String, Value>,
}

pub struct InsertProductCategoryHandler;

impl Handler<InsertProductCategoryCommand> for InsertProductCategoryHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: InsertProductCategoryCommand) -> Result<Self::Output> {
        ProductCategoryRepository::insert(pool, command.body).await
    }
}
