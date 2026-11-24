use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_category_repository::ProductCategoryRepository;
use anyhow::Result;
use serde_json::Value;

pub struct RemoveFromCategoryProductCategoryCommand {
    pub values: Vec<Value>,
}

pub struct RemoveFromCategoryProductCategoryHandler;

impl Handler<RemoveFromCategoryProductCategoryCommand> for RemoveFromCategoryProductCategoryHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: RemoveFromCategoryProductCategoryCommand) -> Result<Self::Output> {
        ProductCategoryRepository::remove_from_category(pool, command.values).await
    }
}
