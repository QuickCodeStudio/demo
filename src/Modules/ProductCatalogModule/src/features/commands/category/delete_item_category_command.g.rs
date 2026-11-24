use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::category_repository::CategoryRepository;
use anyhow::Result;

pub struct DeleteItemCategoryCommand {
    pub id: serde_json::Value,
}

pub struct DeleteItemCategoryHandler;

impl Handler<DeleteItemCategoryCommand> for DeleteItemCategoryHandler {
    type Output = Vec<serde_json::Value>;

    async fn handle(pool: &DbPool, command: DeleteItemCategoryCommand) -> Result<Self::Output> {
        CategoryRepository::delete(pool, command.id).await
    }
}
