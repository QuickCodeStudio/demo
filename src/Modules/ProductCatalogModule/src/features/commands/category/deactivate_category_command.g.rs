use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::category_repository::CategoryRepository;
use anyhow::Result;
use serde_json::Value;

pub struct DeactivateCategoryCommand {
    pub values: Vec<Value>,
}

pub struct DeactivateCategoryHandler;

impl Handler<DeactivateCategoryCommand> for DeactivateCategoryHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: DeactivateCategoryCommand) -> Result<Self::Output> {
        CategoryRepository::deactivate(pool, command.values).await
    }
}
