use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;

pub struct DeleteItemProductCommand {
    pub id: serde_json::Value,
}

pub struct DeleteItemProductHandler;

impl Handler<DeleteItemProductCommand> for DeleteItemProductHandler {
    type Output = Vec<serde_json::Value>;

    async fn handle(pool: &DbPool, command: DeleteItemProductCommand) -> Result<Self::Output> {
        ProductRepository::delete(pool, command.id).await
    }
}
