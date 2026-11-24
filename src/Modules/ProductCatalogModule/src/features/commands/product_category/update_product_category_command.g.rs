use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_category_repository::ProductCategoryRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct UpdateProductCategoryCommand {
    pub product_id: serde_json::Value,
    pub category_id: serde_json::Value,
    pub body: HashMap<String, Value>,
}

pub struct UpdateProductCategoryHandler;

impl Handler<UpdateProductCategoryCommand> for UpdateProductCategoryHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: UpdateProductCategoryCommand) -> Result<Self::Output> {
        ProductCategoryRepository::update(pool, command.product_id, command.category_id, command.body).await
    }
}
