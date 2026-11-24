use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::brand_repository::BrandRepository;
use anyhow::Result;

pub struct DeleteItemBrandCommand {
    pub id: serde_json::Value,
}

pub struct DeleteItemBrandHandler;

impl Handler<DeleteItemBrandCommand> for DeleteItemBrandHandler {
    type Output = Vec<serde_json::Value>;

    async fn handle(pool: &DbPool, command: DeleteItemBrandCommand) -> Result<Self::Output> {
        BrandRepository::delete(pool, command.id).await
    }
}
