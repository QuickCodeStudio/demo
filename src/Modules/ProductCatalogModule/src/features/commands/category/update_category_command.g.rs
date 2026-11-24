use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::category_repository::CategoryRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct UpdateCategoryCommand {
    pub id: serde_json::Value,
    pub body: HashMap<String, Value>,
}

pub struct UpdateCategoryHandler;

impl Handler<UpdateCategoryCommand> for UpdateCategoryHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: UpdateCategoryCommand) -> Result<Self::Output> {
        CategoryRepository::update(pool, command.id, command.body).await
    }
}
