use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_category_repository::ProductCategoryRepository;
use anyhow::Result;

pub struct DeleteItemProductCategoryCommand {
    pub product_id: serde_json::Value,
    pub category_id: serde_json::Value,
}

pub struct DeleteItemProductCategoryHandler;

impl Handler<DeleteItemProductCategoryCommand> for DeleteItemProductCategoryHandler {
    type Output = Vec<serde_json::Value>;

    async fn handle(pool: &DbPool, command: DeleteItemProductCategoryCommand) -> Result<Self::Output> {
        ProductCategoryRepository::delete(pool, command.product_id, command.category_id).await
    }
}
