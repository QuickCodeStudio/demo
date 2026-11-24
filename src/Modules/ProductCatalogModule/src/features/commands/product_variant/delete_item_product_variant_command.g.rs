use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_repository::ProductVariantRepository;
use anyhow::Result;

pub struct DeleteItemProductVariantCommand {
    pub id: serde_json::Value,
}

pub struct DeleteItemProductVariantHandler;

impl Handler<DeleteItemProductVariantCommand> for DeleteItemProductVariantHandler {
    type Output = Vec<serde_json::Value>;

    async fn handle(pool: &DbPool, command: DeleteItemProductVariantCommand) -> Result<Self::Output> {
        ProductVariantRepository::delete(pool, command.id).await
    }
}
